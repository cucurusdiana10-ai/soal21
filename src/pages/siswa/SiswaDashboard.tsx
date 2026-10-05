import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Search,
  Send,
  Loader2,
  X,
  Lock,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Volume2,
  VolumeX,
  Maximize2,
  AlertTriangle,
  Cloud,
  WifiOff,
  RefreshCw,
  PlayCircle
} from 'lucide-react';
import SiswaMateri from './SiswaMateri';
import SiswaNilai from './SiswaNilai';
import { verifyTaskToken, getTokenTimeRemaining, antiCheatAlarm } from '../../lib/examToken';
import {
  ViolationLogItem,
  getOrCreateDeviceSessionToken,
  saveLocalExamProgress,
  getLocalExamProgress,
  clearLocalExamProgress,
  normalizeAndMergeAnswers,
  countAnsweredQuestions,
  syncExamProgressToSupabase,
  calculateExamResult
} from '../../lib/examMonitoring';

function SiswaTugas() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Token verification & session resume modal state
  const [pendingTokenTask, setPendingTokenTask] = useState<any | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [sessionLockedError, setSessionLockedError] = useState<string | null>(null);
  const [checkingSessionStatus, setCheckingSessionStatus] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [testingAlarm, setTestingAlarm] = useState(false);

  // Active exam & Anti-cheat state
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [violationCount, setViolationCount] = useState<number>(0);
  const [violationLogs, setViolationLogs] = useState<ViolationLogItem[]>([]);
  const [alarmActive, setAlarmActive] = useState<boolean>(false);
  const [latestViolationReason, setLatestViolationReason] = useState<string>('');
  const [copyWarning, setCopyWarning] = useState<string | null>(null);

  // Auto-save & network status indicators
  const [syncState, setSyncState] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const lastViolationTimestampRef = useRef<number>(0);
  const hadFullscreenRef = useRef<boolean>(false);
  const answersRef = useRef<Record<number, string>>({});
  const violationCountRef = useRef<number>(0);
  const violationLogsRef = useRef<ViolationLogItem[]>([]);
  const saveTimeoutRef = useRef<number | null>(null);
  const deviceToken = getOrCreateDeviceSessionToken();

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    violationCountRef.current = violationCount;
  }, [violationCount]);

  useEffect(() => {
    violationLogsRef.current = violationLogs;
  }, [violationLogs]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchStudentTasks();
  }, [user]);

  // Clean up alarm on unmount
  useEffect(() => {
    return () => {
      antiCheatAlarm.stopAlarm();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Online / Offline network listeners to auto-sync answers when network recovers
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (activeTask && user) {
        setSyncState('saving');
        syncExamProgressToSupabase({
          taskId: activeTask.id,
          studentId: user.id,
          answers: answersRef.current,
          violationCount: violationCountRef.current,
          violationLogs: violationLogsRef.current,
          sessionToken: deviceToken
        }).then(({ error }) => {
          setSyncState(error ? 'offline' : 'saved');
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeTask, user, deviceToken]);

  const triggerViolation = useCallback(
    (reason: string) => {
      const now = Date.now();
      // Debounce rapid simultaneous blur + visibilitychange within 1.2s
      if (now - lastViolationTimestampRef.current < 1200) return;
      lastViolationTimestampRef.current = now;

      const timeStr = new Date(now).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const nextCount = violationCountRef.current + 1;
      const nextLogs = [{ time: timeStr, reason }, ...violationLogsRef.current];

      setViolationCount(nextCount);
      setViolationLogs(nextLogs);
      setLatestViolationReason(reason);
      setAlarmActive(true);

      // Sound loud Web Audio API alarm + voice synthesis warning "Anda Keluar Aplikasi Ujian"
      antiCheatAlarm.startAlarm();

      // Immediately persist violation to Supabase so Teacher sees it in Monitoring Ujian
      if (activeTask && user) {
        syncExamProgressToSupabase({
          taskId: activeTask.id,
          studentId: user.id,
          answers: answersRef.current,
          violationCount: nextCount,
          violationLogs: nextLogs,
          sessionToken: deviceToken
        }).catch(() => {});
      }

      // Send browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('🚨 Anda Keluar Aplikasi Ujian!', {
            body: `${reason}. Segera tutup aplikasi lain / floating app dan kembali ke ujian!`,
            requireInteraction: true
          });
        } catch {
          // Ignore notification errors in restricted contexts
        }
      }
    },
    [activeTask, user, deviceToken]
  );

  // Heartbeat & Realtime listener while activeTask is open (detects if Teacher finishes exam remotely)
  useEffect(() => {
    if (!activeTask || !user || !supabase) return;

    const handleRemoteSubmissionCheck = async () => {
      const { data: latestSub } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('task_id', activeTask.id)
        .eq('student_id', user.id)
        .maybeSingle();

      if (
        latestSub &&
        (latestSub.status === 'graded' || latestSub.status === 'submitted' || latestSub.status === 'completed')
      ) {
        // Teacher finished the exam from ExamMonitoring!
        antiCheatAlarm.stopAlarm();
        setAlarmActive(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        setActiveTask(null);
        await fetchStudentTasks();
        alert(
          '✅ Ujian Anda telah diselesaikan oleh Guru Pengawas melalui Monitoring Ujian.\nSeluruh jawaban yang sudah Anda kerjakan telah berhasil disimpan dan dinilai!'
        );
        return;
      }

      // Send heartbeat with latest answers so Teacher sees student is Online
      const { error } = await syncExamProgressToSupabase({
        taskId: activeTask.id,
        studentId: user.id,
        answers: answersRef.current,
        violationCount: violationCountRef.current,
        violationLogs: violationLogsRef.current,
        sessionToken: deviceToken
      });
      setSyncState(error ? 'offline' : 'saved');
    };

    const heartbeatTimer = window.setInterval(handleRemoteSubmissionCheck, 10000);

    const channel = supabase
      .channel(`student_exam_${activeTask.id}_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_submissions',
          filter: `task_id=eq.${activeTask.id}`
        },
        (payload: any) => {
          const newRow = payload.new as any;
          if (newRow && newRow.student_id === user.id) {
            if (newRow.status === 'graded' || newRow.status === 'submitted' || newRow.status === 'completed') {
              handleRemoteSubmissionCheck();
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(heartbeatTimer);
      supabase.removeChannel(channel);
    };
  }, [activeTask, user, deviceToken]);

  // Anti-open-other-app, new tab & mobile floating app listeners while activeTask is open
  useEffect(() => {
    if (!activeTask) {
      antiCheatAlarm.stopAlarm();
      setAlarmActive(false);
      hadFullscreenRef.current = false;
      return;
    }

    const initialScreenWidth = window.screen?.availWidth || window.innerWidth;
    const initialInnerWidth = window.innerWidth;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('Anda Keluar Aplikasi Ujian: Terdeteksi membuka tab baru atau berpindah aplikasi');
      }
    };

    const handleWindowBlur = () => {
      triggerViolation('Anda Keluar Aplikasi Ujian: Terdeteksi membuka floating aplikasi atau keluar dari jendela ujian');
    };

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        hadFullscreenRef.current = true;
      } else if (hadFullscreenRef.current) {
        triggerViolation('Anda Keluar Aplikasi Ujian: Terdeteksi keluar dari mode layar penuh (Fullscreen)');
      }
    };

    const handleResizeOrViewport = () => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isTyping = activeTag === 'input' || activeTag === 'textarea';
      if (
        window.innerWidth < initialInnerWidth * 0.82 ||
        (initialScreenWidth > 0 && window.innerWidth < initialScreenWidth * 0.72)
      ) {
        if (!isTyping) {
          triggerViolation('Anda Keluar Aplikasi Ujian: Terdeteksi menggunakan fitur Split-Screen / Floating Aplikasi pada HP');
        }
      }
    };

    const focusPollTimer = window.setInterval(() => {
      if (document.hidden) {
        triggerViolation('Anda Keluar Aplikasi Ujian: Terdeteksi membuka tab baru atau aplikasi lain');
      } else if (!document.hasFocus()) {
        triggerViolation('Anda Keluar Aplikasi Ujian: Terdeteksi menggunakan fitur Floating Aplikasi pada handphone / layar');
      }
    }, 600);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'p', 'u', 't', 'n'].includes(e.key.toLowerCase())) ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        setCopyWarning('Fitur buka tab baru, salin/tempel & pintasan sistem dinonaktifkan selama ujian.');
        setTimeout(() => setCopyWarning(null), 3000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResizeOrViewport);
    window.visualViewport?.addEventListener('resize', handleResizeOrViewport);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(focusPollTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResizeOrViewport);
      window.visualViewport?.removeEventListener('resize', handleResizeOrViewport);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTask, triggerViolation]);

  async function fetchStudentTasks() {
    if (!user || !supabase) return;

    const { data: classStud } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', user.id)
      .single();

    if (classStud?.class_id) {
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*')
        .eq('class_id', classStud.class_id)
        .order('created_at', { ascending: false });

      if (taskData) setTasks(taskData);

      const { data: subData } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('student_id', user.id);

      const subMap: Record<string, any> = {};
      if (subData) {
        subData.forEach(s => {
          subMap[s.task_id] = s;
        });
      }
      setSubmissions(subMap);
    }

    setLoading(false);
  }

  const getTaskPublishTime = (task: any): string | null => {
    if (Array.isArray(task.content) && task.content.length > 0 && task.content[0]?.published_at) {
      return task.content[0].published_at;
    }
    return task.created_at || null;
  };

  const isTaskLocked = (task: any): boolean => {
    const pubTime = getTaskPublishTime(task);
    if (!pubTime) return false;
    return new Date(pubTime).getTime() > Date.now();
  };

  const openTaskModal = async (task: any) => {
    if (isTaskLocked(task)) {
      const pubTime = getTaskPublishTime(task);
      const formatted = pubTime ? new Date(pubTime).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : '';
      alert(`Mohon maaf, tugas ini belum dapat dibuka karena baru dijadwalkan terbit pada: ${formatted} WIB.`);
      return;
    }

    setPendingTokenTask(task);
    setTokenInput('');
    setTokenError(null);
    setSessionLockedError(null);
    setTestingAlarm(false);
    antiCheatAlarm.stopAlarm();
  };

  const handleToggleTestAlarm = () => {
    if (testingAlarm) {
      antiCheatAlarm.stopAlarm();
      setTestingAlarm(false);
    } else {
      antiCheatAlarm.startAlarm();
      setTestingAlarm(true);
      setTimeout(() => {
        antiCheatAlarm.stopAlarm();
        setTestingAlarm(false);
      }, 3000);
    }
  };

  // Start or resume exam (preserving any existing answers!)
  const startOrResumeExamSession = async (taskToStart: any, bypassTokenCheck: boolean = false) => {
    if (!user || !supabase) return;

    antiCheatAlarm.stopAlarm();
    setTestingAlarm(false);

    if (!bypassTokenCheck) {
      const isValid = verifyTaskToken(taskToStart.id, tokenInput, Date.now());
      if (!isValid) {
        setTokenError(
          'Token tidak valid atau sudah kedaluwarsa! Ingat bahwa token berubah otomatis setiap 30 menit. Silakan minta token terbaru kepada Guru Anda.'
        );
        return;
      }
    }

    setCheckingSessionStatus(true);
    try {
      // Fetch freshest submission from Supabase to check session lock & restore answers
      const { data: latestSub } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('task_id', taskToStart.id)
        .eq('student_id', user.id)
        .maybeSingle();

      // Check if session is locked on a different device and hasn't been Reset Login by Guru
      if (
        latestSub &&
        latestSub.status === 'in_progress' &&
        latestSub.session_token &&
        latestSub.session_token !== deviceToken
      ) {
        // Mark as locked so Teacher sees it highlighted on Monitoring Ujian
        await supabase
          .from('task_submissions')
          .update({ is_locked: true })
          .eq('id', latestSub.id);

        const savedCount = countAnsweredQuestions(latestSub.answers);
        setSessionLockedError(
          `Sesi ujian Anda terdeteksi terkunci pada perangkat/jaringan sebelumnya (${savedCount} jawaban Anda sudah tersimpan aman). Silakan minta Guru menekan tombol "Reset Login" pada menu Monitoring Ujian agar Anda dapat melanjutkan pengerjaan.`
        );
        return;
      }

      // Restore answers from Supabase + localStorage backup so 0 answers are lost!
      const localBackup = getLocalExamProgress(user.id, taskToStart.id);
      const restoredAnswers = normalizeAndMergeAnswers(latestSub?.answers, localBackup?.answers);
      const restoredViolations = Math.max(
        Number(latestSub?.violation_count || 0),
        Number(localBackup?.violationCount || 0)
      );
      const restoredLogs =
        Array.isArray(latestSub?.violation_logs) && latestSub.violation_logs.length > 0
          ? latestSub.violation_logs
          : localBackup?.violationLogs || [];

      // Sync active session and merged answers immediately to Supabase
      const { data: syncedRow, error: syncErr } = await syncExamProgressToSupabase({
        taskId: taskToStart.id,
        studentId: user.id,
        answers: restoredAnswers,
        violationCount: restoredViolations,
        violationLogs: restoredLogs,
        sessionToken: deviceToken,
        isLocked: false
      });

      setSyncState(syncErr ? 'offline' : 'saved');
      if (syncedRow) {
        setSubmissions(prev => ({ ...prev, [taskToStart.id]: syncedRow }));
      }

      // Unlock mobile audio & voice synthesis on direct user gesture
      antiCheatAlarm.warmUpAudioAndVoice();

      if ('Notification' in window && Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {
          // Ignore
        }
      }

      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          hadFullscreenRef.current = true;
        }
      } catch {
        // Ignore fullscreen restriction
      }

      setPendingTokenTask(null);
      setTokenInput('');
      setTokenError(null);
      setSessionLockedError(null);
      setAnswers(restoredAnswers);
      setViolationCount(restoredViolations);
      setViolationLogs(restoredLogs);
      setAlarmActive(false);
      lastViolationTimestampRef.current = Date.now();
      setActiveTask(taskToStart);
    } finally {
      setCheckingSessionStatus(false);
    }
  };

  const handleVerifyTokenAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTokenTask) return;
    await startOrResumeExamSession(pendingTokenTask, false);
  };

  const handleCheckResetLoginAndResume = async () => {
    if (!pendingTokenTask || !user || !supabase) return;
    setCheckingSessionStatus(true);
    try {
      const { data: latestSub } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('task_id', pendingTokenTask.id)
        .eq('student_id', user.id)
        .maybeSingle();

      if (latestSub) {
        setSubmissions(prev => ({ ...prev, [pendingTokenTask.id]: latestSub }));
      }

      // If teacher already performed Reset Login (session_token is null and is_locked is false)
      // or if student is on the same device token, let them resume immediately without losing answers!
      if (
        latestSub &&
        latestSub.status === 'in_progress' &&
        (!latestSub.session_token || latestSub.session_token === deviceToken) &&
        !latestSub.is_locked
      ) {
        setSessionLockedError(null);
        await startOrResumeExamSession(pendingTokenTask, true);
      } else {
        setSessionLockedError(
          'Sesi masih terkunci. Mohon tunggu Guru menekan tombol "Reset Login" pada halaman Monitoring Ujian, lalu klik tombol ini lagi.'
        );
      }
    } finally {
      setCheckingSessionStatus(false);
    }
  };

  const handleDismissAlarmAndResume = async () => {
    antiCheatAlarm.stopAlarm();
    setAlarmActive(false);
    lastViolationTimestampRef.current = Date.now();

    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        hadFullscreenRef.current = true;
      }
    } catch {
      // Ignore fullscreen restriction
    }
  };

  const handleCloseExam = async () => {
    const answeredCount = countAnsweredQuestions(answers);
    if (
      !confirm(
        `Keluar sementara dari halaman pengerjaan ujian?\n\n` +
          `✅ Tenang, ${answeredCount} jawaban yang sudah Anda kerjakan telah TERSIMPAN OTOMATIS dan tidak akan hilang saat Anda masuk kembali.`
      )
    ) {
      return;
    }

    if (activeTask && user) {
      await syncExamProgressToSupabase({
        taskId: activeTask.id,
        studentId: user.id,
        answers,
        violationCount,
        violationLogs,
        sessionToken: deviceToken
      });
    }

    antiCheatAlarm.stopAlarm();
    setAlarmActive(false);
    setActiveTask(null);
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    fetchStudentTasks();
  };

  const handleAnswerChange = (questionIndex: number, value: string) => {
    const nextAnswers = { ...answers, [questionIndex]: value };
    setAnswers(nextAnswers);

    if (!activeTask || !user) return;

    // 1. Save immediately to localStorage (instant offline protection)
    saveLocalExamProgress(user.id, activeTask.id, nextAnswers, violationCount, violationLogs);

    // 2. Debounced auto-save to Supabase task_submissions (status = 'in_progress')
    setSyncState('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      const { error } = await syncExamProgressToSupabase({
        taskId: activeTask.id,
        studentId: user.id,
        answers: nextAnswers,
        violationCount: violationCountRef.current,
        violationLogs: violationLogsRef.current,
        sessionToken: deviceToken
      });
      setSyncState(error ? 'offline' : 'saved');
    }, 350);
  };

  const handleSubmitTask = async () => {
    if (!activeTask || !user || !supabase) return;

    const questions = Array.isArray(activeTask.content) ? activeTask.content : [];
    const answeredCount = countAnsweredQuestions(answers);

    if (questions.length > 0 && answeredCount < questions.length) {
      if (!confirm(`Masih ada ${questions.length - answeredCount} soal yang belum dijawab. Yakin ingin mengumpulkan tugas sekarang?`)) {
        return;
      }
    }

    setSubmitting(true);
    antiCheatAlarm.stopAlarm();
    setAlarmActive(false);

    try {
      const result = calculateExamResult(questions, answers, violationCount, false);
      const nowIso = new Date().toISOString();

      // Check if an in_progress submission row already exists for this task & student
      const { data: existing } = await supabase
        .from('task_submissions')
        .select('id')
        .eq('task_id', activeTask.id)
        .eq('student_id', user.id)
        .maybeSingle();

      const fullPayload: Record<string, any> = {
        task_id: activeTask.id,
        student_id: user.id,
        answers: answers,
        score: result.finalScore,
        status: result.finalStatus,
        feedback: result.feedback,
        is_locked: false,
        session_token: null,
        violation_count: violationCount,
        violation_logs: violationLogs,
        last_active_at: nowIso,
        updated_at: nowIso
      };

      if (existing?.id) {
        const { error } = await supabase
          .from('task_submissions')
          .update(fullPayload)
          .eq('id', existing.id);

        if (error) {
          // Fallback update with base columns
          const { error: fbErr } = await supabase
            .from('task_submissions')
            .update({
              answers: answers,
              score: result.finalScore,
              status: result.finalStatus,
              feedback: result.feedback
            })
            .eq('id', existing.id);
          if (fbErr) throw fbErr;
        }
      } else {
        const { error } = await supabase
          .from('task_submissions')
          .insert([fullPayload]);

        if (error) {
          const { error: fbErr } = await supabase
            .from('task_submissions')
            .insert([{
              task_id: activeTask.id,
              student_id: user.id,
              answers: answers,
              score: result.finalScore,
              status: result.finalStatus,
              feedback: result.feedback
            }]);
          if (fbErr) throw fbErr;
        }
      }

      clearLocalExamProgress(user.id, activeTask.id);

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      alert(
        result.hasEssay
          ? 'Tugas berhasil dikumpulkan! Jawaban esai Anda akan diperiksa oleh guru.'
          : `Tugas selesai! Nilai Pilihan Ganda Anda: ${result.calculatedPgScore}/100`
      );

      setActiveTask(null);
      fetchStudentTasks();
    } catch (err: any) {
      alert('Gagal mengumpulkan tugas: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter(
    t =>
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.subject_name?.toLowerCase().includes(search.toLowerCase())
  );

  const tokenTimer = getTokenTimeRemaining(nowMs);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Halo, {user?.name}!</h1>
        <p className="text-blue-100 text-lg">NISN: {user?.username} • SMAN 21 Garut</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daftar Tugas & Soal Kelas</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Siapkan <strong>Token Soal</strong> dari Guru Anda (token berganti setiap 30 menit). Jawaban Anda otomatis tersimpan saat dikerjakan.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari mata pelajaran / tugas..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Memuat tugas kelas...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-2xl border border-gray-200 text-gray-500">
          Belum ada tugas yang diterbitkan untuk kelas Anda.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredTasks.map(task => {
            const sub = submissions[task.id];
            const isCompleted = Boolean(
              sub && (sub.status === 'graded' || sub.status === 'submitted' || sub.status === 'completed')
            );
            const isInProgress = Boolean(sub && sub.status === 'in_progress');
            const localDraft = user ? getLocalExamProgress(user.id, task.id) : null;
            const mergedSavedAnswers = normalizeAndMergeAnswers(sub?.answers, localDraft?.answers);
            const savedAnswerCount = countAnsweredQuestions(mergedSavedAnswers);
            const totalQ = Array.isArray(task.content) ? task.content.length : 0;
            const hasResetLoginPrivilege = Boolean(
              isInProgress && (Number(sub?.login_reset_count || 0) > 0 || !sub?.session_token || sub?.session_token === deviceToken)
            );

            const pubTime = getTaskPublishTime(task);
            const isLocked = isTaskLocked(task);

            return (
              <div
                key={task.id}
                className={`bg-white p-6 rounded-2xl shadow-sm border transition-colors flex flex-col justify-between ${
                  isInProgress
                    ? 'border-indigo-400 ring-2 ring-indigo-500/10'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4 gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-3 rounded-xl ${
                          isCompleted
                            ? 'bg-green-50 text-green-600'
                            : isInProgress
                            ? 'bg-indigo-50 text-indigo-600'
                            : isLocked
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{task.title}</h3>
                        <p className="text-sm text-gray-500">{task.subject_name || 'Mata Pelajaran'}</p>
                      </div>
                    </div>

                    {isCompleted ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-md flex items-center shrink-0">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Selesai
                      </span>
                    ) : isInProgress ? (
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-md flex items-center gap-1 shrink-0">
                        <Cloud className="w-3.5 h-3.5 text-indigo-600" />
                         Tersimpan ({savedAnswerCount}/{totalQ})
                      </span>
                    ) : isLocked ? (
                      <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-md flex items-center border border-amber-300 shrink-0">
                        <Lock className="w-3 h-3 mr-1 text-amber-700" /> Terjadwal
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-800 text-xs font-bold rounded-md border border-indigo-200 flex items-center gap-1 shrink-0">
                        <KeyRound className="w-3 h-3 text-indigo-600" /> Wajib Token
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm mb-3 capitalize">
                    Jenis Soal: {task.type === 'pg' ? 'Pilihan Ganda' : task.type === 'essay' ? 'Esai' : 'Campuran'} · Jumlah: {totalQ} Soal
                  </p>

                  {isInProgress && (
                    <div className="mb-4 p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-1.5 text-xs text-indigo-950">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5 text-indigo-900">
                          <Cloud className="w-4 h-4 text-indigo-600" />
                          Progres Jawaban Tersimpan Aman
                        </span>
                        <span className="text-indigo-700">
                          {savedAnswerCount} / {totalQ} Soal
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-800 leading-relaxed">
                        {Number(sub?.login_reset_count || 0) > 0
                          ? `✅ Sesi login Anda telah direset oleh Guru. Seluruh ${savedAnswerCount} jawaban yang sudah Anda kerjakan tetap utuh dan siap dilanjutkan.`
                          : `Jawaban yang sudah Anda pilih tidak akan hilang meskipun sempat terkendala jaringan.`}
                      </p>
                    </div>
                  )}

                  {!isCompleted && !isLocked && !isInProgress && (
                    <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        Anti-Buka Aplikasi Lain & Auto-Save Jawaban
                      </span>
                      <span className="font-mono font-bold text-indigo-700">{tokenTimer.formatted}</span>
                    </div>
                  )}
                </div>

                {isCompleted ? (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                    <span className="text-xs text-gray-600 font-medium">Nilai Akhir:</span>
                    <span className="text-xl font-black text-green-600">
                      {sub.score !== null ? sub.score : 'Menunggu Koreksi Guru'}
                    </span>
                  </div>
                ) : isLocked ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Soal Belum Dibuka</p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Tugas ini dijadwalkan terbit pada: <strong>{new Date(pubTime!).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })} WIB</strong>.
                        </p>
                      </div>
                    </div>
                    <button
                      disabled
                      className="w-full py-2.5 bg-gray-100 text-gray-400 font-semibold rounded-xl cursor-not-allowed text-xs flex items-center justify-center gap-1.5 border border-gray-200"
                    >
                      <Lock className="w-3.5 h-3.5 text-gray-400" /> Menunggu Waktu Terbit
                    </button>
                  </div>
                ) : isInProgress ? (
                  <button
                    onClick={() => openTaskModal(task)}
                    className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <PlayCircle className="w-4 h-4" />
                    {hasResetLoginPrivilege
                      ? `Lanjutkan Ujian (${savedAnswerCount}/${totalQ} Soal Tersimpan)`
                      : `Masukkan Token & Lanjutkan (${savedAnswerCount}/${totalQ} Soal)`}
                  </button>
                ) : (
                  <button
                    onClick={() => openTaskModal(task)}
                    className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" /> Masukkan Token & Kerjakan Soal
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Token Verification & Resume Exam Modal */}
      {pendingTokenTask && (() => {
        const sub = submissions[pendingTokenTask.id];
        const isInProgress = Boolean(sub && sub.status === 'in_progress');
        const localDraft = user ? getLocalExamProgress(user.id, pendingTokenTask.id) : null;
        const savedCount = countAnsweredQuestions(normalizeAndMergeAnswers(sub?.answers, localDraft?.answers));
        const totalQ = Array.isArray(pendingTokenTask.content) ? pendingTokenTask.content.length : 0;
        const canResumeDirectly = Boolean(
          isInProgress &&
            !sub?.is_locked &&
            (!sub?.session_token || sub?.session_token === deviceToken || Number(sub?.login_reset_count || 0) > 0)
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200">
              <div className="p-6 bg-gradient-to-r from-indigo-900 to-blue-900 text-white flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    {isInProgress ? 'Lanjutkan Sesi Ujian' : 'Verifikasi Token Ujian'}
                  </span>
                  <h3 className="text-lg font-bold mt-1">{pendingTokenTask.title}</h3>
                  <p className="text-xs text-blue-200 mt-0.5">
                    {pendingTokenTask.subject_name} · {totalQ} Butir Soal
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    antiCheatAlarm.stopAlarm();
                    setTestingAlarm(false);
                    setPendingTokenTask(null);
                  }}
                  className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleVerifyTokenAndStart} className="p-6 space-y-5">
                {/* Saved Progress Notice if resuming */}
                {savedCount > 0 && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Jawaban Anda Tersimpan ({savedCount} dari {totalQ} Soal)
                    </div>
                    <p className="text-emerald-800/90 leading-relaxed">
                      Soal yang sudah Anda kerjakan sebelumnya <strong>tidak hilang</strong> dan akan langsung dimuat kembali saat Anda melanjutkan ujian.
                    </p>
                  </div>
                )}

                {/* Anti-cheat rules notice */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs text-red-900">
                  <div className="font-bold flex items-center gap-1.5 text-red-800">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    Peraturan Pengawas Ujian (Anti-Buka Aplikasi Lain)
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-red-800/90 leading-relaxed">
                    <li>Selama mengerjakan soal, Anda <strong>dilarang membuka tab baru atau menggunakan fitur Floating Aplikasi / Split-Screen</strong> pada handphone.</li>
                    <li>Jika terdeteksi, sistem otomatis mengeluarkan notifikasi suara <strong>"Anda Keluar Aplikasi Ujian"</strong> serta mencatat pelanggaran ke Guru.</li>
                  </ul>
                  <div className="pt-1 flex items-center justify-between border-t border-red-200/70">
                    <span className="text-[11px] text-red-700 font-medium">Pastikan suara perangkat aktif:</span>
                    <button
                      type="button"
                      onClick={handleToggleTestAlarm}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                        testingAlarm
                          ? 'bg-red-600 text-white'
                          : 'bg-white text-red-700 border border-red-300 hover:bg-red-100'
                      }`}
                    >
                      {testingAlarm ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      {testingAlarm ? 'Matikan Tes Alarm' : 'Tes Bunyi Alarm'}
                    </button>
                  </div>
                </div>

                {/* Direct resume button if student already verified on this device or Guru performed Reset Login */}
                {canResumeDirectly && !sessionLockedError && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2.5">
                    <p className="text-xs font-bold text-indigo-950">
                      Sesi Ujian Anda Aktif / Telah Direset Guru:
                    </p>
                    <button
                      type="button"
                      disabled={checkingSessionStatus}
                      onClick={() => startOrResumeExamSession(pendingTokenTask, true)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      {checkingSessionStatus ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlayCircle className="w-4 h-4" />
                      )}
                      Lanjutkan Ujian Sekarang ({savedCount}/{totalQ} Soal Tersimpan)
                    </button>
                  </div>
                )}

                {!canResumeDirectly && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                        Masukkan Token 6 Karakter dari Guru
                      </label>
                      <span className="text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Reset dlm {tokenTimer.formatted}
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={tokenInput}
                      onChange={e => {
                        setTokenInput(e.target.value.toUpperCase());
                        if (tokenError) setTokenError(null);
                      }}
                      placeholder="CONTOH: K7M4P9"
                      className="w-full p-3.5 text-center font-mono text-2xl font-black tracking-[0.3em] uppercase bg-gray-50 border-2 border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-indigo-950"
                      autoFocus
                    />
                    <p className="text-[11px] text-gray-500 mt-1.5 text-center">
                      Token berubah secara otomatis setiap 30 menit. Minta token aktif kepada Guru mata pelajaran Anda.
                    </p>
                  </div>
                )}

                {tokenError && (
                  <div className="p-3 bg-red-100 border border-red-300 text-red-900 rounded-xl text-xs font-semibold flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{tokenError}</span>
                  </div>
                )}

                {sessionLockedError && (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl text-xs space-y-2.5">
                    <div className="flex items-start gap-2 font-semibold">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span>{sessionLockedError}</span>
                    </div>
                    <button
                      type="button"
                      disabled={checkingSessionStatus}
                      onClick={handleCheckResetLoginAndResume}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                    >
                      {checkingSessionStatus ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Sudah Direset Guru? Klik untuk Lanjutkan Ujian
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      antiCheatAlarm.stopAlarm();
                      setTestingAlarm(false);
                      setPendingTokenTask(null);
                    }}
                    className="px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl text-sm transition"
                  >
                    Batal
                  </button>
                  {!canResumeDirectly && (
                    <button
                      type="submit"
                      disabled={checkingSessionStatus}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {checkingSessionStatus ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      Verifikasi & Mulai Ujian
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Task Answering Modal (Protected Exam Mode with Auto-Save) */}
      {activeTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-gray-950/90 backdrop-blur-md select-none"
          onContextMenu={e => {
            e.preventDefault();
            setCopyWarning('Klik kanan dinonaktifkan selama mengerjakan ujian.');
            setTimeout(() => setCopyWarning(null), 2500);
          }}
          onCopy={e => {
            e.preventDefault();
            setCopyWarning('Menyalin teks soal tidak diizinkan selama ujian.');
            setTimeout(() => setCopyWarning(null), 2500);
          }}
          onCut={e => e.preventDefault()}
          onPaste={e => {
            e.preventDefault();
            setCopyWarning('Menempelkan teks dari luar tidak diizinkan selama ujian.');
            setTimeout(() => setCopyWarning(null), 2500);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] relative border border-gray-200">
            {/* Top Security & Auto-Save Header Bar */}
            <div className="p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold rounded-md flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Pengawas Anti-Buka Aplikasi Lain Aktif
                  </span>

                  {/* Live Auto-Save Status Pill */}
                  {syncState === 'saving' ? (
                    <span className="px-2.5 py-0.5 bg-blue-500/20 border border-blue-400/40 text-blue-200 text-[11px] font-semibold rounded-md flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Menyimpan jawaban...
                    </span>
                  ) : syncState === 'offline' || !isOnline ? (
                    <span className="px-2.5 py-0.5 bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[11px] font-bold rounded-md flex items-center gap-1">
                      <WifiOff className="w-3 h-3" /> Kendala Jaringan (Jawaban Aman di Perangkat)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[11px] font-semibold rounded-md flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-emerald-300" /> Jawaban Tersimpan Otomatis
                    </span>
                  )}

                  {violationCount > 0 && (
                    <span className="px-2.5 py-0.5 bg-red-600 text-white text-[11px] font-extrabold rounded-md flex items-center gap-1 animate-pulse">
                      <ShieldAlert className="w-3.5 h-3.5" /> Pelanggaran Terdeteksi: {violationCount}x
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mt-1">{activeTask.title}</h3>
                <p className="text-xs text-indigo-200">
                  Mata Pelajaran: {activeTask.subject_name} · Soal yang sudah dijawab otomatis tersimpan ke server
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    }
                  }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
                  title="Aktifkan Layar Penuh"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Layar Penuh
                </button>
                <button
                  type="button"
                  onClick={handleCloseExam}
                  className="text-gray-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
                  title="Simpan & Keluar Sementara"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Copy/Shortcut Warning Banner */}
            {copyWarning && (
              <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{copyWarning}</span>
              </div>
            )}

            {/* Questions List */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {activeTask.content?.map((q: any, idx: number) => {
                const isAnswered = answers[idx] !== undefined && String(answers[idx]).trim() !== '';
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border space-y-3 transition ${
                      isAnswered ? 'bg-blue-50/20 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
                        Soal #{idx + 1} ({q.type === 'pg' ? 'Pilihan Ganda' : 'Esai'})
                      </span>
                      {isAnswered && (
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Tersimpan
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 text-base">{q.question}</p>

                    {q.type === 'pg' && q.options && (
                      <div className="space-y-2 pt-2">
                        {q.options.map((opt: string, oIdx: number) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const isSelected = answers[idx] === letter || answers[idx] === opt;
                          return (
                            <label
                              key={oIdx}
                              onClick={() => handleAnswerChange(idx, letter)}
                              className={`flex items-center p-3 rounded-xl border cursor-pointer text-sm transition ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-500 font-bold text-blue-900'
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${idx}`}
                                checked={isSelected}
                                onChange={() => handleAnswerChange(idx, letter)}
                                className="mr-3 text-blue-600"
                              />
                              <span className="font-bold mr-2">{letter}.</span> {opt}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'essay' && (
                      <div className="pt-2">
                        <textarea
                          rows={3}
                          value={answers[idx] || ''}
                          onChange={e => handleAnswerChange(idx, e.target.value)}
                          placeholder="Tuliskan jawaban esai Anda di sini..."
                          className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 select-text"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Violation Log History inside Exam if any */}
              {violationLogs.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Riwayat Peringatan Pengawas Ujian ({violationCount}x Pelanggaran)
                  </h4>
                  <div className="space-y-1 max-h-28 overflow-y-auto text-xs text-red-800">
                    {violationLogs.map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="font-mono font-bold">[{v.time}]</span>
                        <span>{v.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Submit Bar */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-3 bg-gray-50">
              <div className="text-xs text-gray-600 font-medium">
                Terjawab & Tersimpan: <strong>{countAnsweredQuestions(answers)}</strong> dari{' '}
                <strong>{activeTask.content?.length || 0}</strong> soal
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseExam}
                  className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-200 rounded-xl text-sm transition"
                >
                  Simpan & Keluar Sementara
                </button>
                <button
                  type="button"
                  onClick={handleSubmitTask}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-700 transition flex items-center disabled:opacity-50 shadow-md shadow-blue-200"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {submitting ? 'Mengumpulkan...' : 'Selesaikan & Kumpulkan Ujian'}
                </button>
              </div>
            </div>

            {/* Full-Screen Anti-Cheat Alarm & Notification Overlay when student opens another app */}
            {alarmActive && (
              <div className="absolute inset-0 z-50 bg-red-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white animate-fadeIn">
                <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center mb-4 animate-bounce shadow-lg shadow-red-600/50 border-4 border-red-300">
                  <ShieldAlert className="w-11 h-11 text-white" />
                </div>

                <span className="px-3 py-1 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-md border border-red-400 mb-2">
                  🔊 NOTIFIKASI SUARA: "ANDA KELUAR APLIKASI UJIAN"
                </span>

                <h2 className="text-2xl sm:text-3xl font-black text-white max-w-xl">
                  ANDA KELUAR APLIKASI UJIAN!
                </h2>

                <p className="text-red-200 text-sm sm:text-base max-w-lg mt-2 leading-relaxed">
                  {latestViolationReason || 'Sistem mendeteksi Anda membuka tab baru atau menggunakan fitur floating aplikasi pada handphone.'}
                </p>

                <div className="my-5 p-4 bg-red-900/80 border border-red-500/60 rounded-2xl max-w-md w-full text-left space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                    <span>Total Pelanggaran Tercatat:</span>
                    <span className="text-base font-black text-white bg-red-600 px-2.5 py-0.5 rounded-md">
                      {violationCount} Kali
                    </span>
                  </div>
                  <p className="text-xs text-red-100 leading-relaxed">
                    Setiap aktivitas membuka aplikasi lain dicatat secara otomatis dan tampil langsung di layar Monitoring Ujian Guru.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDismissAlarmAndResume}
                  className="px-8 py-3.5 bg-white text-red-900 hover:bg-red-50 font-black rounded-xl text-sm shadow-xl transition flex items-center gap-2"
                >
                  <VolumeX className="w-5 h-5 text-red-700" />
                  Matikan Alarm & Kembali Kerjakan Soal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SiswaDashboard() {
  const location = useLocation();

  if (location.pathname.startsWith('/dashboard/materi')) {
    return <SiswaMateri />;
  }
  if (location.pathname.startsWith('/dashboard/nilai')) {
    return <SiswaNilai />;
  }

  return <SiswaTugas />;
}
