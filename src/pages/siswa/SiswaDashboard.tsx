import React, { useState, useEffect, useRef, useCallback, useMemo, Component, ErrorInfo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  PlayCircle,
  Grid,
  ChevronLeft,
  ChevronRight,
  Check,
  ListChecks,
  Hourglass,
  Layers,
  AlertCircle,
  ArrowUpDown
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

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ExamErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ExamErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950 text-white select-none">
          <div className="bg-white text-gray-900 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-gray-200">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Tampilan Dioptimalkan Kembali</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Perangkat Anda sempat mengalami kendala rendering layout. Tenang, seluruh jawaban yang sudah Anda pilih <strong>tersimpan aman</strong> di sistem.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                if (this.props.onReset) this.props.onReset();
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-md"
            >
              Muat Ulang Tampilan Pengerjaan
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Robust mobile & touch detection for entry-level Android devices (Vivo Y04, Oppo A57, Infinix Smart 6, etc.)
// Prevents hardware GPU compositor crash and layout blanking when entering/toggling fullscreen.
const checkIsMobileOrTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    /android|iphone|ipad|ipod|mobile|phone/i.test(navigator.userAgent || '') ||
    Boolean(window.matchMedia && window.matchMedia('(max-width: 1024px)').matches) ||
    Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    ('ontouchstart' in window) ||
    Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
  );
};

function SiswaTugas() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'status'>('newest');

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
  const [examStartedAt, setExamStartedAt] = useState<string>('');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'focus' | 'all'>('focus'); // 'focus' (Mode Fokus Per Soal - sangat ringan di HP) | 'all' (Tampilkan Semua)
  const [showNumberGridModal, setShowNumberGridModal] = useState<boolean>(false);
  const [unansweredModalOpen, setUnansweredModalOpen] = useState<boolean>(false);
  const [unansweredList, setUnansweredList] = useState<number[]>([]);
  const [minDurationModalOpen, setMinDurationModalOpen] = useState<boolean>(false);
  const [confirmSubmitModalOpen, setConfirmSubmitModalOpen] = useState<boolean>(false);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [violationCount, setViolationCount] = useState<number>(0);
  const [violationLogs, setViolationLogs] = useState<ViolationLogItem[]>([]);
  const [alarmActive, setAlarmActive] = useState<boolean>(false);
  const [isExamStopped, setIsExamStopped] = useState<boolean>(false);
  const [stopPenaltySeconds, setStopPenaltySeconds] = useState<number>(0);
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
  const isInternalActionRef = useRef<boolean>(false);
  const lastInternalActionTimeRef = useRef<number>(0);
  const initialLaunchGracePeriodRef = useRef<number>(0);
  const wasHiddenRef = useRef<boolean>(false);
  const wasBlurredRef = useRef<boolean>(false);
  const blurredTimeRef = useRef<number>(0);
  const deviceToken = getOrCreateDeviceSessionToken();

  const markInternalAction = (graceMs: number = 3000) => {
    isInternalActionRef.current = true;
    lastInternalActionTimeRef.current = Date.now() + Math.max(0, graceMs - 2500);
  };

  const safeToggleFullscreen = () => {
    markInternalAction(6000);
    try {
      const doc = document as any;
      const el = (document.getElementById('exam-viewport-root') || document.documentElement) as any;
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen().catch(() => {});
      } else {
        const isMobileOrTouch = checkIsMobileOrTouchDevice();
        if (isMobileOrTouch) {
          // On low-spec Androids (Vivo Y04, Oppo A57, Infinix Smart 6), the CSS fixed container
          // already spans 100vw x 100dvh seamlessly. Safely request without crashing compositor surface.
          window.scrollTo(0, 0);
          if (el && el.requestFullscreen) {
            el.requestFullscreen().catch(() => {});
          }
        } else {
          if (el && el.requestFullscreen) el.requestFullscreen().catch(() => {});
          else if (el && el.webkitRequestFullscreen) el.webkitRequestFullscreen().catch(() => {});
        }
      }
    } catch {
      // Ignore
    }
  };

  const safeExitFullscreen = () => {
    try {
      const doc = document as any;
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen().catch(() => {});
      }
    } catch {
      // Ignore
    }
  };

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

  // Stop Pengerjaan mandatory freeze penalty countdown timer
  useEffect(() => {
    if (!isExamStopped || stopPenaltySeconds <= 0) return;
    const penaltyTimer = window.setInterval(() => {
      setStopPenaltySeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(penaltyTimer);
  }, [isExamStopped, stopPenaltySeconds]);

  useEffect(() => {
    fetchStudentTasks();
  }, [user]);

  // Scroll to top on exam entry
  useEffect(() => {
    if (!activeTask) return;
    window.scrollTo(0, 0);
  }, [activeTask]);

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
    async (reason: string) => {
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
      // Cap violation logs array to 30 most recent entries to avoid database bloating
      const nextLogs = [{ time: timeStr, reason }, ...violationLogsRef.current].slice(0, 30);

      setViolationCount(nextCount);
      setViolationLogs(nextLogs);
      setLatestViolationReason(reason);

      // SENSITIFITAS TOLERANSI PELANGGARAN: 3 KALI
      // Pelanggaran 1 & 2: Peringatan keras, alarm suara, dan STOP PENGERJAAN (pembekuan layar sementara)
      // Pelanggaran 3: Sesi ujian terkunci total, LANGSUNG LOGOUT ke halaman login (tidak ada matikan notifikasi / lanjutkan)
      if (nextCount >= 3) {
        antiCheatAlarm.stopAlarm();
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try { window.speechSynthesis.cancel(); } catch {}
        }
        setAlarmActive(false);
        setIsExamStopped(false);
        setStopPenaltySeconds(0);
        safeExitFullscreen();

        // Simpan jawaban terakhir & tandai akun ujian terkunci di Supabase
        if (activeTask && user && supabase) {
          try {
            await syncExamProgressToSupabase({
              taskId: activeTask.id,
              studentId: user.id,
              answers: answersRef.current,
              violationCount: nextCount,
              violationLogs: nextLogs,
              sessionToken: null,
              isLocked: true
            });

            await supabase
              .from('task_submissions')
              .update({
                is_locked: true,
                session_token: null,
                violation_count: nextCount,
                violation_logs: nextLogs,
                feedback: `Ujian terkunci karena telah mencapai 3 kali pelanggaran (membuka tab baru / keluar aplikasi). Memerlukan Reset Login oleh Guru Pengawas.`
              })
              .eq('task_id', activeTask.id)
              .eq('student_id', user.id);

            await supabase
              .from('users')
              .update({
                is_exam_locked: true,
                exam_locked_reason: `Ujian terkunci otomatis karena 3x pelanggaran (membuka tab baru / keluar aplikasi)`,
                exam_locked_at: new Date().toISOString(),
                active_session_token: null
              })
              .eq('id', user.id);
          } catch (err) {
            console.error('Error locking student exam session in DB:', err);
          }
        }

        setActiveTask(null);

        // Simpan pesan peringatan di sessionStorage agar ditampilkan jelas di halaman login
        try {
          sessionStorage.setItem(
            'exam_locked_alert',
            'Akun ujian Anda telah otomatis terkunci dan dikeluarkan karena terdeteksi 3 kali pelanggaran (membuka tab baru / keluar aplikasi). Seluruh jawaban Anda tersimpan aman di sistem. Untuk melanjutkan ujian, silakan minta RESET LOGIN kepada Guru Pengawas Anda di menu Monitoring Ujian.'
          );
        } catch {}

        // Langsung logout dan arahkan ke halaman login siswa
        try {
          await logout();
        } catch {}

        window.location.replace('/login?role=siswa&locked=1');
        return;
      }

      // Jika masih dalam batas toleransi (< 3 kali): AKTIFKAN FITUR STOP PENGERJAAN
      setAlarmActive(true);
      setIsExamStopped(true);
      setStopPenaltySeconds(20); // 20 detik pembekuan layar wajib

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
    [activeTask, user, deviceToken, logout]
  );

  // Heartbeat & Realtime listener while activeTask is open (detects if Teacher finishes exam remotely)
  useEffect(() => {
    if (!activeTask || !user || !supabase) return;

    const handleRemoteSubmissionCheck = async () => {
      // Lightweight check: only select status & is_locked to minimize egress and WAL log generation
      const { data: latestSub } = await supabase
        .from('task_submissions')
        .select('id, status, is_locked')
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
    };

    // Low-frequency heartbeat safety check (every 60s)
    const heartbeatTimer = window.setInterval(handleRemoteSubmissionCheck, 60000);

    // CRITICAL OPTIMIZATION: Filter realtime strictly to THIS student_id!
    // Prevents receiving broadcasts for other students' answer updates, eliminating 97%+ of websocket egress & log ingestion!
    const channel = supabase
      .channel(`student_exam_sub_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'task_submissions',
          filter: `student_id=eq.${user.id}`
        },
        (payload: any) => {
          const newRow = payload.new as any;
          if (newRow && newRow.task_id === activeTask.id) {
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

  // Anti-open-other-app, new tab, 3 navigation buttons & mobile floating app listeners while activeTask is open
  useEffect(() => {
    if (!activeTask) {
      antiCheatAlarm.stopAlarm();
      setAlarmActive(false);
      hadFullscreenRef.current = false;
      return;
    }

    // 1. Deteksi Tombol Kembali (1 dari 3 tombol di HP) via History PopState Trap
    try {
      window.history.pushState({ sman21ExamLock: true }, '', window.location.href);
    } catch {}

    const handlePopState = () => {
      try {
        window.history.pushState({ sman21ExamLock: true }, '', window.location.href);
      } catch {}
      triggerViolation('Anda Keluar Aplikasi Ujian: Terdeteksi menekan tombol kembali (navigasi HP)');
    };

    // 2. Deteksi Buka Tab Baru di Browser, Tombol Home, Recent Apps & Beralih Aplikasi
    // Ini dieksekusi SECARA PASTI saat siswa membuka tab baru, beralih tab, atau meminimalkan browser
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        triggerViolation('Anda Keluar Aplikasi Ujian: Terdeteksi membuka tab baru atau berpindah aplikasi');
      }
    };

    const handlePageHide = () => {
      triggerViolation('Anda Keluar Aplikasi Ujian: Terdeteksi meninggalkan atau menutup halaman ujian');
    };

    // 3. Deteksi Floating App (Aplikasi Mengambang / Kalkulator Pop-up / WhatsApp Mengambang / Split-Screen)
    const handleWindowBlur = () => {
      // Abaikan jika siswa sedang berinteraksi dengan modal internal aplikasi ujian (daftar nomor / konfirmasi kumpul)
      if (showNumberGridModal || unansweredModalOpen || minDurationModalOpen || confirmSubmitModalOpen) {
        return;
      }
      setTimeout(() => {
        // Jika fokus keluar dari dokumen web (misal mengetuk floating window, recent apps, atau split-screen):
        if (!document.hasFocus()) {
          triggerViolation('Anda Keluar Aplikasi Ujian: Terdeteksi berpindah aplikasi atau menggunakan floating app');
        }
      }, 350);
    };

    // Fullscreen is optional; exiting or changing fullscreen does NOT trigger any violation.
    const handleFullscreenChange = () => {
      markInternalAction(6000);
      if (document.fullscreenElement) {
        hadFullscreenRef.current = true;
      }
    };

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

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Ujian sedang berlangsung! Keluar dari aplikasi akan dicatat sebagai pelanggaran.';
      return e.returnValue;
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [
    activeTask,
    triggerViolation,
    showNumberGridModal,
    unansweredModalOpen,
    minDurationModalOpen,
    confirmSubmitModalOpen,
    testingAlarm,
    alarmActive,
    copyWarning
  ]);

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

      if (taskData) {
        // Hanya tampilkan soal yang aktif (bukan dinonaktifkan guru)
        const activeTasks = taskData.filter((t: any) => t.is_active !== false);
        setTasks(activeTasks);
      }

      const { data: subData } = await supabase
        .from('task_submissions')
        .select('id, task_id, status, score, is_locked, violation_count, started_at, created_at, updated_at')
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

    const sub = submissions[task.id];
    const isViolationLocked = Boolean(
      sub?.is_locked ||
      Number(sub?.violation_count || 0) >= 3 ||
      user?.is_exam_locked
    );

    setPendingTokenTask(task);
    setTokenInput('');
    setTokenError(null);
    setSessionLockedError(
      isViolationLocked
        ? 'Ujian ini terkunci karena telah mencapai batas 3 kali pelanggaran. Seluruh jawaban Anda tersimpan aman. Untuk melanjutkan ujian, silakan minta Guru Pengawas Anda melakukan Reset Login pada menu Monitoring Ujian.'
        : null
    );
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
      // If student hasn't answered any questions yet (savedCount === 0), NEVER block them!
      // This prevents the infinite reset loop when a student opens the exam for the first time.
      const savedCount = countAnsweredQuestions(latestSub?.answers);
      const isAlreadyViolationLocked = Boolean(
        latestSub?.is_locked ||
        Number(latestSub?.violation_count || 0) >= 3 ||
        user?.is_exam_locked
      );

      // Jika ujian terkunci karena 3x pelanggaran, blokir total dan wajib minta Reset Login ke Guru
      if (latestSub && isAlreadyViolationLocked) {
        setSessionLockedError(
          `Sesi ujian Anda terkunci karena telah mencapai 3 kali pelanggaran (${savedCount} jawaban Anda sudah tersimpan aman). Untuk melanjutkan pengerjaan, silakan minta Guru Pengawas Anda melakukan "Reset Login" pada menu Monitoring Ujian.`
        );
        return;
      }

      // Check if session is locked on a different device and hasn't been Reset Login by Guru
      if (
        latestSub &&
        latestSub.status === 'in_progress' &&
        latestSub.session_token &&
        latestSub.session_token !== deviceToken &&
        savedCount > 0
      ) {
        setSessionLockedError(
          `Sesi ujian Anda terdeteksi aktif pada perangkat/jaringan lain (${savedCount} jawaban Anda sudah tersimpan aman). Silakan minta Guru menekan tombol "Reset Login" pada menu Monitoring Ujian agar Anda dapat melanjutkan pengerjaan.`
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

      const initialStartedAt = latestSub?.started_at || localBackup?.startedAt || new Date().toISOString();
      setExamStartedAt(initialStartedAt);
      setCurrentQuestionIdx(0);
      setViewMode('focus');
      setShowNumberGridModal(false);
      setUnansweredModalOpen(false);
      setMinDurationModalOpen(false);
      setConfirmSubmitModalOpen(false);

      // Sync active session and merged answers immediately to Supabase
      const { data: syncedRow, error: syncErr } = await syncExamProgressToSupabase({
        taskId: taskToStart.id,
        studentId: user.id,
        answers: restoredAnswers,
        violationCount: restoredViolations,
        violationLogs: restoredLogs,
        sessionToken: deviceToken,
        isLocked: false,
        startedAt: initialStartedAt
      });

      setSyncState(syncErr ? 'offline' : 'saved');
      if (syncedRow) {
        setSubmissions(prev => ({ ...prev, [taskToStart.id]: syncedRow }));
      }

      // Safely warm up audio context for alarm without blocking TTS queue
      antiCheatAlarm.warmUpAudioAndVoice();

      // Fire and forget notification permission - NEVER await as it can hang on low-spec Android Go
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          Notification.requestPermission().catch(() => {});
        } catch {
          // Ignore
        }
      }

      // Zero-hang policy: do NOT trigger native requestFullscreen() automatically.
      // Automatic requestFullscreen freezes compositor surfaces on entry-level Androids (Infinix Smart 7, Itel A90, Oppo A60)
      // and causes a blank white screen. The exam uses solid CSS fixed inset-0 viewport.
      initialLaunchGracePeriodRef.current = Date.now() + 1500;

      setPendingTokenTask(null);
      setTokenInput('');
      setTokenError(null);
      setSessionLockedError(null);
      setAnswers(restoredAnswers);
      setViolationCount(restoredViolations);
      setViolationLogs(restoredLogs);
      setAlarmActive(false);
      setIsExamStopped(false);
      setStopPenaltySeconds(0);
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

      // Cek status terkini di users dan task_submissions
      const { data: freshUser } = await supabase
        .from('users')
        .select('is_exam_locked')
        .eq('id', user.id)
        .maybeSingle();

      const userStillLocked = Boolean(freshUser?.is_exam_locked);
      const subStillLocked = Boolean(latestSub?.is_locked || Number(latestSub?.violation_count || 0) >= 3);

      if (
        latestSub &&
        latestSub.status === 'in_progress' &&
        !userStillLocked &&
        !subStillLocked
      ) {
        setSessionLockedError(null);
        await startOrResumeExamSession(pendingTokenTask, true);
      } else {
        setSessionLockedError(
          'Sesi ujian Anda masih terkunci karena 3 kali pelanggaran. Mohon minta Guru Pengawas menekan tombol "Reset Login" pada menu Monitoring Ujian, lalu coba klik tombol ini kembali.'
        );
      }
    } finally {
      setCheckingSessionStatus(false);
    }
  };

  const handleDismissAlarmAndResume = async () => {
    if (violationCount >= 3) return;
    antiCheatAlarm.stopAlarm();
    setAlarmActive(false);
    setIsExamStopped(false);
    setStopPenaltySeconds(0);
    lastViolationTimestampRef.current = Date.now();
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

  const parsedQuestions = useMemo(() => {
    if (!activeTask) return [];
    let raw = activeTask.content;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = [];
      }
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      if (Array.isArray(raw.questions)) raw = raw.questions;
      else if (Array.isArray(raw.soal)) raw = raw.soal;
      else if (Array.isArray(raw.items)) raw = raw.items;
      else if (Array.isArray(raw.content)) raw = raw.content;
    }
    if (!Array.isArray(raw)) return [];
    return raw.map((q: any, i: number) => {
      let rawOpts = q?.options;
      if (typeof rawOpts === 'string') {
        try {
          rawOpts = JSON.parse(rawOpts);
        } catch {
          rawOpts = [];
        }
      }
      if (!Array.isArray(rawOpts)) rawOpts = [];
      return {
        idx: i,
        type: q?.type === 'essay' ? 'essay' : 'pg',
        question: q?.question || `Soal #${i + 1}`,
        options: rawOpts,
        answer: q?.answer || '',
        answerKey: q?.answerKey || q?.answer || '',
        explanation: q?.explanation || ''
      };
    });
  }, [activeTask]);

  const maxDurationMinutes = Number(activeTask?.max_duration || activeTask?.duration || 60);
  const minDurationMinutes = Number(activeTask?.min_duration || 0);
  const startedAtMs = examStartedAt ? new Date(examStartedAt).getTime() : nowMs;
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  const totalMaxSeconds = maxDurationMinutes * 60;
  const remainingSeconds = Math.max(0, totalMaxSeconds - elapsedSeconds);
  const minRequiredSeconds = minDurationMinutes * 60;
  const isMinDurationReached = elapsedSeconds >= minRequiredSeconds;
  const minRemainingSeconds = Math.max(0, minRequiredSeconds - elapsedSeconds);

  // Formatted countdown timer (durasi mundur)
  const remHours = Math.floor(remainingSeconds / 3600);
  const remMinutes = Math.floor((remainingSeconds % 3600) / 60);
  const remSecs = remainingSeconds % 60;
  const formattedCountdown = remHours > 0
    ? `${String(remHours).padStart(2, '0')}:${String(remMinutes).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`
    : `${String(remMinutes).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;

  const elapsedMin = Math.floor(elapsedSeconds / 60);
  const elapsedSec = elapsedSeconds % 60;
  const minRemMin = Math.floor(minRemainingSeconds / 60);
  const minRemSec = minRemainingSeconds % 60;

  const handleAnswerChange = (questionIndex: number, value: string) => {
    const nextAnswers = { ...answers, [questionIndex]: value };
    setAnswers(nextAnswers);

    if (!activeTask || !user) return;

    // 1. Save immediately to localStorage (instant offline protection)
    saveLocalExamProgress(user.id, activeTask.id, nextAnswers, violationCount, violationLogs, examStartedAt);

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
        sessionToken: deviceToken,
        startedAt: examStartedAt
      });
      setSyncState(error ? 'offline' : 'saved');
    }, 1200);
  };

  const handleAttemptSubmitTask = () => {
    markInternalAction();
    if (!activeTask) return;

    // 1. Validasi: jika ada soal yang belum dikerjakan tidak bisa diselesaikan dan beri notifikasi ada soal yang belum terjawab
    const unanswered = parsedQuestions
      .filter(q => answers[q.idx] === undefined || answers[q.idx] === null || String(answers[q.idx]).trim() === '')
      .map(q => q.idx + 1);

    if (unanswered.length > 0) {
      setUnansweredList(unanswered);
      setUnansweredModalOpen(true);
      return; // Tidak bisa diselesaikan!
    }

    // 2. Validasi: minimal durasi pengerjaan sebelum terbitkan/kumpulkan soal
    if (minDurationMinutes > 0 && !isMinDurationReached) {
      setMinDurationModalOpen(true);
      return; // Tidak bisa diselesaikan!
    }

    // 3. Konfirmasi penyelesaian jika semua syarat terpenuhi
    setConfirmSubmitModalOpen(true);
  };

  const handleSubmitTask = async (isAutoSubmit: boolean = false) => {
    if (!activeTask || !user || !supabase) return;

    setConfirmSubmitModalOpen(false);
    setSubmitting(true);
    antiCheatAlarm.stopAlarm();
    setAlarmActive(false);

    try {
      const result = calculateExamResult(parsedQuestions, answers, violationCount, false);
      const nowIso = new Date().toISOString();

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
      safeExitFullscreen();

      alert(
        isAutoSubmit
          ? '⏰ Waktu pengerjaan telah selesai! Seluruh lembar jawaban Anda telah disimpan dan dinilai oleh sistem.'
          : result.hasEssay
          ? '✅ Ujian berhasil dikumpulkan! Jawaban esai Anda akan diperiksa dan dinilai oleh guru.'
          : `✅ Ujian selesai! Nilai Pilihan Ganda Anda: ${result.calculatedPgScore}/100`
      );

      setActiveTask(null);
      fetchStudentTasks();
    } catch (err: any) {
      alert('Gagal mengumpulkan tugas: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-submit saat hitung mundur waktu maksimal habis
  useEffect(() => {
    if (!activeTask || submitting) return;
    if (maxDurationMinutes > 0 && remainingSeconds === 0 && elapsedSeconds > 10) {
      alert('⏰ Waktu ujian telah berakhir! Sistem otomatis mengumpulkan lembar jawaban Anda.');
      handleSubmitTask(true);
    }
  }, [remainingSeconds, activeTask, submitting, maxDurationMinutes, elapsedSeconds]);

  const filteredAndSortedTasks = [...tasks]
    .filter(
      t =>
        t.title?.toLowerCase().includes(search.toLowerCase()) ||
        t.subject_name?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'status') {
        const subA = submissions[a.id]?.status || (isTaskLocked(a) ? 'locked' : 'pending');
        const subB = submissions[b.id]?.status || (isTaskLocked(b) ? 'locked' : 'pending');
        return subA.localeCompare(subB);
      }
      return 0;
    });

  const tokenTimer = getTokenTimeRemaining(nowMs);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Halo, {user?.name}!</h1>
        <p className="text-blue-100 text-sm sm:text-base">NISN: {user?.username} • SMAN 21 Garut</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span>Daftar Tugas & Ujian Kelas</span>
              <span className="text-xs font-semibold text-gray-500 font-normal">
                · {filteredAndSortedTasks.length} Paket Soal
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Siapkan <strong>Token Soal</strong> dari Guru Anda (token berganti setiap 30 menit). Jawaban Anda otomatis tersimpan saat dikerjakan.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari tugas / mapel..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm focus:bg-white"
              />
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
              <ArrowUpDown className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                aria-label="Urutkan daftar tugas dan ujian"
                className="w-full sm:w-auto py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="title">Judul (A-Z)</option>
                <option value="status">Status Pengerjaan</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 flex items-center justify-center gap-2 text-xs sm:text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Memuat daftar tugas kelas...
          </div>
        ) : filteredAndSortedTasks.length === 0 ? (
          <div className="bg-gray-50 p-8 text-center rounded-xl border border-dashed border-gray-200 text-gray-500 text-xs sm:text-sm">
            {search ? `Tidak ada tugas yang cocok dengan pencarian "${search}".` : 'Belum ada tugas yang diterbitkan untuk kelas Anda.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-4">Judul Tugas / Ujian</th>
                  <th className="py-3 px-3">Mata Pelajaran</th>
                  <th className="py-3 px-3 text-center">Jenis & Butir</th>
                  <th className="py-3 px-3 text-center">Waktu & KKM</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAndSortedTasks.map((task, idx) => {
                  const sub = submissions[task.id];
                  const isCompleted = Boolean(
                    sub && (sub.status === 'graded' || sub.status === 'submitted' || sub.status === 'completed')
                  );
                  const isViolationLocked = Boolean(
                    !isCompleted && (sub?.is_locked || Number(sub?.violation_count || 0) >= 3 || user?.is_exam_locked)
                  );
                  const isInProgress = Boolean(sub && sub.status === 'in_progress');
                  const localDraft = user ? getLocalExamProgress(user.id, task.id) : null;
                  const mergedSavedAnswers = normalizeAndMergeAnswers(sub?.answers, localDraft?.answers);
                  const savedAnswerCount = countAnsweredQuestions(mergedSavedAnswers);
                  const totalQ = Array.isArray(task.content) ? task.content.length : 0;
                  const hasResetLoginPrivilege = Boolean(
                    isInProgress && !isViolationLocked && (Number(sub?.login_reset_count || 0) > 0 || !sub?.session_token || sub?.session_token === deviceToken)
                  );

                  const pubTime = getTaskPublishTime(task);
                  const isLocked = isTaskLocked(task);
                  const durationMin = task.duration_minutes || 60;
                  const kkmVal = task.passing_grade ?? 75;

                  return (
                    <tr key={task.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3 px-3 text-center font-semibold text-gray-500">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 line-clamp-1">{task.title}</div>
                        {isLocked && pubTime && (
                          <div className="text-[10px] text-amber-700 mt-0.5 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Terbit: {new Date(pubTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} WIB
                          </div>
                        )}
                        {isInProgress && !isViolationLocked && (
                          <div className="text-[10px] text-indigo-700 mt-0.5 flex items-center gap-1 font-semibold">
                            <Cloud className="w-3 h-3 text-indigo-600" />
                            Tersimpan {savedAnswerCount} dari {totalQ} Soal
                          </div>
                        )}
                        {isViolationLocked && (
                          <div className="text-[10px] text-red-700 mt-0.5 flex items-center gap-1 font-semibold">
                            <Lock className="w-3 h-3 text-red-600" />
                            Terkunci • {savedAnswerCount} Soal Tersimpan Aman
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {task.subject_name || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="capitalize font-medium text-gray-700">
                          {task.type === 'pg' ? 'Pilihan Ganda' : task.type === 'essay' ? 'Esai' : 'Campuran'}
                        </span>
                        <div className="text-[10px] text-gray-500 font-semibold">{totalQ} Soal</div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="font-semibold text-gray-700">{durationMin} Menit</div>
                        <div className="text-[10px] text-slate-500 font-medium">KKM: {kkmVal}</div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Selesai
                          </span>
                        ) : isViolationLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                            <Lock className="w-3 h-3 text-red-600" /> Terkunci (3x Pelanggaran)
                          </span>
                        ) : isInProgress ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            <Cloud className="w-3 h-3" /> Berjalan ({savedAnswerCount}/{totalQ})
                          </span>
                        ) : isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Lock className="w-3 h-3 text-amber-700" /> Terjadwal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            <KeyRound className="w-3 h-3 text-slate-500" /> Belum Mulai
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isCompleted ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-800 rounded-lg text-xs font-bold border border-gray-200">
                            <span>Nilai:</span>
                            <span className="text-emerald-700 font-black">
                              {sub.score !== null ? sub.score : 'Menunggu'}
                            </span>
                          </div>
                        ) : isViolationLocked ? (
                          <button
                            type="button"
                            onClick={() => openTaskModal(task)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs mx-auto"
                            title="Ujian terkunci karena 3 kali pelanggaran. Minta Guru untuk Reset Login."
                          >
                            <Lock className="w-3.5 h-3.5 text-red-600" /> Minta Reset Guru
                          </button>
                        ) : isLocked ? (
                          <button
                            disabled
                            className="px-3 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-semibold cursor-not-allowed border border-gray-200 inline-flex items-center gap-1"
                          >
                            <Lock className="w-3 h-3" /> Menunggu Terbit
                          </button>
                        ) : isInProgress ? (
                          <button
                            onClick={() => openTaskModal(task)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs mx-auto"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            {hasResetLoginPrivilege ? 'Lanjutkan' : 'Token & Lanjut'}
                          </button>
                        ) : (
                          <button
                            onClick={() => openTaskModal(task)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs mx-auto"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Kerjakan
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Token Verification & Resume Exam Modal */}
      {pendingTokenTask && (() => {
        const sub = submissions[pendingTokenTask.id];
        const isViolationLocked = Boolean(
          sub?.is_locked ||
          Number(sub?.violation_count || 0) >= 3 ||
          user?.is_exam_locked
        );
        const isInProgress = Boolean(sub && sub.status === 'in_progress');
        const localDraft = user ? getLocalExamProgress(user.id, pendingTokenTask.id) : null;
        const savedCount = countAnsweredQuestions(normalizeAndMergeAnswers(sub?.answers, localDraft?.answers));
        const totalQ = Array.isArray(pendingTokenTask.content) ? pendingTokenTask.content.length : 0;
        const canResumeDirectly = Boolean(
          isInProgress &&
            !isViolationLocked &&
            (!sub?.session_token || sub?.session_token === deviceToken || Number(sub?.login_reset_count || 0) > 0)
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80">
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

                {/* If exam is locked due to 3 violations, show locked notice and reset check */}
                {isViolationLocked ? (
                  <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl text-xs text-red-950 space-y-3">
                    <div className="flex items-center gap-2 font-black text-red-800 text-sm">
                      <Lock className="w-5 h-5 text-red-600 shrink-0" />
                      <span>Ujian Terkunci (3x Pelanggaran)</span>
                    </div>
                    <p className="leading-relaxed font-medium">
                      Sesi ujian ini sedang <strong>terkunci</strong> karena sistem mendeteksi Anda telah melakukan 3 kali pelanggaran (membuka tab baru / keluar aplikasi).
                    </p>
                    <div className="p-2.5 bg-red-100 rounded-xl text-red-900 border border-red-200">
                      ✅ Seluruh <strong>{savedCount} soal</strong> yang telah Anda kerjakan tersimpan aman dan tidak hilang.
                    </div>
                    <p className="font-semibold text-red-900">
                      Untuk melanjutkan ujian, Anda <strong>wajib meminta Guru Pengawas Anda melakukan Reset Login</strong> pada menu Monitoring Ujian.
                    </p>
                    <button
                      type="button"
                      disabled={checkingSessionStatus}
                      onClick={handleCheckResetLoginAndResume}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      {checkingSessionStatus ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Sudah Direset Guru? Periksa & Lanjutkan
                    </button>
                    {sessionLockedError && (
                      <p className="text-[11px] text-red-700 font-semibold text-center mt-1">
                        ⚠️ {sessionLockedError}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
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
                  </>
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
                    Tutup
                  </button>
                  {!isViolationLocked && !canResumeDirectly && (
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

      {/* Task Answering Modal (Protected Exam Mode with Auto-Save & Number Grid) */}
      {activeTask && (
        <ExamErrorBoundary onReset={() => fetchStudentTasks()}>
          <div
            id="exam-viewport-root"
            className="fixed inset-0 z-50 flex flex-col bg-slate-950 select-none overflow-hidden"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '100%',
            }}
            onContextMenu={e => {
              e.preventDefault();
              markInternalAction();
              setCopyWarning('Klik kanan dinonaktifkan selama mengerjakan ujian.');
              setTimeout(() => setCopyWarning(null), 2500);
            }}
            onCopy={e => {
              e.preventDefault();
              markInternalAction();
              setCopyWarning('Menyalin teks soal tidak diizinkan selama ujian.');
              setTimeout(() => setCopyWarning(null), 2500);
            }}
            onCut={e => e.preventDefault()}
            onPaste={e => {
              e.preventDefault();
              markInternalAction();
              setCopyWarning('Menempelkan teks dari luar tidak diizinkan selama ujian.');
              setTimeout(() => setCopyWarning(null), 2500);
            }}
          >
            <div
              className="bg-white rounded-none sm:rounded-2xl w-full max-w-4xl mx-auto shadow-2xl overflow-hidden flex flex-col flex-1 sm:my-2 relative border-0 sm:border border-gray-200"
              style={{
                height: '100%',
                maxHeight: '100%',
              }}
            >
              {/* Top Header Bar */}
              <div className="p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold rounded-md flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Pengawas Anti-Buka Aplikasi Lain Aktif
                    </span>

                    {/* Live Auto-Save Status */}
                    {syncState === 'saving' ? (
                      <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-400/40 text-blue-200 text-[11px] font-semibold rounded-md flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Menyimpan...
                      </span>
                    ) : syncState === 'offline' || !isOnline ? (
                      <span className="px-2 py-0.5 bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[11px] font-bold rounded-md flex items-center gap-1">
                        <WifiOff className="w-3 h-3" /> Kendala Jaringan (Tersimpan Lokal)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[11px] font-semibold rounded-md flex items-center gap-1">
                        <Cloud className="w-3 h-3 text-emerald-300" /> Tersimpan Otomatis
                      </span>
                    )}

                    {violationCount > 0 && (
                      <span className="px-2 py-0.5 bg-red-600 text-white text-[11px] font-extrabold rounded-md flex items-center gap-1 animate-pulse">
                        <ShieldAlert className="w-3.5 h-3.5" /> Pelanggaran: {violationCount} dari 3x
                      </span>
                    )}
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        markInternalAction();
                        setViewMode(prev => (prev === 'focus' ? 'all' : 'focus'));
                      }}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
                      title="Ganti Mode Tampilan"
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-300" />
                      <span className="hidden sm:inline">
                        {viewMode === 'focus' ? 'Mode Fokus (Ringan)' : 'Semua Soal'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={safeToggleFullscreen}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
                      title="Layar Penuh (Bebas / Tidak Termasuk Pelanggaran)"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Layar Penuh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        markInternalAction();
                        handleCloseExam();
                      }}
                      className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                      title="Simpan & Keluar Sementara"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Exam Title & Durasi Hitung Mundur */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-white/10">
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white truncate">{activeTask.title}</h3>
                    <p className="text-xs text-indigo-200 truncate">
                      {activeTask.subject_name || 'Mata Pelajaran'} · Total {parsedQuestions.length} Butir Soal
                    </p>
                  </div>

                  {/* Durasi Mundur & Minimal Durasi Indicators */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Live Countdown Timer */}
                    <div
                      className={`px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-sm ${
                        remainingSeconds <= 300
                          ? 'bg-red-600 text-white animate-pulse border border-red-400'
                          : remainingSeconds <= 600
                          ? 'bg-amber-500 text-white border border-amber-400'
                          : 'bg-slate-800 text-amber-300 border border-slate-700'
                      }`}
                    >
                      <Clock className="w-4 h-4 shrink-0" />
                      <div className="flex flex-col items-start leading-none">
                        <span className="text-[9px] uppercase tracking-wider opacity-80 font-semibold">Sisa Waktu</span>
                        <span className="font-mono text-sm sm:text-base font-black tracking-wider">
                          {formattedCountdown}
                        </span>
                      </div>
                    </div>

                    {/* Minimum Duration Badge */}
                    {minDurationMinutes > 0 && (
                      <div
                        className={`px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold border ${
                          isMinDurationReached
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                            : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                        }`}
                        title={
                          isMinDurationReached
                            ? 'Batas minimal pengerjaan telah terpenuhi'
                            : `Minimal pengerjaan ${minDurationMinutes} menit. Sisa ${minRemMin}m ${minRemSec}s`
                        }
                      >
                        <Hourglass className="w-3.5 h-3.5 shrink-0" />
                        <div className="flex flex-col items-start leading-none">
                          <span className="text-[9px] uppercase tracking-wider opacity-80">Min. Pengerjaan</span>
                          <span className="text-[11px]">
                            {isMinDurationReached ? '✓ Terpenuhi' : `Sisa ${minRemMin}m ${minRemSec}s`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Number Navigation Bar (Grid & Quick Jump Bar) */}
              <div className="p-2 sm:px-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between gap-2 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    markInternalAction();
                    setShowNumberGridModal(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm transition"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Daftar Nomor Soal ({countAnsweredQuestions(answers)}/{parsedQuestions.length})</span>
                </button>

                {/* Horizontal Scrollable Question Numbers for Quick Jump */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-thin">
                  {parsedQuestions.map((q, idx) => {
                    const isAnswered = answers[idx] !== undefined && String(answers[idx]).trim() !== '';
                    const isCurrent = currentQuestionIdx === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          markInternalAction();
                          setCurrentQuestionIdx(idx);
                          if (viewMode === 'all') {
                            document.getElementById(`soal-${idx}`)?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-black shrink-0 transition flex items-center justify-center border ${
                          isCurrent
                            ? 'ring-2 ring-blue-600 ring-offset-1 border-blue-600 bg-blue-600 text-white shadow-sm'
                            : isAnswered
                            ? 'bg-emerald-600 text-white border-emerald-700 font-bold'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}
                        title={`Soal #${idx + 1} (${isAnswered ? 'Sudah Dijawab: ' + answers[idx] : 'Belum Dijawab'})`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Copy/Shortcut Warning Banner */}
              {copyWarning && (
                <div className="bg-amber-500 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-2 shrink-0 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{copyWarning}</span>
                </div>
              )}

              {/* Main Questions View Area */}
              <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {parsedQuestions.length === 0 && (
                  <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 max-w-md mx-auto my-12 space-y-3 shadow-xs">
                    <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                    <h3 className="font-bold text-gray-900 text-base">Soal Belum Siap Dimuat</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Paket soal ini sedang dimuat atau belum memiliki butir soal aktif dari guru pengawas.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTask(null);
                        fetchStudentTasks();
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
                    >
                      Kembali ke Beranda Tugas
                    </button>
                  </div>
                )}

                {/* MODE FOKUS PER SOAL: Lightweight, instant rendering, no lag on mobile */}
                {viewMode === 'focus' && parsedQuestions.length > 0 && (() => {
                  const q = parsedQuestions[currentQuestionIdx] || parsedQuestions[0];
                  const idx = q.idx;
                  const isAnswered = answers[idx] !== undefined && String(answers[idx]).trim() !== '';

                  return (
                    <div className="space-y-4 max-w-3xl mx-auto">
                      <div className="p-4 sm:p-6 bg-white rounded-2xl border-2 border-indigo-100 shadow-sm space-y-4">
                        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-900 text-xs sm:text-sm font-black rounded-lg">
                              Soal #{idx + 1} dari {parsedQuestions.length}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-md">
                              {q.type === 'pg' ? 'Pilihan Ganda' : 'Esai'}
                            </span>
                          </div>

                          {isAnswered ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Sudah Dijawab {q.type === 'pg' ? `(${answers[idx]})` : ''}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              Belum Dijawab
                            </span>
                          )}
                        </div>

                        {/* Question Text */}
                        <p className="font-bold text-gray-900 text-base sm:text-lg leading-relaxed whitespace-pre-line">
                          {q.question}
                        </p>

                        {/* Options for Pilihan Ganda */}
                        {q.type === 'pg' && Array.isArray(q.options) && q.options.length > 0 && (
                          <div className="space-y-2.5 pt-2">
                            {q.options.map((opt: string, oIdx: number) => {
                              const letter = String.fromCharCode(65 + oIdx);
                              const isSelected = answers[idx] === letter || answers[idx] === opt;
                              return (
                                <label
                                  key={oIdx}
                                  onClick={() => handleAnswerChange(idx, letter)}
                                  className={`flex items-start sm:items-center p-3.5 rounded-xl border-2 cursor-pointer text-sm sm:text-base transition ${
                                    isSelected
                                      ? 'bg-blue-50 border-blue-600 font-bold text-blue-950 shadow-xs'
                                      : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`focus_q_${idx}`}
                                    checked={isSelected}
                                    onChange={() => handleAnswerChange(idx, letter)}
                                    className="mr-3 mt-1 sm:mt-0 text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0"
                                  />
                                  <span className="font-black mr-2 text-indigo-700 shrink-0">{letter}.</span>
                                  <span className="leading-snug">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* Essay Textarea */}
                        {q.type === 'essay' && (
                          <div className="pt-2">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Tuliskan Jawaban Esai:</label>
                            <textarea
                              rows={4}
                              value={answers[idx] || ''}
                              onChange={e => handleAnswerChange(idx, e.target.value)}
                              placeholder="Ketik jawaban esai Anda secara lengkap di sini..."
                              className="w-full p-3.5 bg-gray-50 border border-gray-300 rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:bg-white select-text"
                            />
                          </div>
                        )}
                      </div>

                      {/* Navigation buttons for Focus Mode */}
                      <div className="flex items-center justify-between gap-2 pt-2">
                        <button
                          type="button"
                          disabled={currentQuestionIdx === 0}
                          onClick={() => {
                            markInternalAction();
                            setCurrentQuestionIdx(prev => Math.max(0, prev - 1));
                          }}
                          className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                        >
                          <ChevronLeft className="w-4 h-4" /> Soal Sebelumnya
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            markInternalAction();
                            setShowNumberGridModal(true);
                          }}
                          className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 border border-slate-300"
                        >
                          <Grid className="w-4 h-4 text-indigo-600" />
                          <span>Pilih Nomor Soal</span>
                        </button>

                        {currentQuestionIdx < parsedQuestions.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => {
                              markInternalAction();
                              setCurrentQuestionIdx(prev => Math.min(parsedQuestions.length - 1, prev + 1));
                            }}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 shadow-sm"
                          >
                            Soal Selanjutnya <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleAttemptSubmitTask}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 shadow-sm"
                          >
                            <Check className="w-4 h-4" /> Selesaikan Ujian
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* MODE SEMUA SOAL: Vertical List View */}
                {viewMode === 'all' && (
                  <div className="space-y-6 max-w-3xl mx-auto">
                    {parsedQuestions.map((q, idx) => {
                      const isAnswered = answers[idx] !== undefined && String(answers[idx]).trim() !== '';
                      const isCurrent = currentQuestionIdx === idx;

                      return (
                        <div
                          key={idx}
                          id={`soal-${idx}`}
                          onClick={() => setCurrentQuestionIdx(idx)}
                          className={`p-5 rounded-2xl border transition ${
                            isCurrent
                              ? 'ring-2 ring-blue-500 bg-white border-blue-300 shadow-md'
                              : isAnswered
                              ? 'bg-blue-50/20 border-blue-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-900 text-xs font-bold rounded-md">
                              Soal #{idx + 1} ({q.type === 'pg' ? 'Pilihan Ganda' : 'Esai'})
                            </span>
                            {isAnswered && (
                              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Tersimpan
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-gray-900 text-base">{q.question}</p>

                          {q.type === 'pg' && Array.isArray(q.options) && (
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
                                      name={`all_q_${idx}`}
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
                  </div>
                )}

                {/* Violation Log History inside Exam if any */}
                {violationLogs.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 max-w-3xl mx-auto">
                    <h4 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      Riwayat Peringatan Pengawas Ujian ({violationCount}x Pelanggaran)
                    </h4>
                    <div className="space-y-1 max-h-24 overflow-y-auto text-xs text-red-800">
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
              <div className="p-3 sm:p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 shrink-0">
                <div className="text-xs text-gray-700 font-medium flex items-center gap-2">
                  <span>
                    Terjawab & Tersimpan:{' '}
                    <strong className="text-blue-900 font-bold">{countAnsweredQuestions(answers)}</strong> dari{' '}
                    <strong>{parsedQuestions.length}</strong> soal
                  </span>
                  {countAnsweredQuestions(answers) === parsedQuestions.length ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> (Semua Terisi)
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold">
                      (Sisa {parsedQuestions.length - countAnsweredQuestions(answers)} belum terisi)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      markInternalAction();
                      handleCloseExam();
                    }}
                    className="px-3.5 py-2 text-gray-600 font-semibold hover:bg-gray-200 rounded-xl text-xs sm:text-sm transition"
                  >
                    Simpan & Keluar
                  </button>
                  <button
                    type="button"
                    onClick={handleAttemptSubmitTask}
                    disabled={submitting}
                    className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-blue-700 transition flex items-center disabled:opacity-50 shadow-md shadow-blue-200"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    ) : (
                      <Send className="w-4 h-4 mr-1.5" />
                    )}
                    {submitting ? 'Mengumpulkan...' : 'Selesaikan & Kumpulkan Ujian'}
                  </button>
                </div>
              </div>

              {/* MODAL 1: DAFTAR NOMOR SOAL GRID MODAL */}
              {showNumberGridModal && (
                <div className="absolute inset-0 z-40 bg-gray-950/80 flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl border border-gray-200 space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                          <Grid className="w-5 h-5 text-indigo-600" /> Daftar Nomor Soal
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Klik nomor soal untuk langsung menuju dan mengisi butir soal tersebut.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          markInternalAction();
                          setShowNumberGridModal(false);
                        }}
                        className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 bg-emerald-600 rounded-sm inline-block"></span>
                        <span>Sudah Dijawab</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 bg-white border border-gray-400 rounded-sm inline-block"></span>
                        <span>Belum Dijawab</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 ring-2 ring-blue-600 bg-blue-100 rounded-sm inline-block"></span>
                        <span>Sedang Dibuka</span>
                      </div>
                    </div>

                    {/* Number Grid */}
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto p-1">
                      {parsedQuestions.map((q, idx) => {
                        const isAnswered = answers[idx] !== undefined && String(answers[idx]).trim() !== '';
                        const isCurrent = currentQuestionIdx === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              markInternalAction();
                              setCurrentQuestionIdx(idx);
                              setShowNumberGridModal(false);
                              if (viewMode === 'all') {
                                document.getElementById(`soal-${idx}`)?.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                            className={`p-2.5 rounded-xl text-xs font-black transition flex flex-col items-center justify-center border ${
                              isCurrent
                                ? 'ring-2 ring-blue-600 ring-offset-2 border-blue-600 bg-blue-50 text-blue-900 shadow-md'
                                : isAnswered
                                ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs'
                                : 'bg-white text-gray-800 border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-sm">{idx + 1}</span>
                            {isAnswered && (
                              <span className="text-[10px] font-bold opacity-90 truncate max-w-full">
                                {answers[idx] || '✓'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          markInternalAction();
                          setShowNumberGridModal(false);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL 2: NOTIFIKASI SOAL BELUM TERJAWAB (TIDAK BISA DISELESAIKAN) */}
              {unansweredModalOpen && (
                <div className="absolute inset-0 z-50 bg-gray-950/85 flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border-2 border-amber-300 space-y-4 text-center">
                    <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-8 h-8" />
                    </div>

                    <h4 className="text-lg font-black text-gray-900">
                      Masih Ada {unansweredList.length} Soal Belum Terjawab!
                    </h4>

                    <p className="text-xs text-gray-600 leading-relaxed text-left">
                      Ujian <strong>tidak dapat diselesaikan</strong> karena masih ada soal yang belum dikerjakan. Seluruh butir soal wajib dijawab sebelum mengumpulkan:
                    </p>

                    {/* Unanswered Numbers Chips */}
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left max-h-36 overflow-y-auto space-y-1.5">
                      <span className="text-[11px] font-bold text-amber-900 block">Nomor Soal yang Belum Diisi:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {unansweredList.map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              markInternalAction();
                              setCurrentQuestionIdx(num - 1);
                              setUnansweredModalOpen(false);
                              if (viewMode === 'all') {
                                document.getElementById(`soal-${num - 1}`)?.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-amber-600 hover:text-white border border-amber-300 text-amber-900 font-black rounded-lg text-xs transition shadow-2xs"
                          >
                            Soal #{num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          markInternalAction();
                          setUnansweredModalOpen(false);
                        }}
                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition"
                      >
                        Tutup & Lengkapi
                      </button>
                      {unansweredList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            markInternalAction();
                            setCurrentQuestionIdx(unansweredList[0] - 1);
                            setUnansweredModalOpen(false);
                            if (viewMode === 'all') {
                              document.getElementById(`soal-${unansweredList[0] - 1}`)?.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                        >
                          Buka Soal No. {unansweredList[0]}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL 3: NOTIFIKASI MINIMAL DURASI BELUM TERCAPAI */}
              {minDurationModalOpen && (
                <div className="absolute inset-0 z-50 bg-gray-950/85 flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border-2 border-indigo-300 space-y-4 text-center">
                    <div className="w-14 h-14 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center mx-auto">
                      <Hourglass className="w-8 h-8 animate-spin" />
                    </div>

                    <h4 className="text-lg font-black text-gray-900">
                      Belum Mencapai Batas Minimal Pengerjaan Ujian!
                    </h4>

                    <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-left text-xs space-y-2 text-indigo-950">
                      <p className="leading-relaxed">
                        Guru telah menentukan bahwa <strong>minimal durasi pengerjaan</strong> untuk ujian ini adalah{' '}
                        <strong className="text-indigo-900 font-black">{minDurationMinutes} menit</strong>.
                      </p>
                      <div className="flex items-center justify-between border-t border-indigo-200 pt-2 font-semibold">
                        <span>Waktu Pengerjaan Anda:</span>
                        <span className="font-bold text-gray-900">
                          {elapsedMin} menit {elapsedSec} detik
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-bold text-amber-800">
                        <span>Waktu Minimal Tersisa:</span>
                        <span className="font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                          {minRemMin} menit {minRemSec} detik lagi
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600">
                      Silakan manfaatkan waktu yang ada untuk memeriksa kembali butir soal dan jawaban Anda hingga batas minimal terpenuhi.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        markInternalAction();
                        setMinDurationModalOpen(false);
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                    >
                      Kembali Periksa Jawaban
                    </button>
                  </div>
                </div>
              )}

              {/* MODAL 4: KONFIRMASI KUMPULKAN UJIAN */}
              {confirmSubmitModalOpen && (
                <div className="absolute inset-0 z-50 bg-gray-950/85 flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200 space-y-4 text-center">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>

                    <h4 className="text-lg font-black text-gray-900">
                      Kumpulkan & Selesaikan Ujian?
                    </h4>

                    <p className="text-xs text-gray-600 leading-relaxed">
                      Seluruh <strong>{parsedQuestions.length} soal</strong> telah terjawab lengkap dan syarat minimal waktu pengerjaan ({minDurationMinutes} menit) telah terpenuhi.
                    </p>

                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 text-left font-medium">
                      ✅ Setelah dikumpulkan, nilai dan lembar jawaban Anda akan langsung terekam ke sistem ujian pengawas.
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          markInternalAction();
                          setConfirmSubmitModalOpen(false);
                        }}
                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition"
                      >
                        Batal, Periksa Lagi
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleSubmitTask(false)}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Ya, Kumpulkan Sekarang
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL 5: FULL-SCREEN STOP PENGERJAAN & ANTI-CHEAT ALARM OVERLAY */}
              {(alarmActive || isExamStopped) && (
                <div className="absolute inset-0 z-50 bg-red-950 flex flex-col items-center justify-center p-4 sm:p-6 text-center text-white animate-fadeIn overflow-y-auto">
                  <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center mb-3 animate-bounce shadow-lg shadow-red-600/50 border-4 border-red-300 shrink-0">
                    <ShieldAlert className="w-11 h-11 text-white" />
                  </div>

                  <span className="px-3 py-1 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-md border border-red-400 mb-2">
                    🛑 PENGERJAAN DIHENTIKAN SEMENTARA (STOP PENGERJAAN)
                  </span>

                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white max-w-xl leading-tight">
                    TERDETEKSI KELUAR APLIKASI / BUKA TAB BARU!
                  </h2>

                  <p className="text-red-200 text-xs sm:text-sm max-w-lg mt-2 leading-relaxed">
                    {latestViolationReason || 'Sistem mendeteksi Anda membuka tab baru, berpindah aplikasi, atau meminimalkan browser saat ujian.'}
                  </p>

                  <div className="my-4 p-4 bg-red-900/80 border border-red-500/60 rounded-2xl max-w-md w-full text-left space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                      <span>Pelanggaran Terdeteksi:</span>
                      <span className="text-sm font-black text-white bg-red-600 px-2.5 py-0.5 rounded-md">
                        Ke-{violationCount} dari 3 Kali
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-amber-200">
                      <span>Sisa Batas Toleransi:</span>
                      <span className="text-sm font-black text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-md border border-amber-500/40">
                        {Math.max(0, 3 - violationCount)} Kali Lagi
                      </span>
                    </div>

                    {/* Freeze Penalty Timer */}
                    <div className="p-3 bg-red-950 rounded-xl border border-red-500/80 text-center">
                      <p className="text-[11px] font-semibold text-red-200 uppercase tracking-wider mb-0.5">
                        Sanksi Pembekuan Layar Pengerjaan:
                      </p>
                      {stopPenaltySeconds > 0 ? (
                        <div className="flex items-center justify-center gap-2 text-amber-300">
                          <Clock className="w-5 h-5 animate-pulse text-amber-400" />
                          <span className="text-xl sm:text-2xl font-black font-mono tracking-wider text-white">
                            {stopPenaltySeconds} DETIK
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-emerald-400">
                          ✓ Masa tunggu sanksi selesai. Anda dapat melanjutkan.
                        </p>
                      )}
                    </div>

                    <p className="text-[11px] text-red-200 leading-relaxed pt-1 border-t border-red-800">
                      ⚠️ <strong>PENTING:</strong> Seluruh soal dibekukan selama masa sanksi. Jika mencapai 3 kali pelanggaran, ujian akan <strong>TERKUNCI PERMANEN</strong> dan wajib meminta Reset Login kepada Guru Pengawas!
                    </p>
                  </div>

                  {violationCount >= 3 ? (
                    <div className="p-4 bg-red-900 border border-red-500 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 max-w-md w-full shadow-lg">
                      <Lock className="w-5 h-5 text-red-300 animate-pulse shrink-0" />
                      <span>Batas 3 kali pelanggaran tercapai. Ujian terkunci & sedang dialihkan ke halaman login...</span>
                    </div>
                  ) : stopPenaltySeconds > 0 ? (
                    <button
                      type="button"
                      disabled
                      className="px-8 py-3.5 bg-gray-700/80 text-gray-300 font-bold rounded-xl text-sm shadow-md cursor-not-allowed flex items-center gap-2 border border-gray-600"
                    >
                      <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                      Tunggu Pembekuan Selesai ({stopPenaltySeconds}s)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDismissAlarmAndResume}
                      className="px-8 py-3.5 bg-white text-red-950 hover:bg-red-50 font-black rounded-xl text-sm shadow-xl transition flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
                    >
                      <VolumeX className="w-5 h-5 text-red-700" />
                      Matikan Alarm & Lanjutkan Ujian (Sisa Toleransi {Math.max(0, 3 - violationCount)}x)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </ExamErrorBoundary>
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
