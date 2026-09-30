import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import {
  BookOpen, CheckCircle2, Clock, Search, Send, Loader2, X, Lock,
  KeyRound, ShieldAlert, ShieldCheck, Volume2, VolumeX, Maximize2, AlertTriangle
} from 'lucide-react';
import SiswaMateri from './SiswaMateri';
import SiswaNilai from './SiswaNilai';
import { verifyTaskToken, getTokenTimeRemaining, antiCheatAlarm } from '../../lib/examToken';

interface ViolationLog {
  time: string;
  reason: string;
}

function SiswaTugas() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Token verification modal state
  const [pendingTokenTask, setPendingTokenTask] = useState<any | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [testingAlarm, setTestingAlarm] = useState(false);

  // Active exam & Anti-cheat state
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [violationCount, setViolationCount] = useState<number>(0);
  const [violationLogs, setViolationLogs] = useState<ViolationLog[]>([]);
  const [alarmActive, setAlarmActive] = useState<boolean>(false);
  const [latestViolationReason, setLatestViolationReason] = useState<string>('');
  const [copyWarning, setCopyWarning] = useState<string | null>(null);

  const lastViolationTimestampRef = useRef<number>(0);
  const hadFullscreenRef = useRef<boolean>(false);

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
    };
  }, []);

  const triggerViolation = useCallback((reason: string) => {
    const now = Date.now();
    // Debounce rapid simultaneous blur + visibilitychange within 1.2s
    if (now - lastViolationTimestampRef.current < 1200) return;
    lastViolationTimestampRef.current = now;

    const timeStr = new Date(now).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    setViolationCount(prev => prev + 1);
    setViolationLogs(prev => [{ time: timeStr, reason }, ...prev]);
    setLatestViolationReason(reason);
    setAlarmActive(true);

    // Sound loud Web Audio API alarm + voice synthesis warning
    antiCheatAlarm.startAlarm();

    // Send browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🚨 PERINGATAN UJIAN SMAN 21 GARUT!', {
          body: `${reason}. Segera kembali ke aplikasi ujian!`,
          requireInteraction: true
        });
      } catch {
        // Ignore notification errors in restricted contexts
      }
    }
  }, []);

  // Anti-open-other-app listeners while activeTask is open
  useEffect(() => {
    if (!activeTask) {
      antiCheatAlarm.stopAlarm();
      setAlarmActive(false);
      hadFullscreenRef.current = false;
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('Terdeteksi berpindah tab atau membuka aplikasi lain di luar halaman ujian');
      }
    };

    const handleWindowBlur = () => {
      triggerViolation('Terdeteksi keluar dari fokus aplikasi ujian (Membuka aplikasi / jendela lain)');
    };

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        hadFullscreenRef.current = true;
      } else if (hadFullscreenRef.current) {
        triggerViolation('Terdeteksi keluar dari mode layar penuh (Fullscreen) saat mengerjakan soal');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'p', 'u'].includes(e.key.toLowerCase())) ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        setCopyWarning('Fitur salin/tempel & pintasan sistem dinonaktifkan selama ujian berlangsung.');
        setTimeout(() => setCopyWarning(null), 3000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTask, triggerViolation]);

  async function fetchStudentTasks() {
    if (!user) return;

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
        subData.forEach(s => { subMap[s.task_id] = s; });
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

  const openTaskModal = (task: any) => {
    if (isTaskLocked(task)) {
      const pubTime = getTaskPublishTime(task);
      const formatted = pubTime ? new Date(pubTime).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : '';
      alert(`Mohon maaf, tugas ini belum dapat dibuka karena baru dijadwalkan terbit pada: ${formatted} WIB.`);
      return;
    }
    // Open Token Verification Modal first
    setPendingTokenTask(task);
    setTokenInput('');
    setTokenError(null);
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

  const handleVerifyTokenAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTokenTask) return;

    antiCheatAlarm.stopAlarm();
    setTestingAlarm(false);

    const isValid = verifyTaskToken(pendingTokenTask.id, tokenInput, Date.now());
    if (!isValid) {
      setTokenError(
        'Token tidak valid atau sudah kedaluwarsa! Ingat bahwa token berubah otomatis setiap 30 menit. Silakan minta token terbaru kepada Guru Anda.'
      );
      return;
    }

    // Request browser notification permission for anti-cheat alerts
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // Ignore if blocked
      }
    }

    // Enter fullscreen if supported
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        hadFullscreenRef.current = true;
      }
    } catch {
      // Fullscreen might be restricted by iframe policy; blur & visibilitychange still work
    }

    const taskToStart = pendingTokenTask;
    setPendingTokenTask(null);
    setTokenInput('');
    setTokenError(null);
    setAnswers({});
    setViolationCount(0);
    setViolationLogs([]);
    setAlarmActive(false);
    lastViolationTimestampRef.current = Date.now();
    setActiveTask(taskToStart);
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

  const handleCloseExam = () => {
    if (!confirm('Apakah Anda yakin ingin keluar dari pengerjaan soal? Jawaban yang belum dikumpulkan akan hilang.')) {
      return;
    }
    antiCheatAlarm.stopAlarm();
    setAlarmActive(false);
    setActiveTask(null);
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleAnswerChange = (questionIndex: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: value }));
  };

  const handleSubmitTask = async () => {
    if (!activeTask || !user) return;

    const questions = Array.isArray(activeTask.content) ? activeTask.content : [];
    if (questions.length > 0 && Object.keys(answers).length < questions.length) {
      if (!confirm('Masih ada soal yang belum dijawab. Yakin ingin mengumpulkan tugas sekarang?')) return;
    }

    setSubmitting(true);
    antiCheatAlarm.stopAlarm();
    setAlarmActive(false);

    try {
      let totalQuestions = questions.length;
      let pointsPerQuestion = totalQuestions > 0 ? 100 / totalQuestions : 0;
      let calculatedScore = 0;
      let hasEssay = false;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const ans = answers[i] || '';

        if (q.type === 'pg') {
          const isCorrect = String(ans).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
          if (isCorrect) {
            calculatedScore += pointsPerQuestion;
          }
        } else if (q.type === 'essay') {
          hasEssay = true;
        }
      }

      const finalScore = hasEssay ? null : Math.round(calculatedScore);
      const finalStatus = hasEssay ? 'submitted' : 'graded';
      const antiCheatSummary =
        violationCount > 0
          ? ` [Catatan Pengawas Anti-Curang: Terdeteksi ${violationCount}x membuka aplikasi/tab lain saat ujian]`
          : ' [Pengawas Ujian: Jujur / 0 Pelanggaran]';

      const baseFeedback = hasEssay
        ? 'Jawaban esai dikumpulkan dan sedang menunggu kaji ulang guru.'
        : `Skor Pilihan Ganda Otomatis: ${Math.round(calculatedScore)}`;

      const { error } = await supabase.from('task_submissions').insert([{
        task_id: activeTask.id,
        student_id: user.id,
        answers: answers,
        score: finalScore,
        status: finalStatus,
        feedback: baseFeedback + antiCheatSummary
      }]);

      if (error) throw error;

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      alert(
        hasEssay
          ? 'Tugas berhasil dikumpulkan! Jawaban esai Anda akan diperiksa oleh guru.'
          : `Tugas selesai! Nilai Pilihan Ganda Anda: ${Math.round(calculatedScore)}/100`
      );

      setActiveTask(null);
      fetchStudentTasks();
    } catch (err: any) {
      alert('Gagal mengumpulkan tugas: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter(t =>
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
            Siapkan <strong>Token Soal</strong> dari Guru Anda (token berganti setiap 30 menit) sebelum mulai mengerjakan.
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
          {filteredTasks.map((task) => {
            const sub = submissions[task.id];
            const isCompleted = !!sub;
            const pubTime = getTaskPublishTime(task);
            const isLocked = isTaskLocked(task);

            return (
              <div key={task.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-300 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${
                        isCompleted ? 'bg-green-50 text-green-600' : isLocked ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{task.title}</h3>
                        <p className="text-sm text-gray-500">{task.subject_name || 'Mata Pelajaran'}</p>
                      </div>
                    </div>

                    {isCompleted ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-md flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Selesai
                      </span>
                    ) : isLocked ? (
                      <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-md flex items-center border border-amber-300">
                        <Lock className="w-3 h-3 mr-1 text-amber-700" /> Terjadwal
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-800 text-xs font-bold rounded-md border border-indigo-200 flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-indigo-600" /> Wajib Token
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm mb-3 capitalize">
                    Jenis Soal: {task.type === 'pg' ? 'Pilihan Ganda' : task.type === 'essay' ? 'Esai' : 'Campuran'} · Jumlah: {task.content?.length || 0} Soal
                  </p>

                  {!isCompleted && !isLocked && (
                    <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        Anti-Buka Aplikasi Lain & Token 30 Menit
                      </span>
                      <span className="font-mono font-bold text-indigo-700">
                        {tokenTimer.formatted}
                      </span>
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

      {/* Token Verification & Anti-Cheat Rules Modal */}
      {pendingTokenTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200">
            <div className="p-6 bg-gradient-to-r from-indigo-900 to-blue-900 text-white flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" /> Verifikasi Token Ujian
                </span>
                <h3 className="text-lg font-bold mt-1">{pendingTokenTask.title}</h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  {pendingTokenTask.subject_name} · {pendingTokenTask.content?.length || 0} Butir Soal
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
              {/* Anti-cheat rules notice */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs text-red-900">
                <div className="font-bold flex items-center gap-1.5 text-red-800">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  Peraturan Pengawas Ujian (Anti-Buka Aplikasi Lain)
                </div>
                <ul className="list-disc pl-4 space-y-1 text-red-800/90 leading-relaxed">
                  <li>Selama mengerjakan soal, Anda <strong>dilarang berpindah tab atau membuka aplikasi lain</strong>.</li>
                  <li>Jika membuka aplikasi lain, sistem akan otomatis membunyikan <strong>Alarm Peringatan Keras</strong>, menampilkan notifikasi pelanggaran, dan mencatatnya ke laporan Guru.</li>
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

              {tokenError && (
                <div className="p-3 bg-red-100 border border-red-300 text-red-900 rounded-xl text-xs font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{tokenError}</span>
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
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-sm"
                >
                  <KeyRound className="w-4 h-4" /> Verifikasi & Mulai Ujian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Answering Modal (Protected Exam Mode) */}
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
            {/* Top Security & Header Bar */}
            <div className="p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold rounded-md flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Pengawas Anti-Buka Aplikasi Lain Aktif
                  </span>
                  {violationCount > 0 && (
                    <span className="px-2.5 py-0.5 bg-red-600 text-white text-[11px] font-extrabold rounded-md flex items-center gap-1 animate-pulse">
                      <ShieldAlert className="w-3.5 h-3.5" /> Pelanggaran Terdeteksi: {violationCount}x
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mt-1">{activeTask.title}</h3>
                <p className="text-xs text-indigo-200">
                  Mata Pelajaran: {activeTask.subject_name} · Jangan berpindah aplikasi/tab hingga selesai mengumpulkan tugas
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
                  title="Keluar Ujian"
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
              {activeTask.content?.map((q: any, idx: number) => (
                <div key={idx} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
                      Soal #{idx + 1} ({q.type === 'pg' ? 'Pilihan Ganda' : 'Esai'})
                    </span>
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
                              isSelected ? 'bg-blue-50 border-blue-500 font-bold text-blue-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
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
              ))}

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
                Terjawab: <strong>{Object.keys(answers).length}</strong> dari <strong>{activeTask.content?.length || 0}</strong> soal
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseExam}
                  className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-200 rounded-xl text-sm transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmitTask}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-700 transition flex items-center disabled:opacity-50 shadow-md shadow-blue-200"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {submitting ? 'Mengumpulkan...' : 'Kumpulkan Tugas'}
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
                  🚨 ALARM PENGAWAS UJIAN BERBUNYI
                </span>

                <h2 className="text-2xl sm:text-3xl font-black text-white max-w-xl">
                  PERINGATAN! DILARANG MEMBUKA APLIKASI LAIN!
                </h2>

                <p className="text-red-200 text-sm sm:text-base max-w-lg mt-2 leading-relaxed">
                  {latestViolationReason || 'Sistem mendeteksi Anda keluar dari halaman ujian atau membuka aplikasi lain.'}
                </p>

                <div className="my-5 p-4 bg-red-900/80 border border-red-500/60 rounded-2xl max-w-md w-full text-left space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                    <span>Total Pelanggaran Tercatat:</span>
                    <span className="text-base font-black text-white bg-red-600 px-2.5 py-0.5 rounded-md">
                      {violationCount} Kali
                    </span>
                  </div>
                  <p className="text-xs text-red-100 leading-relaxed">
                    Setiap aktivitas membuka aplikasi lain dicatat secara otomatis dan dilampirkan pada hasil pengumpulan ujian Anda kepada Guru.
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
