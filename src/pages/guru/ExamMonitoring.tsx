import React, { useState, useEffect, useCallback } from 'react';
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
  FileCheck
} from 'lucide-react';
import { generateTaskToken, getTokenTimeRemaining } from '../../lib/examToken';
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
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [taskClassFilter, setTaskClassFilter] = useState<string>('ALL');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Action loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [detailModalItem, setDetailModalItem] = useState<any | null>(null);
  const [syncingSchema, setSyncingSchema] = useState<boolean>(false);

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
    async (taskToLoad: any, silent: boolean = false) => {
      if (!taskToLoad || !supabase) return;
      if (!silent) setLoadingRows(true);

      try {
        // 1. Fetch all students in the task's class
        const { data: classStudents } = await supabase
          .from('class_students')
          .select('student:users!student_id(id, name, username, status, active_session_token, last_login_at)')
          .eq('class_id', taskToLoad.class_id);

        // 2. Fetch all submissions (including in_progress) for this task
        const { data: subs } = await supabase
          .from('task_submissions')
          .select('*')
          .eq('task_id', taskToLoad.id);

        const subMap: Record<string, any> = {};
        if (subs) {
          subs.forEach((s: any) => {
            subMap[s.student_id] = s;
          });
        }

        const studentsList = (classStudents || [])
          .map((cs: any) => cs.student)
          .filter(Boolean);

        const combined = studentsList.map((st: any) => ({
          student: st,
          submission: subMap[st.id] || null
        }));

        setMonitoringRows(combined);
        setLastRefreshedAt(new Date());

        // Keep detail modal fresh if open
        setDetailModalItem((prev: any) => {
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
      fetchMonitoringData(selectedTask, false);
    }
  }, [selectedTask, fetchMonitoringData]);

  // Auto-refresh every 5 seconds + Supabase Realtime channel subscription
  useEffect(() => {
    if (!selectedTask || !supabase) return;

    let intervalId: number | undefined;
    if (autoRefresh) {
      intervalId = window.setInterval(() => {
        fetchMonitoringData(selectedTask, true);
      }, 5000);
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
          fetchMonitoringData(selectedTask, true);
        }
      )
      .subscribe();

    return () => {
      if (intervalId) clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [selectedTask, autoRefresh, fetchMonitoringData]);

  // Helper to classify student exam state
  const getStudentMonitoringState = (item: any) => {
    const sub = item.submission;
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
    const isLocked = Boolean(sub.is_locked);

    const lastActiveStr = sub.last_active_at || sub.updated_at || sub.created_at;
    const lastActiveMs = lastActiveStr ? new Date(lastActiveStr).getTime() : 0;
    const diffSec = lastActiveMs > 0 ? Math.max(0, Math.floor((nowMs - lastActiveMs) / 1000)) : 9999;

    const isOnline = isInProgress && !isLocked && diffSec <= 60;
    const hasNetworkIssue = isInProgress && (isLocked || diffSec > 60);

    let lastActiveText = '-';
    if (lastActiveMs > 0) {
      if (diffSec < 15) lastActiveText = 'Baru saja (Aktif)';
      else if (diffSec < 60) lastActiveText = `${diffSec} dtk lalu`;
      else if (diffSec < 3600) lastActiveText = `${Math.floor(diffSec / 60)} mnt lalu`;
      else lastActiveText = new Date(lastActiveMs).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }

    const violationCount = Number(sub.violation_count || 0);
    const violationLogs = Array.isArray(sub.violation_logs) ? sub.violation_logs : [];

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
        label: 'Sesi Terkunci • Butuh Reset Login',
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
      setDetailModalItem(null);
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

  const filteredTasks = tasks.filter(t =>
    taskClassFilter === 'ALL' ? true : t.class?.name === taskClassFilter
  );

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
            <h1 className="text-2xl font-bold tracking-tight">Monitoring Ujian & Kendali Sesi Siswa</h1>
            <p className="text-indigo-200 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
              Pantau progres pengerjaan soal siswa secara langsung, bantu <strong>Selesaikan Ujian</strong> jika siswa lupa menekan tombol kumpul, atau lakukan <strong>Reset Login</strong> saat siswa mengalami kendala jaringan tanpa menghilangkan soal yang sudah dikerjakan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                autoRefresh
                  ? 'bg-emerald-600/30 border-emerald-400/50 text-emerald-200'
                  : 'bg-white/10 border-white/20 text-gray-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-gray-400'}`} />
              Auto-Refresh 5 dtk: {autoRefresh ? 'ON' : 'OFF'}
            </button>

            {selectedTask && (
              <button
                type="button"
                onClick={() => fetchMonitoringData(selectedTask, false)}
                disabled={loadingRows}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRows ? 'animate-spin' : ''}`} />
                Segarkan Sekarang
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Select Exam / Task Section */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Pilih Paket Soal / Ujian yang Dipantau</h2>
            <p className="text-xs text-gray-500">
              Menampilkan daftar paket soal yang dibuat oleh akun Anda ({tasks.length} paket soal).
            </p>
          </div>

          {uniqueTaskClasses.length > 1 && (
            <select
              value={taskClassFilter}
              onChange={e => setTaskClassFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700"
            >
              <option value="ALL">Semua Kelas ({uniqueTaskClasses.length})</option>
              {uniqueTaskClasses.map((cls: any, i: number) => (
                <option key={i} value={cls}>Kelas {cls}</option>
              ))}
            </select>
          )}
        </div>

        {loadingTasks ? (
          <div className="py-8 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Memuat daftar paket soal...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-2">
            <p className="text-sm font-semibold text-gray-700">Belum ada paket soal ujian yang diterbitkan.</p>
            <Link
              to="/dashboard/soal"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
            >
              Buat Soal Sekarang →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-3.5">
            {filteredTasks.map(task => {
              const isSelected = selectedTask?.id === task.id;
              const activeToken = generateTaskToken(task.id, nowMs);
              const qCount = Array.isArray(task.content) ? task.content.length : 0;

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
                        Kelas {task.class?.name || '-'}
                      </span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(activeToken);
                          setCopiedTokenId(task.id);
                          setTimeout(() => setCopiedTokenId(null), 2000);
                        }}
                        className="px-2 py-0.5 bg-indigo-900 text-white rounded text-[11px] font-mono font-bold flex items-center gap-1 hover:bg-indigo-800 transition"
                        title="Salin Token Ujian Aktif"
                      >
                        <KeyRound className="w-3 h-3 text-amber-300" />
                        {activeToken}
                        {copiedTokenId === task.id ? (
                          <Check className="w-3 h-3 text-emerald-300" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-indigo-200" />
                        )}
                      </button>
                    </div>

                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{task.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {task.subject_name} · {qCount} Soal
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span>Reset token: {tokenTimer.formatted}</span>
                    <span className={`font-bold ${isSelected ? 'text-indigo-700' : 'text-gray-400'}`}>
                      {isSelected ? '● Sedang Dipantau' : 'Pantau →'}
                    </span>
                  </div>
                </div>
              );
            })}
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
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-100/80 text-gray-700 text-xs uppercase font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3.5 w-10">No</th>
                    <th className="px-4 py-3.5">Nama Siswa & NISN</th>
                    <th className="px-4 py-3.5">Status Sesi & Jaringan</th>
                    <th className="px-4 py-3.5">Progres Soal Tersimpan</th>
                    <th className="px-4 py-3.5">Pengawas & Aktivitas</th>
                    <th className="px-4 py-3.5 text-right">Aksi Kendali Guru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingRows ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                        Memuat data monitoring siswa...
                      </td>
                    </tr>
                  ) : filteredMonitoringRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-xs">
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
                          <td className="px-4 py-4 font-semibold text-gray-500 text-xs">{idx + 1}</td>

                          {/* Student Name & NISN */}
                          <td className="px-4 py-4">
                            <div className="font-bold text-gray-900">{st.name}</div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-500 font-mono">NISN: {st.username}</span>
                              {resetCount > 0 && (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold">
                                  Reset Login {resetCount}x
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Session & Network Status */}
                          <td className="px-4 py-4">
                            {mState.code === 'NOT_STARTED' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                Belum Mulai
                              </span>
                            )}

                            {mState.code === 'IN_PROGRESS' && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg">
                                  <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                                  Sedang Mengerjakan • Online
                                </span>
                              </div>
                            )}

                            {mState.code === 'NETWORK_ISSUE' && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg">
                                  {mState.isLocked ? (
                                    <Lock className="w-3.5 h-3.5 text-red-600" />
                                  ) : (
                                    <WifiOff className="w-3.5 h-3.5 text-amber-700" />
                                  )}
                                  {mState.isLocked ? 'Sesi Terkunci / Pindah HP' : 'Indikasi Kendala Jaringan'}
                                </span>
                                <p className="text-[11px] text-amber-800">
                                  Klik <strong>Reset Login</strong> agar siswa bisa lanjut tanpa hilang jawaban
                                </p>
                              </div>
                            )}

                            {mState.code === 'COMPLETED' && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Selesai • Nilai: {sub?.score !== null && sub?.score !== undefined ? sub.score : 'Menunggu'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Answered Questions Progress */}
                          <td className="px-4 py-4 min-w-[190px]">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-gray-800">
                                {mState.answeredCount} / {mState.totalQuestions} Soal
                              </span>
                              <span className="font-bold text-indigo-700">{mState.progressPercent}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
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
                            <p className="text-[11px] text-gray-500 mt-1">
                              {mState.answeredCount > 0
                                ? `☁️ ${mState.answeredCount} jawaban tersimpan aman`
                                : 'Belum ada soal dijawab'}
                            </p>
                          </td>

                          {/* Violations & Last Activity */}
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              {mState.violationCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded-md">
                                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                                  {mState.violationCount}x Keluar Aplikasi
                                </span>
                              ) : sub ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  0 Pelanggaran
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                              <div className="text-[11px] text-gray-500">
                                Aktivitas: <strong>{mState.lastActiveText}</strong>
                              </div>
                            </div>
                          </td>

                          {/* Teacher Actions: Reset Login & Selesaikan Ujian */}
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Reset Login (keeps answers safe!) */}
                              <button
                                type="button"
                                onClick={() => handleResetStudentLogin(item)}
                                disabled={actionLoadingId === `reset_login_${st.id}`}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 border ${
                                  mState.hasNetworkIssue
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                                } disabled:opacity-50`}
                                title="Reset Login karena kendala jaringan / pindah HP (Soal yang sudah dikerjakan TIDAK hilang)"
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

                              {/* Detail Progress Modal */}
                              <button
                                type="button"
                                onClick={() => setDetailModalItem(item)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition flex items-center gap-1"
                                title="Lihat detail jawaban tersimpan & log aktivitas siswa"
                              >
                                <Eye className="w-3.5 h-3.5" /> Detail
                              </button>
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

      {/* Student Live Progress & Control Modal */}
      {detailModalItem && selectedTask && (() => {
        const st = detailModalItem.student;
        const sub = detailModalItem.submission;
        const mState = getStudentMonitoringState(detailModalItem);
        const savedAnswers = normalizeAndMergeAnswers(sub?.answers, null);
        const questions = Array.isArray(selectedTask.content) ? selectedTask.content : [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-200">
              <div className="p-5 bg-slate-900 text-white flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[11px] font-bold rounded-md">
                      Detail Monitoring Siswa
                    </span>
                    <span className="text-xs text-emerald-300 font-semibold">
                      {mState.answeredCount} dari {mState.totalQuestions} Soal Terjawab ({mState.progressPercent}%)
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mt-1">{st.name}</h3>
                  <p className="text-xs text-slate-300">
                    NISN: {st.username} • Status: {mState.label} • Aktivitas terakhir: {mState.lastActiveText}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailModalItem(null)}
                  className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* Quick Action Banner inside Modal */}
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-indigo-950 space-y-0.5">
                    <p className="font-bold">Kendali Cepat Sesi Ujian Siswa:</p>
                    <p className="text-indigo-800">
                      • <strong>Reset Login</strong>: Membuka kunci login saat siswa kendala jaringan, <strong>jawaban yang sudah dikerjakan tetap aman</strong>.<br />
                      • <strong>Selesaikan Ujian</strong>: Mengumpulkan dan menilai ujian jika siswa lupa menekan selesai.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResetStudentLogin(detailModalItem)}
                      disabled={actionLoadingId === `reset_login_${st.id}`}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Reset Login
                    </button>
                    {!mState.isCompleted && (
                      <button
                        type="button"
                        onClick={() => handleForceFinishStudentExam(detailModalItem)}
                        disabled={actionLoadingId === `finish_${st.id}`}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" /> Selesaikan Ujian
                      </button>
                    )}
                  </div>
                </div>

                {/* Violation Logs if any */}
                {mState.violationLogs.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      Riwayat Pelanggaran Anti-Curang ({mState.violationCount}x)
                    </h4>
                    <div className="max-h-28 overflow-y-auto space-y-1 text-xs text-red-800">
                      {mState.violationLogs.map((v: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="font-mono font-bold">[{v.time}]</span>
                          <span>{v.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question Answer Grid / List */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 text-sm">
                    Pantauan Jawaban Siswa Real-Time ({mState.answeredCount}/{mState.totalQuestions} Terjawab)
                  </h4>

                  <div className="space-y-2.5">
                    {questions.map((q: any, idx: number) => {
                      const ans = savedAnswers[idx] ?? '';
                      const isAnswered = String(ans).trim() !== '';
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            isAnswered
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">Soal #{idx + 1}</span>
                              <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-semibold text-gray-600">
                                {q.type === 'pg' ? 'Pilihan Ganda' : 'Esai'}
                              </span>
                              {isAnswered ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                                  ✓ Terjawab & Tersimpan
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-semibold">
                                  Belum Dijawab
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 line-clamp-2">{q.question}</p>
                          </div>

                          <div className="sm:text-right shrink-0">
                            <span className="text-[11px] text-gray-500 block">Jawaban Siswa:</span>
                            <span className="font-bold text-gray-900">
                              {isAnswered ? String(ans) : '-'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
                <div>
                  {sub && (
                    <button
                      type="button"
                      onClick={() => handleFullResetFromZero(detailModalItem)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Hapus & Ulang dari 0
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDetailModalItem(null)}
                  className="px-5 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-xl text-xs font-bold transition"
                >
                  Tutup Detail
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
