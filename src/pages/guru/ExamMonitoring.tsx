import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { supabase, ensureSupabaseSchemaSynced } from '../../lib/supabase';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Send,
  Eye,
  X,
  Search,
  Copy,
  Check,
  Loader2,
  RotateCcw,
  Users,
  Database,
  FileCheck,
  Download
} from 'lucide-react';
import { generateTaskToken, getTokenTimeRemaining } from '../../lib/examToken';
import { exportTaskGradesToExcel } from '../../lib/excelExport';
import {
  countAnsweredQuestions,
  normalizeAndMergeAnswers,
  finishStudentExamByGuru,
  resetStudentLoginByGuru
} from '../../lib/examMonitoring';

export default function ExamMonitoring() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTaskId = searchParams.get('taskId');

  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [monitoringRows, setMonitoringRows] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);
  const [loadingRows, setLoadingRows] = useState<boolean>(false);

  // Filters & Auto-refresh
  const [taskSearch, setTaskSearch] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [taskClassFilter, setTaskClassFilter] = useState<string>('ALL');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Action loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [violationLogsModalItem, setViolationLogsModalItem] = useState<any | null>(null);
  const [syncingSchema, setSyncingSchema] = useState<boolean>(false);

  // In-memory cache & debounce to prevent heavy Supabase egress & log flooding
  const classStudentsCacheRef = useRef<{ classId: string; students: any[] } | null>(null);
  const realtimeDebounceTimerRef = useRef<number | null>(null);

  // 1s ticker for token countdown & relative timestamps
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Ensure Supabase schema columns exist on mount
  useEffect(() => {
    ensureSupabaseSchemaSynced().catch(() => {});
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!user || !supabase) return;
    setLoadingTasks(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, class:classes(name)')
        .eq('guru_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const ownTasks = data.filter((t: any) => t.guru_id === user.id);
        setTasks(ownTasks);

        if (ownTasks.length > 0 && !selectedTask) {
          const matched = initialTaskId
            ? ownTasks.find((t: any) => t.id === initialTaskId) || ownTasks[0]
            : ownTasks[0];
          setSelectedTask(matched);
        }
      } else {
        setTasks([]);
      }
    } finally {
      setLoadingTasks(false);
    }
  }, [user, initialTaskId, selectedTask]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const fetchMonitoringData = useCallback(
    async (taskToLoad: any, silent: boolean = false, forceRefreshClass: boolean = false) => {
      if (!taskToLoad || !supabase) return;
      if (!silent) setLoadingRows(true);

      try {
        // 1. Fetch students in the task's class with in-memory caching to save Supabase egress/queries
        let studentsList: any[] = [];
        if (!forceRefreshClass && classStudentsCacheRef.current && classStudentsCacheRef.current.classId === taskToLoad.class_id) {
          studentsList = classStudentsCacheRef.current.students;
        } else {
          const { data: classStudents } = await supabase
            .from('class_students')
            .select('student:users!student_id(id, name, username, status, active_session_token, last_login_at, is_exam_locked, exam_locked_reason)')
            .eq('class_id', taskToLoad.class_id);

          studentsList = (classStudents || [])
            .map((cs: any) => cs.student)
            .filter(Boolean);

          classStudentsCacheRef.current = {
            classId: taskToLoad.class_id,
            students: studentsList
          };
        }

        // 2. Fetch submissions for this task with explicit columns (not select *) to reduce egress
        const { data: subs } = await supabase
          .from('task_submissions')
          .select('id, task_id, student_id, status, answers, score, violation_count, violation_logs, is_locked, session_token, started_at, last_active_at, updated_at, created_at, feedback')
          .eq('task_id', taskToLoad.id);

        const subMap: Record<string, any> = {};
        if (subs) {
          subs.forEach((s: any) => {
            subMap[s.student_id] = s;
          });
        }

        const combined = studentsList.map((st: any) => ({
          student: st,
          submission: subMap[st.id] || null
        }));

        setMonitoringRows(combined);
        setLastRefreshedAt(new Date());

        // Keep violation logs modal fresh if open
        setViolationLogsModalItem((prev: any) => {
          if (!prev) return null;
          const updated = combined.find((c: any) => c.student.id === prev.student.id);
          return updated || prev;
        });
      } finally {
        if (!silent) setLoadingRows(false);
      }
    },
    []
  );

  // Load monitoring data when selectedTask changes
  useEffect(() => {
    if (selectedTask) {
      fetchMonitoringData(selectedTask, false, true);
    }
  }, [selectedTask, fetchMonitoringData]);

  // Auto-refresh (20s backup interval) + debounced Supabase Realtime channel subscription
  useEffect(() => {
    if (!selectedTask || !supabase) return;

    let intervalId: number | undefined;
    if (autoRefresh) {
      intervalId = window.setInterval(() => {
        fetchMonitoringData(selectedTask, true);
      }, 20000);
    }

    const channel = supabase
      .channel(`monitoring_task_${selectedTask.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_submissions',
          filter: `task_id=eq.${selectedTask.id}`
        },
        () => {
          // Debounce realtime event triggers to prevent bursting queries when many students submit simultaneously
          if (realtimeDebounceTimerRef.current) {
            clearTimeout(realtimeDebounceTimerRef.current);
          }
          realtimeDebounceTimerRef.current = window.setTimeout(() => {
            fetchMonitoringData(selectedTask, true);
          }, 2500);
        }
      )
      .subscribe();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (realtimeDebounceTimerRef.current) clearTimeout(realtimeDebounceTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [selectedTask, autoRefresh, fetchMonitoringData]);

  // Helper to classify student exam state
  const getStudentMonitoringState = (item: any) => {
    const sub = item.submission;
    const st = item.student;
    const totalQuestions = Array.isArray(selectedTask?.content) ? selectedTask.content.length : 0;
    const answers = normalizeAndMergeAnswers(sub?.answers, null);
    const answeredCount = countAnsweredQuestions(answers);
    const progressPercent = totalQuestions > 0 ? Math.min(100, Math.round((answeredCount / totalQuestions) * 100)) : 0;

    if (!sub) {
      return {
        code: 'NOT_STARTED' as const,
        label: 'Belum Mulai',
        isOnline: false,
        hasNetworkIssue: false,
        isLocked: false,
        isCompleted: false,
        isInProgress: false,
        answeredCount: 0,
        totalQuestions,
        progressPercent: 0,
        violationCount: 0,
        violationLogs: [],
        lastActiveText: 'Belum masuk ujian'
      };
    }

    const isCompleted = sub.status === 'graded' || sub.status === 'submitted' || sub.status === 'completed';
    const isInProgress = sub.status === 'in_progress' || !isCompleted;
    const violationCount = Number(sub.violation_count || 0);
    const violationLogs = Array.isArray(sub.violation_logs) ? sub.violation_logs : [];
    const isViolationLock = Boolean(st?.is_exam_locked || violationCount >= 3);
    const isLocked = Boolean(sub.is_locked || isViolationLock);

    const lastActiveStr = sub.last_active_at || sub.updated_at || sub.created_at;
    const lastActiveMs = lastActiveStr ? new Date(lastActiveStr).getTime() : 0;
    const diffSec = lastActiveMs > 0 ? Math.max(0, Math.floor((nowMs - lastActiveMs) / 1000)) : 9999;

    const isOnline = isInProgress && !isLocked && diffSec <= 60;
    const hasNetworkIssue = isInProgress && (isLocked || diffSec > 60);

    let lastActiveText = '-';
    if (lastActiveMs > 0) {
      lastActiveText = new Date(lastActiveMs).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    }

    if (isCompleted) {
      return {
        code: 'COMPLETED' as const,
        label: sub.status === 'graded' ? 'Selesai (Dinilai)' : 'Selesai (Menunggu Koreksi)',
        isOnline: false,
        hasNetworkIssue: false,
        isLocked: false,
        isCompleted: true,
        isInProgress: false,
        answeredCount,
        totalQuestions,
        progressPercent,
        violationCount,
        violationLogs,
        lastActiveText
      };
    }

    if (isLocked) {
      return {
        code: 'NETWORK_ISSUE' as const,
        label: isViolationLock ? '🚨 Terkunci (3x Pelanggaran) • Butuh Reset Login' : 'Sesi Terkunci • Butuh Reset Login',
        isOnline: false,
        hasNetworkIssue: true,
        isLocked: true,
        isCompleted: false,
        isInProgress: true,
        answeredCount,
        totalQuestions,
        progressPercent,
        violationCount,
        violationLogs,
        lastActiveText
      };
    }

    if (hasNetworkIssue) {
      return {
        code: 'NETWORK_ISSUE' as const,
        label: 'Sedang Mengerjakan • Indikasi Kendala Jaringan',
        isOnline: false,
        hasNetworkIssue: true,
        isLocked: false,
        isCompleted: false,
        isInProgress: true,
        answeredCount,
        totalQuestions,
        progressPercent,
        violationCount,
        violationLogs,
        lastActiveText
      };
    }

    return {
      code: 'IN_PROGRESS' as const,
      label: 'Sedang Mengerjakan • Online',
      isOnline: true,
      hasNetworkIssue: false,
      isLocked: false,
      isCompleted: false,
      isInProgress: true,
      answeredCount,
      totalQuestions,
      progressPercent,
      violationCount,
      violationLogs,
      lastActiveText
    };
  };

  // Handler: Teacher finishes exam for a student who forgot to submit
  const handleForceFinishStudentExam = async (item: any) => {
    if (!selectedTask) return;
    const st = item.student;
    const state = getStudentMonitoringState(item);

    const confirmMsg =
      `Selesaikan ujian untuk siswa "${st.name}" sekarang?\n\n` +
      `• Progres tersimpan: ${state.answeredCount} dari ${state.totalQuestions} soal.\n` +
      `• Seluruh jawaban yang sudah dikerjakan siswa TIDAK hilang dan akan langsung dikalkulasi menjadi nilai akhir.`;

    if (!confirm(confirmMsg)) return;

    setActionLoadingId(`finish_${st.id}`);
    try {
      const { error } = await finishStudentExamByGuru({
        task: selectedTask,
        studentId: st.id,
        existingSubmission: item.submission
      });

      if (error) throw error;

      await fetchMonitoringData(selectedTask, true);
      alert(
        `✅ Ujian siswa "${st.name}" berhasil diselesaikan oleh Guru!\n` +
          `${state.answeredCount} jawaban yang telah dikerjakan siswa berhasil disimpan dan dinilai.`
      );
    } catch (err: any) {
      alert('Gagal menyelesaikan ujian siswa: ' + (err.message || String(err)));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handler: Teacher finishes ALL in-progress students at once
  const handleForceFinishAllInProgress = async () => {
    if (!selectedTask) return;
    const inProgressList = monitoringRows.filter(item => {
      const st = getStudentMonitoringState(item);
      return st.isInProgress;
    });

    if (inProgressList.length === 0) {
      alert('Tidak ada siswa yang sedang dalam status mengerjakan / lupa menyelesaikan ujian.');
      return;
    }

    if (
      !confirm(
        `Apakah Anda yakin ingin MENYELESAIKAN UJIAN untuk ${inProgressList.length} siswa yang masih berstatus "Sedang Mengerjakan"?\n\n` +
          `Seluruh jawaban yang sudah dikerjakan masing-masing siswa akan tersimpan aman dan langsung dinilai otomatis.`
      )
    ) {
      return;
    }

    setActionLoadingId('FINISH_ALL');
    try {
      for (const item of inProgressList) {
        await finishStudentExamByGuru({
          task: selectedTask,
          studentId: item.student.id,
          existingSubmission: item.submission
        });
      }
      await fetchMonitoringData(selectedTask, true);
      alert(`✅ Berhasil menyelesaikan ujian untuk ${inProgressList.length} siswa!`);
    } catch (err: any) {
      alert('Gagal menyelesaikan ujian massal: ' + (err.message || String(err)));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handler: Teacher resets student login (keeps all answered questions intact!)
  const handleResetStudentLogin = async (item: any) => {
    if (!selectedTask) return;
    const st = item.student;
    const state = getStudentMonitoringState(item);

    const confirmMsg =
      `Reset Login Ujian untuk siswa "${st.name}" (NISN: ${st.username})?\n\n` +
      `✅ AMAN: ${state.answeredCount} dari ${state.totalQuestions} soal yang sudah dikerjakan siswa TIDAK AKAN HILANG.\n` +
      `🔓 Sesi perangkat & jaringan siswa akan dibuka kembali agar siswa dapat login ulang dan melanjutkan pengerjaan soal.`;

    if (!confirm(confirmMsg)) return;

    setActionLoadingId(`reset_login_${st.id}`);
    try {
      const { answeredCount, error } = await resetStudentLoginByGuru({
        taskId: selectedTask.id,
        studentId: st.id,
        existingSubmission: item.submission
      });

      if (error) throw error;

      await fetchMonitoringData(selectedTask, true);
      alert(
        `✅ Reset Login untuk "${st.name}" berhasil!\n\n` +
          `• Kunci sesi jaringan/perangkat telah dibuka.\n` +
          `• ${answeredCount} jawaban soal yang sudah dikerjakan tetap tersimpan utuh.\n` +
          `• Siswa dapat langsung masuk kembali dan melanjutkan ujian.`
      );
    } catch (err: any) {
      alert('Gagal melakukan Reset Login siswa: ' + (err.message || String(err)));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handler: Bulk Reset Login for all in-progress / network-issue students
  const handleResetLoginAllTroubled = async () => {
    if (!selectedTask) return;
    const targets = monitoringRows.filter(item => {
      const st = getStudentMonitoringState(item);
      return st.isInProgress || st.hasNetworkIssue;
    });

    if (targets.length === 0) {
      alert('Tidak ada siswa yang sedang mengerjakan atau mengalami kendala jaringan saat ini.');
      return;
    }

    if (
      !confirm(
        `Reset Login untuk ${targets.length} siswa yang sedang mengerjakan / terkendala jaringan?\n\n` +
          `Seluruh jawaban yang sudah dikerjakan siswa TIDAK akan hilang.`
      )
    ) {
      return;
    }

    setActionLoadingId('RESET_LOGIN_ALL');
    try {
      for (const item of targets) {
        await resetStudentLoginByGuru({
          taskId: selectedTask.id,
          studentId: item.student.id,
          existingSubmission: item.submission
        });
      }
      await fetchMonitoringData(selectedTask, true);
      alert(`✅ Berhasil melakukan Reset Login untuk ${targets.length} siswa. Seluruh jawaban tersimpan aman!`);
    } catch (err: any) {
      alert('Gagal mereset login massal: ' + (err.message || String(err)));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handler: Full Exam Reset from 0 (only if teacher explicitly wants to wipe answers inside detail modal)
  const handleFullResetFromZero = async (item: any) => {
    if (!selectedTask || !item.submission) return;
    const st = item.student;

    if (
      !confirm(
        `PERINGATAN: Fitur ini akan MENGHAPUS seluruh jawaban "${st.name}" agar mengulang dari 0.\n\n` +
          `Jika siswa hanya terkendala jaringan, gunakan tombol "Reset Login (Jawaban Tetap Aman)".\n\n` +
          `Tetap hapus jawaban dan ulang dari 0?`
      )
    ) {
      return;
    }

    setActionLoadingId(`wipe_${st.id}`);
    try {
      const { error } = await supabase!
        .from('task_submissions')
        .delete()
        .eq('id', item.submission.id);

      if (error) throw error;
      await fetchMonitoringData(selectedTask, true);
      alert(`✅ Ujian siswa "${st.name}" telah direset ke 0.`);
    } catch (err: any) {
      alert('Gagal mereset ujian: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleManualSyncSchema = async () => {
    setSyncingSchema(true);
    try {
      await ensureSupabaseSchemaSynced();
      await fetch('/api/sync-schema', { method: 'POST' }).catch(() => {});
      alert('✅ Skema tabel & kolom monitoring pada Supabase telah diperiksa dan disinkronkan secara otomatis.');
    } finally {
      setSyncingSchema(false);
    }
  };

  const checkTaskIsActive = (task: any): boolean => {
    if (!task) return true;
    if (task.is_active === false) return false;
    if (Array.isArray(task.content) && task.content.length > 0 && task.content[0]?.is_active === false) {
      return false;
    }
    return true;
  };

  const handleToggleTaskActive = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supabase) return;
    const currentActive = checkTaskIsActive(task);
    const nextActive = !currentActive;

    const confirmMsg = nextActive
      ? `Aktifkan paket soal "${task.title}"?\n\nSoal akan muncul kembali di akun siswa kelas ${task.class?.name || ''}.`
      : `Nonaktifkan paket soal "${task.title}"?\n\nSoal TIDAK AKAN MUNCUL di akun siswa kelas ${task.class?.name || ''} selama dinonaktifkan.`;

    if (!confirm(confirmMsg)) return;

    try {
      const updatedContent = Array.isArray(task.content)
        ? task.content.map((q: any) => ({ ...q, is_active: nextActive }))
        : task.content;

      let updateError = null;
      const { error: primaryErr } = await supabase
        .from('tasks')
        .update({ is_active: nextActive, content: updatedContent })
        .eq('id', task.id);

      if (primaryErr) {
        const errStr = (primaryErr.message || '').toLowerCase();
        if (errStr.includes('is_active') || errStr.includes('column') || primaryErr.code === 'PGRST204') {
          const { error: fallbackErr } = await supabase
            .from('tasks')
            .update({ content: updatedContent })
            .eq('id', task.id);
          if (fallbackErr) updateError = fallbackErr;
        } else {
          updateError = primaryErr;
        }
      }

      if (updateError) throw updateError;

      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, is_active: nextActive, content: updatedContent } : t))
      );

      if (selectedTask?.id === task.id) {
        setSelectedTask((prev: any) => ({ ...prev, is_active: nextActive, content: updatedContent }));
      }
    } catch (err: any) {
      alert('Gagal mengubah status aktif/nonaktif soal: ' + (err.message || String(err)));
    }
  };

  const handleDownloadExcel = () => {
    if (!selectedTask || monitoringRows.length === 0) {
      alert('Tidak ada data siswa untuk diunduh');
      return;
    }
    try {
      exportTaskGradesToExcel({
        task: selectedTask,
        items: monitoringRows
      });
    } catch (err: any) {
      alert('Gagal mengunduh file Excel: ' + (err.message || String(err)));
    }
  };

  // Computed stats
  const stats = monitoringRows.reduce(
    (acc, item) => {
      const st = getStudentMonitoringState(item);
      acc.total += 1;
      if (st.code === 'COMPLETED') acc.completed += 1;
      else if (st.code === 'NOT_STARTED') acc.notStarted += 1;
      else {
        acc.inProgress += 1;
        if (st.hasNetworkIssue) acc.networkIssue += 1;
      }
      return acc;
    },
    { total: 0, inProgress: 0, networkIssue: 0, completed: 0, notStarted: 0 }
  );

  const uniqueTaskClasses = Array.from(
    new Set(tasks.map(t => t.class?.name).filter(Boolean))
  );

  const filteredTasks = tasks.filter(t => {
    const matchClass = taskClassFilter === 'ALL' ? true : t.class?.name === taskClassFilter;
    const matchSearch =
      !taskSearch ||
      (t.title || '').toLowerCase().includes(taskSearch.toLowerCase()) ||
      (t.subject_name || '').toLowerCase().includes(taskSearch.toLowerCase());
    return matchClass && matchSearch;
  });

  const filteredMonitoringRows = monitoringRows.filter(item => {
    const st = item.student;
    const state = getStudentMonitoringState(item);
    const matchSearch =
      !studentSearch ||
      (st.name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
      (st.username || '').toLowerCase().includes(studentSearch.toLowerCase());

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'IN_PROGRESS' && state.isInProgress) ||
      (statusFilter === 'NETWORK_ISSUE' && state.hasNetworkIssue) ||
      (statusFilter === 'COMPLETED' && state.isCompleted) ||
      (statusFilter === 'NOT_STARTED' && state.code === 'NOT_STARTED');

    return matchSearch && matchStatus;
  });

  const tokenTimer = getTokenTimeRemaining(nowMs);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-indigo-900/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                Live Monitoring Ujian CBT
              </span>
              <button
                type="button"
                onClick={handleManualSyncSchema}
                disabled={syncingSchema}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/15 border border-white/15 text-indigo-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                title="Kolom tabel Supabase otomatis disinkronkan saat ada perubahan"
              >
                {syncingSchema ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-300" />
                ) : (
                  <Database className="w-3.5 h-3.5 text-indigo-300" />
                )}
                Auto-Sync Kolom Supabase Aktif
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Monitoring Ujian & Kendali Sesi Siswa</h1>
            <p className="text-indigo-200 text-xs mt-0.5 max-w-2xl leading-relaxed">
              Pantau pengerjaan siswa live, bantu <strong>Selesaikan Ujian</strong>, atau lakukan <strong>Reset Login</strong> saat siswa terkunci tanpa menghilangkan jawaban.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                autoRefresh
                  ? 'bg-emerald-600/30 border-emerald-400/50 text-emerald-200'
                  : 'bg-white/10 border-white/20 text-gray-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-gray-400'}`} />
              Auto-Refresh 5s: {autoRefresh ? 'ON' : 'OFF'}
            </button>

            {selectedTask && (
              <button
                type="button"
                onClick={() => fetchMonitoringData(selectedTask, false)}
                disabled={loadingRows}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRows ? 'animate-spin' : ''}`} />
                Segarkan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Select Exam / Task Section (Ultra-Compact, Space-Efficient Table) */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <KeyRound className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-gray-900">
              Pilih Paket Soal Ujian yang Dipantau
            </h2>
            <span className="text-[10px] text-gray-500 font-medium hidden sm:inline">
              ({tasks.length} paket soal)
            </span>
            {selectedTask && (
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200 truncate max-w-[240px]">
                Dipantau: {selectedTask.title}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative min-w-[160px]">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari paket / mapel..."
                value={taskSearch}
                onChange={e => setTaskSearch(e.target.value)}
                className="w-full pl-6 pr-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>

            {uniqueTaskClasses.length > 1 && (
              <select
                value={taskClassFilter}
                onChange={e => setTaskClassFilter(e.target.value)}
                className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-semibold text-gray-700"
              >
                <option value="ALL">Semua Kelas ({uniqueTaskClasses.length})</option>
                {uniqueTaskClasses.map((cls: any, i: number) => (
                  <option key={i} value={cls}>Kelas {cls}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {loadingTasks ? (
          <div className="py-4 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> Memuat daftar paket soal...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-4 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200 space-y-1">
            <p className="text-xs font-semibold text-gray-700">Tidak ada paket soal yang cocok dengan pencarian.</p>
            <Link
              to="/dashboard/soal"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition"
            >
              Buat Soal Sekarang →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-52 sm:max-h-60 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="sticky top-0 bg-slate-100 z-10 shadow-2xs">
                <tr className="border-b border-gray-200 text-gray-600 font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-1.5 px-2 w-8 text-center">No</th>
                  <th className="py-1.5 px-2 min-w-[170px]">Paket Soal & Mapel</th>
                  <th className="py-1.5 px-2 whitespace-nowrap">Kelas</th>
                  <th className="py-1.5 px-2 whitespace-nowrap">Tipe & Butir</th>
                  <th className="py-1.5 px-2 text-center whitespace-nowrap">KKM</th>
                  <th className="py-1.5 px-2 min-w-[130px] whitespace-nowrap">Token (30 Mnt)</th>
                  <th className="py-1.5 px-2 whitespace-nowrap">Tanggal</th>
                  <th className="py-1.5 px-2 text-center whitespace-nowrap">Status Soal</th>
                  <th className="py-1.5 px-2 text-right whitespace-nowrap w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.map((task, idx) => {
                  const isSelected = selectedTask?.id === task.id;
                  const activeToken = generateTaskToken(task.id, nowMs);
                  const qCount = Array.isArray(task.content) ? task.content.length : 0;
                  const isTaskActive = checkTaskIsActive(task);

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/90 font-medium border-l-2 border-l-indigo-600'
                          : 'hover:bg-slate-50/80 bg-white'
                      }`}
                    >
                      <td className="py-1 px-2 text-center text-gray-400 font-semibold">{idx + 1}</td>
                      <td className="py-1 px-2">
                        <div className="leading-tight">
                          <p className={`font-bold text-xs truncate max-w-[210px] ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                            {task.title}
                          </p>
                          <p className="text-[9px] text-gray-500 font-medium truncate">{task.subject_name || '-'}</p>
                        </div>
                      </td>
                      <td className="py-1 px-2 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 font-bold rounded text-[9px]">
                          Kelas {task.class?.name || '-'}
                        </span>
                      </td>
                      <td className="py-1 px-2 whitespace-nowrap">
                        <span className="text-gray-800 font-semibold text-[10px]">
                          {task.type === 'pg' ? 'PG' : task.type === 'essay' ? 'Esai' : 'Campuran'}
                        </span>
                        <span className="text-gray-500 text-[9px] ml-1">({qCount} Soal)</span>
                      </td>
                      <td className="py-1 px-2 text-center whitespace-nowrap">
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded border border-emerald-200 text-[9px]">
                          {task.kkm !== undefined && task.kkm !== null ? task.kkm : 75}
                        </span>
                      </td>
                      <td className="py-1 px-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-[10px] text-indigo-950 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200">
                            {activeToken}
                          </span>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(activeToken);
                              setCopiedTokenId(task.id);
                              setTimeout(() => setCopiedTokenId(null), 2000);
                            }}
                            className="p-0.5 text-indigo-700 hover:bg-indigo-100 rounded transition"
                            title="Salin Token Ujian"
                          >
                            {copiedTokenId === task.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-1 px-2 whitespace-nowrap text-gray-400 text-[9px]">
                        {new Date(task.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </td>
                      <td className="py-1 px-2 text-center whitespace-nowrap">
                        {isTaskActive ? (
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold rounded text-[9px]">
                            ● Aktif
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 font-bold rounded text-[9px]">
                            ○ Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="py-1 px-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={e => handleToggleTaskActive(task, e)}
                            className={`px-1.5 py-0.5 rounded font-bold text-[9px] transition border ${
                              isTaskActive
                                ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                            }`}
                            title={isTaskActive ? 'Nonaktifkan soal agar tidak muncul pada akun siswa' : 'Aktifkan soal agar muncul di akun siswa'}
                          >
                            {isTaskActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedTask(task);
                            }}
                            className={`px-2 py-0.5 rounded font-bold text-[10px] transition flex items-center gap-1 shadow-2xs ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                            }`}
                          >
                            <Activity className="w-2.5 h-2.5" />
                            {isSelected ? 'Dipantau' : 'Pantau'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Task Monitoring Dashboard */}
      {selectedTask && (
        <>
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                <span>Total Siswa</span>
                <Users className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-black text-gray-900 mt-1">{stats.total}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Kelas {selectedTask.class?.name}</p>
            </div>

            <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
                <span>Sedang Ujian</span>
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-blue-700 mt-1">{stats.inProgress}</p>
              <p className="text-[11px] text-blue-600 mt-0.5">Progres tersimpan live</p>
            </div>

            <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                <span>Kendala / Terkunci</span>
                <WifiOff className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-700 mt-1">{stats.networkIssue}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Siap di-Reset Login</p>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                <span>Sudah Selesai</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-1">{stats.completed}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Jawaban terkumpul</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-xs col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-xs text-gray-600 font-bold">
                <span>Belum Mulai</span>
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-black text-gray-700 mt-1">{stats.notStarted}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Belum input token</p>
            </div>
          </div>

          {/* Main Monitoring Table Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="p-5 bg-slate-50 border-b border-gray-200 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-gray-900">
                      Tabel Monitoring Real-Time: {selectedTask.title}
                    </h2>
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-md">
                      Kelas {selectedTask.class?.name}
                    </span>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md border border-emerald-300">
                      KKM: {selectedTask.kkm !== undefined && selectedTask.kkm !== null ? selectedTask.kkm : 75}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Pembaruan terakhir: <strong>{lastRefreshedAt.toLocaleTimeString('id-ID')} WIB</strong> • Jawaban siswa otomatis tersimpan setiap kali memilih/mengetik jawaban.
                  </p>
                </div>

                {/* Bulk Actions for Teacher */}
                <div className="flex flex-wrap items-center gap-2">
                  {stats.inProgress > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleResetLoginAllTroubled}
                        disabled={actionLoadingId === 'RESET_LOGIN_ALL'}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        title="Buka kunci sesi semua siswa yang terkendala jaringan tanpa menghapus jawaban"
                      >
                        {actionLoadingId === 'RESET_LOGIN_ALL' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                        Reset Login Semua yang Aktif ({stats.inProgress})
                      </button>

                      <button
                        type="button"
                        onClick={handleForceFinishAllInProgress}
                        disabled={actionLoadingId === 'FINISH_ALL'}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        title="Selesaikan ujian untuk semua siswa yang sedang mengerjakan namun lupa klik kumpulkan"
                      >
                        {actionLoadingId === 'FINISH_ALL' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileCheck className="w-3.5 h-3.5" />
                        )}
                        Selesaikan Semua yang Sedang Ujian ({stats.inProgress})
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="Unduh rekapitulasi nilai dan status pengerjaan siswa dalam format file Excel (.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download (Excel)
                  </button>

                  <Link
                    to="/dashboard/laporan"
                    className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                  >
                    Lihat Laporan Nilai →
                  </Link>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Cari nama siswa atau NISN..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: 'ALL', label: `Semua (${stats.total})` },
                    { id: 'IN_PROGRESS', label: `Sedang Ujian (${stats.inProgress})` },
                    { id: 'NETWORK_ISSUE', label: `Kendala Jaringan (${stats.networkIssue})` },
                    { id: 'COMPLETED', label: `Selesai (${stats.completed})` },
                    { id: 'NOT_STARTED', label: `Belum Mulai (${stats.notStarted})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                        statusFilter === tab.id
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Monitoring Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 border-collapse">
                <thead className="bg-gray-100/80 text-gray-700 text-[11px] uppercase font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 w-10">No</th>
                    <th className="px-3 py-2">Nama Siswa & NISN</th>
                    <th className="px-3 py-2">Status Sesi & Jaringan</th>
                    <th className="px-3 py-2">Progres Soal Tersimpan</th>
                    <th className="px-3 py-2" title="Hitungan pelanggaran terakumulasi selama siswa melaksanakan ujian tanpa dibatasi waktu">
                      Pelanggaran Selama Ujian
                    </th>
                    <th className="px-3 py-2 text-right">Aksi Kendali Guru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingRows ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5 text-indigo-600" />
                        Memuat data monitoring siswa...
                      </td>
                    </tr>
                  ) : filteredMonitoringRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-xs">
                        Tidak ada siswa yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredMonitoringRows.map((item, idx) => {
                      const st = item.student;
                      const sub = item.submission;
                      const mState = getStudentMonitoringState(item);
                      const resetCount = Number(sub?.login_reset_count || 0);

                      return (
                        <tr
                          key={st.id}
                          className={`transition ${
                            mState.hasNetworkIssue
                              ? 'bg-amber-50/40 hover:bg-amber-50/70'
                              : mState.isInProgress
                              ? 'bg-blue-50/20 hover:bg-blue-50/40'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-3 py-2.5 font-semibold text-gray-500 text-xs">{idx + 1}</td>

                          {/* Student Name & NISN */}
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-gray-900 text-xs sm:text-sm">{st.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-500 font-mono">NISN: {st.username}</span>
                              {resetCount > 0 && (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold">
                                  Reset Login {resetCount}x
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Session & Network Status */}
                          <td className="px-3 py-2.5">
                            {mState.code === 'NOT_STARTED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md">
                                <Clock className="w-3 h-3 text-gray-400" />
                                Belum Mulai
                              </span>
                            )}

                            {mState.code === 'IN_PROGRESS' && (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
                                  <Wifi className="w-3 h-3 text-emerald-600 animate-pulse" />
                                  Sedang Mengerjakan • Online
                                </span>
                              </div>
                            )}

                            {mState.code === 'NETWORK_ISSUE' && (
                              <div className="space-y-0.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md border ${
                                  st.is_exam_locked || mState.violationCount >= 3
                                    ? 'bg-red-100 text-red-900 border-red-300'
                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                }`}>
                                  <Lock className="w-3 h-3 text-red-600" />
                                  {st.is_exam_locked || mState.violationCount >= 3
                                    ? '🚨 Terkunci (3x Pelanggaran)'
                                    : mState.isLocked
                                    ? 'Sesi Terkunci / Pindah HP'
                                    : 'Indikasi Kendala Jaringan'}
                                </span>
                                <p className="text-[10px] text-amber-800">
                                  Klik <strong>Reset Login</strong> agar siswa bisa lanjut tanpa hilang jawaban
                                </p>
                              </div>
                            )}

                            {mState.code === 'COMPLETED' && (
                              <div className="space-y-0.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md ${
                                  sub?.score !== null && sub?.score !== undefined && sub.score >= (selectedTask?.kkm || 75)
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Selesai • Nilai: {sub?.score !== null && sub?.score !== undefined ? `${sub.score} (${sub.score >= (selectedTask?.kkm || 75) ? 'Tuntas' : 'Remedial'})` : 'Menunggu'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Answered Questions Progress */}
                          <td className="px-3 py-2.5 min-w-[170px]">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-gray-800 text-[11px]">
                                {mState.answeredCount} / {mState.totalQuestions} Soal
                              </span>
                              <span className="font-bold text-indigo-700 text-[11px]">{mState.progressPercent}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  mState.isCompleted
                                    ? 'bg-emerald-500'
                                    : mState.answeredCount > 0
                                    ? 'bg-indigo-600'
                                    : 'bg-gray-300'
                                }`}
                                style={{ width: `${mState.progressPercent}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {mState.answeredCount > 0
                                ? `☁️ ${mState.answeredCount} jawaban tersimpan aman`
                                : 'Belum ada soal dijawab'}
                            </p>
                          </td>

                          {/* Violations & Last Activity */}
                          <td className="px-3 py-2.5">
                            <div className="space-y-0.5">
                              {mState.violationCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setViolationLogsModalItem(item)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-md border border-red-200 transition"
                                  title="Klik untuk melihat riwayat jam pelanggaran anti-curang"
                                >
                                  <ShieldAlert className="w-3 h-3 text-red-600" />
                                  <span>{mState.violationCount}x Keluar Aplikasi</span>
                                  {mState.isLocked && (
                                    <span className="px-1 py-0.2 bg-red-700 text-white rounded text-[9px] uppercase font-black tracking-wider">
                                      Terkunci
                                    </span>
                                  )}
                                </button>
                              ) : sub ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  0 Pelanggaran
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                              {mState.lastActiveText !== '-' && mState.lastActiveText !== 'Belum masuk ujian' && (
                                <div className="text-[10px] text-gray-500 font-medium">
                                  Pukul: {mState.lastActiveText}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Teacher Actions: Reset Login & Selesaikan Ujian */}
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Reset Login (keeps answers safe!) */}
                              <button
                                type="button"
                                onClick={() => handleResetStudentLogin(item)}
                                disabled={actionLoadingId === `reset_login_${st.id}`}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 border ${
                                  mState.isLocked || mState.hasNetworkIssue
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                                } disabled:opacity-50`}
                                title="Reset Login karena kendala jaringan / pindah HP / terkunci pelanggaran (Soal yang sudah dikerjakan TIDAK hilang)"
                              >
                                {actionLoadingId === `reset_login_${st.id}` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Unlock className="w-3.5 h-3.5" />
                                )}
                                Reset Login
                              </button>

                              {/* Selesaikan Ujian (for students who forgot to finish) */}
                              {!mState.isCompleted && (
                                <button
                                  type="button"
                                  onClick={() => handleForceFinishStudentExam(item)}
                                  disabled={actionLoadingId === `finish_${st.id}`}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                                    mState.isInProgress
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  } disabled:opacity-50`}
                                  title="Selesaikan ujian siswa jika siswa lupa menekan tombol kumpulkan"
                                >
                                  {actionLoadingId === `finish_${st.id}` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                  Selesaikan Ujian
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Violation Logs Modal for Supervisor */}
      {violationLogsModalItem && selectedTask && (() => {
        const st = violationLogsModalItem.student;
        const sub = violationLogsModalItem.submission;
        const mState = getStudentMonitoringState(violationLogsModalItem);
        const logs = Array.isArray(sub?.violation_logs) ? sub.violation_logs : [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-200">
              <div className="p-5 bg-gradient-to-r from-red-900 to-slate-900 text-white flex items-start justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 bg-red-500/30 border border-red-400/40 text-red-200 text-[11px] font-bold rounded-md">
                    Catatan Pelanggaran Pengawas Ujian
                  </span>
                  <h3 className="text-lg font-bold mt-1">{st.name}</h3>
                  <p className="text-xs text-red-200">
                    NISN: {st.username} • Total Pelanggaran: <strong>{mState.violationCount}x Keluar Aplikasi</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViolationLogsModalItem(null)}
                  className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
                {mState.isLocked && (
                  <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      Status Akun: TERKUNCI (Melebihi Toleransi)
                    </p>
                    <p className="mt-1 text-[11px] text-red-700">
                      Siswa telah otomatis dilogout dari ujian dan tidak dapat masuk kembali sebelum Anda menekan tombol <strong>Reset Login</strong> di bawah.
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-gray-900 text-xs mb-2">
                    Riwayat Jam Keluar Aplikasi / Pindah Layar ({logs.length} Kejadian Tercatat):
                  </h4>
                  {logs.length === 0 ? (
                    <p className="text-gray-400 italic py-2">Belum ada catatan pelanggaran tersimpan.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto border border-gray-200 rounded-xl p-2.5 bg-gray-50">
                      {logs.map((log: any, i: number) => (
                        <div key={i} className="p-2 bg-white rounded-lg border border-gray-200 flex items-start justify-between gap-2">
                          <span className="font-mono font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded text-[11px]">
                            {log.time}
                          </span>
                          <span className="text-gray-700 text-right flex-1">{log.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 space-y-1">
                  <p className="font-bold">Apakah ingin membuka kunci siswa ini?</p>
                  <p className="text-indigo-800 text-[11px]">
                    Tekan <strong>Reset Login</strong> untuk mengizinkan siswa masuk kembali ke ujian. Seluruh <strong>{mState.answeredCount} jawaban</strong> yang telah dikerjakan siswa tetap tersimpan aman.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setViolationLogsModalItem(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleResetStudentLogin(violationLogsModalItem);
                    setViolationLogsModalItem(null);
                  }}
                  disabled={actionLoadingId === `reset_login_${st.id}`}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Unlock className="w-3.5 h-3.5" /> Buka Kunci / Reset Login
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
