import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { CheckSquare, Eye, Sparkles, Loader2, Save, X, CheckCircle2, Clock, AlertCircle, Download, KeyRound, RotateCcw, Edit2, Calculator, Activity, Unlock, Send } from 'lucide-react';
import { gradeEssayApi } from '../../lib/aiService';
import { generateTaskToken, getTokenTimeRemaining } from '../../lib/examToken';
import { countAnsweredQuestions, finishStudentExamByGuru, resetStudentLoginByGuru } from '../../lib/examMonitoring';

export default function GradeReports() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gradingModal, setGradingModal] = useState<any | null>(null);
  const [gradingScore, setGradingScore] = useState<number>(0);
  const [gradingFeedback, setGradingFeedback] = useState<string>('');
  const [gradingStatus, setGradingStatus] = useState<'graded' | 'submitted'>('graded');
  const [editingAnswers, setEditingAnswers] = useState<Record<number, string>>({});
  const [isEditingExamAnswers, setIsEditingExamAnswers] = useState<boolean>(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [aiGradingLoading, setAiGradingLoading] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [user]);

  async function fetchTasks() {
    if (!user) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('*, class:classes(name)')
      .eq('guru_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data.filter((t: any) => t.guru_id === user.id));
    } else {
      setTasks([]);
    }
  }

  async function handleSelectTask(task: any) {
    setSelectedTask(task);
    setLoading(true);

    // Fetch all students in the task's target class
    const { data: classStudents } = await supabase
      .from('class_students')
      .select('student:users!student_id(id, name, username)')
      .eq('class_id', task.class_id);

    // Fetch existing submissions for this task
    const { data: subs } = await supabase
      .from('task_submissions')
      .select('*')
      .eq('task_id', task.id);

    const subMap: Record<string, any> = {};
    if (subs) {
      subs.forEach(s => { subMap[s.student_id] = s; });
    }

    const studentsList = (classStudents || []).map((cs: any) => cs.student).filter(Boolean);

    const combined = studentsList.map(st => ({
      student: st,
      submission: subMap[st.id] || null
    }));

    setSubmissions(combined);
    setLoading(false);
  }

  const openGradingModal = (item: any, startInEditMode: boolean = false) => {
    const sub = item.submission;
    const rawAnswers = sub?.answers || {};
    const normalizedAnswers: Record<number, string> = {};
    Object.keys(rawAnswers).forEach(k => {
      normalizedAnswers[Number(k)] = String(rawAnswers[k] ?? '');
    });

    setGradingModal(item);
    setGradingScore(sub?.score ?? 0);
    setGradingFeedback(sub?.feedback || '');
    setGradingStatus(sub?.status === 'submitted' ? 'submitted' : 'graded');
    setEditingAnswers(normalizedAnswers);
    setIsEditingExamAnswers(startInEditMode);
  };

  const handleRecalculateFromEditedAnswers = () => {
    if (!selectedTask) return;
    const questions = Array.isArray(selectedTask.content) ? selectedTask.content : [];
    if (questions.length === 0) return;

    const pointsPerQuestion = 100 / questions.length;
    let calculatedScore = 0;

    questions.forEach((q: any, idx: number) => {
      if (q.type === 'pg') {
        const studentAns = editingAnswers[idx] || '';
        const isCorrect = String(studentAns).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
        if (isCorrect) {
          calculatedScore += pointsPerQuestion;
        }
      }
    });

    const rounded = Math.min(100, Math.round(calculatedScore));
    setGradingScore(rounded);
  };

  const handleResetStudentExam = async (item: any) => {
    const st = item.student;
    const sub = item.submission;
    if (!sub || !selectedTask) return;

    if (
      !confirm(
        `Apakah Anda yakin ingin MERESET ULANG DARI 0 hasil ujian siswa "${st.name}"?\n\nCatatan: Jika siswa hanya terkendala jaringan, gunakan tombol "Reset Login" agar jawaban yang sudah dikerjakan tidak hilang.\n\nLanjutkan hapus semua jawaban siswa ini?`
      )
    ) {
      return;
    }

    setResettingId(st.id);
    try {
      const { error } = await supabase
        .from('task_submissions')
        .delete()
        .eq('id', sub.id);

      if (error) throw error;

      if (gradingModal?.student?.id === st.id) {
        setGradingModal(null);
      }
      await handleSelectTask(selectedTask);
      alert(`✅ Hasil ujian siswa "${st.name}" berhasil direset ke 0. Siswa kini dapat mengerjakan ulang soal dari awal.`);
    } catch (err: any) {
      alert('Gagal mereset ujian siswa: ' + err.message);
    } finally {
      setResettingId(null);
    }
  };

  const handleResetLoginKeepAnswers = async (item: any) => {
    if (!selectedTask) return;
    const st = item.student;
    const sub = item.submission;
    const answeredCount = countAnsweredQuestions(sub?.answers);
    const totalQuestions = Array.isArray(selectedTask.content) ? selectedTask.content.length : 0;

    if (
      !confirm(
        `Reset Login untuk siswa "${st.name}"?\n\n✅ AMAN: ${answeredCount} dari ${totalQuestions} soal yang sudah dikerjakan TIDAK AKAN HILANG.\n🔓 Siswa dapat login kembali dan melanjutkan ujian.`
      )
    ) {
      return;
    }

    setResettingId(`login_${st.id}`);
    try {
      const { error } = await resetStudentLoginByGuru({
        taskId: selectedTask.id,
        studentId: st.id,
        existingSubmission: sub
      });
      if (error) throw error;
      await handleSelectTask(selectedTask);
      alert(`✅ Reset Login untuk "${st.name}" berhasil! ${answeredCount} jawaban siswa tetap tersimpan utuh.`);
    } catch (err: any) {
      alert('Gagal mereset login siswa: ' + err.message);
    } finally {
      setResettingId(null);
    }
  };

  const handleForceFinishExam = async (item: any) => {
    if (!selectedTask) return;
    const st = item.student;
    const sub = item.submission;
    const answeredCount = countAnsweredQuestions(sub?.answers);
    const totalQuestions = Array.isArray(selectedTask.content) ? selectedTask.content.length : 0;

    if (
      !confirm(
        `Selesaikan ujian untuk siswa "${st.name}" sekarang?\n\nSiswa telah menjawab ${answeredCount} dari ${totalQuestions} soal. Jawaban yang sudah dikerjakan akan langsung disimpan dan dinilai.`
      )
    ) {
      return;
    }

    setResettingId(`finish_${st.id}`);
    try {
      const { error } = await finishStudentExamByGuru({
        task: selectedTask,
        studentId: st.id,
        existingSubmission: sub
      });
      if (error) throw error;
      await handleSelectTask(selectedTask);
      alert(`✅ Ujian siswa "${st.name}" berhasil diselesaikan dan dinilai!`);
    } catch (err: any) {
      alert('Gagal menyelesaikan ujian siswa: ' + err.message);
    } finally {
      setResettingId(null);
    }
  };

  const handleResetAllClassExams = async () => {
    if (!selectedTask) return;
    const submittedCount = submissions.filter(s => s.submission).length;
    if (submittedCount === 0) {
      alert('Belum ada siswa yang mengumpulkan ujian pada tugas ini.');
      return;
    }

    if (
      !confirm(
        `PERINGATAN: Apakah Anda yakin ingin MERESET SEMUA hasil ujian (${submittedCount} siswa) pada tugas "${selectedTask.title}"?\n\nSemua siswa di kelas ini harus mengerjakan ulang dari awal.`
      )
    ) {
      return;
    }

    setResettingId('ALL');
    try {
      const { error } = await supabase
        .from('task_submissions')
        .delete()
        .eq('task_id', selectedTask.id);

      if (error) throw error;

      setGradingModal(null);
      await handleSelectTask(selectedTask);
      alert(`✅ Seluruh hasil ujian (${submittedCount} siswa) berhasil direset.`);
    } catch (err: any) {
      alert('Gagal mereset ujian kelas: ' + err.message);
    } finally {
      setResettingId(null);
    }
  };

  const handleAiAutoGrade = async () => {
    if (!gradingModal || !selectedTask) return;
    const questions = Array.isArray(selectedTask.content) ? selectedTask.content : [];
    const studentAnswers = editingAnswers;

    setAiGradingLoading(true);

    try {
      let totalQuestions = questions.length;
      if (totalQuestions === 0) return;

      let calculatedScore = 0;
      let pointsPerQuestion = 100 / totalQuestions;
      let feedbacks: string[] = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const studentAns = studentAnswers[i] || studentAnswers[String(i)] || '-';

        if (q.type === 'pg') {
          const isCorrect = String(studentAns).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
          if (isCorrect) {
            calculatedScore += pointsPerQuestion;
            feedbacks.push(`Soal #${i + 1} (PG): Benar (+${Math.round(pointsPerQuestion)} pkn)`);
          } else {
            feedbacks.push(`Soal #${i + 1} (PG): Salah (Jawaban siswa: ${studentAns}, Kunci: ${q.answer})`);
          }
        } else if (q.type === 'essay') {
          // Call AI Grading for Essay
          try {
            const data = await gradeEssayApi({
              question: q.question,
              answerKey: q.answerKey || q.answer || '',
              studentAnswer: studentAns
            });

            if (data && data.score !== undefined) {
              const essayScaledScore = (data.score / 100) * pointsPerQuestion;
              calculatedScore += essayScaledScore;
              feedbacks.push(`Soal #${i + 1} (Esai): ${data.score}/100 - ${data.feedback || ''}`);
            } else {
              feedbacks.push(`Soal #${i + 1} (Esai): Perlu pemeriksaan manual`);
            }
          } catch {
            feedbacks.push(`Soal #${i + 1} (Esai): Perlu pemeriksaan manual`);
          }
        }
      }

      const finalScore = Math.min(100, Math.round(calculatedScore));
      setGradingScore(finalScore);
      setGradingFeedback(`Koreksi Otomatis AI:\n` + feedbacks.join('\n'));

    } catch (err: any) {
      alert('Gagal koreksi AI: ' + err.message);
    } finally {
      setAiGradingLoading(false);
    }
  };

  const handleSaveGrade = async () => {
    if (!gradingModal || !selectedTask) return;
    const sub = gradingModal.submission;
    const st = gradingModal.student;

    setSavingGrade(true);
    try {
      if (sub) {
        const { error } = await supabase
          .from('task_submissions')
          .update({
            answers: editingAnswers,
            score: gradingScore,
            status: gradingStatus,
            feedback: gradingFeedback
          })
          .eq('id', sub.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('task_submissions')
          .insert([{
            task_id: selectedTask.id,
            student_id: st.id,
            answers: editingAnswers,
            score: gradingScore,
            status: gradingStatus,
            feedback: gradingFeedback || 'Diinput/diedit langsung oleh Guru.'
          }]);

        if (error) throw error;
      }

      alert('✅ Perubahan ujian, jawaban, dan nilai siswa berhasil disimpan!');
      setGradingModal(null);
      handleSelectTask(selectedTask); // Refresh list
    } catch (err: any) {
      alert('Gagal menyimpan perubahan ujian: ' + err.message);
    } finally {
      setSavingGrade(false);
    }
  };

  const handleDownloadReport = () => {
    if (!selectedTask || submissions.length === 0) {
      alert('Tidak ada data siswa untuk diunduh');
      return;
    }

    const taskKkm = Number(selectedTask?.kkm !== undefined && selectedTask?.kkm !== null ? selectedTask.kkm : 75);
    const headers = ['No', 'Nama', 'NISN', 'Nilai', 'KKM', 'Status Kelulusan', 'Status Pengerjaan'];
    const rows = submissions.map((item, idx) => {
      const st = item.student;
      const sub = item.submission;
      const scoreVal = sub && sub.score !== null ? sub.score : '-';
      const kelulusan =
        sub && sub.score !== null && sub.status !== 'in_progress'
          ? sub.score >= taskKkm
            ? 'Tuntas'
            : 'Remedial'
          : '-';
      const statusText = !sub ? 'Belum Mengumpulkan' : sub.status === 'graded' ? 'Sudah Dinilai' : sub.status === 'in_progress' ? 'Sedang Mengerjakan' : 'Sudah Mengumpulkan';
      return [
        idx + 1,
        `"${st.name ? st.name.replace(/"/g, '""') : ''}"`,
        `"${st.username ? st.username.replace(/"/g, '""') : ''}"`,
        scoreVal,
        taskKkm,
        `"${kelulusan}"`,
        `"${statusText}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const className = selectedTask.class?.name || 'Kelas';
    const taskTitle = (selectedTask.title || 'Tugas').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `Hasil_Siswa_${className}_${taskTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laporan Nilai & Koreksi AI</h1>
        <p className="text-gray-500">Pilih tugas terbit untuk melihat hasil pekerjaan siswa dan lakukan koreksi otomatis berbasis AI.</p>
      </div>

      {/* Select Task Section */}
      <div className="grid md:grid-cols-3 gap-4">
        {tasks.map(task => {
          const isSelected = selectedTask?.id === task.id;
          return (
            <div
              key={task.id}
              onClick={() => handleSelectTask(task)}
              className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                isSelected 
                  ? 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-500/20' 
                  : 'bg-white border-gray-200 hover:border-blue-300 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-md">
                    Kelas {task.class?.name || '-'}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1" title="Token Ujian Aktif (Berubah tiap 30 menit)">
                    <KeyRound className="w-3 h-3 text-indigo-600" />
                    {generateTaskToken(task.id, nowMs)} ({getTokenTimeRemaining(nowMs).formatted})
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-base mt-2">{task.title}</h3>
                <p className="text-xs text-gray-500">{task.subject_name}</p>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                <span>{new Date(task.created_at).toLocaleDateString('id-ID')}</span>
                <span className="font-bold text-blue-600">Pilih & Lihat →</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submissions Table */}
      {selectedTask && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Hasil Pekerjaan Siswa</h2>
                <span className="text-xs px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md border border-emerald-300">
                  KKM: {selectedTask.kkm !== undefined && selectedTask.kkm !== null ? selectedTask.kkm : 75}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Tugas: <span className="font-semibold text-gray-900">{selectedTask.title}</span> • Kelas {selectedTask.class?.name}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/dashboard/monitoring?taskId=${selectedTask.id}`}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5 text-indigo-600" />
                Buka Monitoring Ujian Live
              </Link>

              {submissions.some(s => s.submission) && (
                <button
                  type="button"
                  onClick={handleResetAllClassExams}
                  disabled={resettingId === 'ALL'}
                  className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                  title="Reset semua hasil ujian siswa di kelas ini"
                >
                  {resettingId === 'ALL' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  Reset Semua Ujian Kelas
                </button>
              )}

              <button
                onClick={handleDownloadReport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
                title="Unduh Hasil Perkelas (No, Nama, NISN, Nilai)"
              >
                <Download className="w-4 h-4" /> Download Perkelas (CSV/Excel)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-100/70 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">No</th>
                  <th className="px-6 py-4">Nama Siswa</th>
                  <th className="px-6 py-4">NISN</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Nilai</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Memuat data nilai...</td>
                  </tr>
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Tidak ada siswa terdaftar di kelas ini.</td>
                  </tr>
                ) : (
                  submissions.map((item, idx) => {
                    const st = item.student;
                    const sub = item.submission;
                    const isGraded = sub?.status === 'graded';
                    const isInProgress = sub?.status === 'in_progress';
                    const answeredCount = countAnsweredQuestions(sub?.answers);
                    const totalQ = Array.isArray(selectedTask.content) ? selectedTask.content.length : 0;

                    return (
                      <tr key={st.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{idx + 1}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{st.name}</td>
                        <td className="px-6 py-4">{st.username}</td>
                        <td className="px-6 py-4">
                          {!sub ? (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full flex items-center w-max">
                              <Clock className="w-3 h-3 mr-1" /> Belum Mengumpulkan
                            </span>
                          ) : isInProgress ? (
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full flex items-center w-max">
                              <Activity className="w-3 h-3 mr-1 animate-pulse" /> Sedang Ujian ({answeredCount}/{totalQ} Soal)
                            </span>
                          ) : isGraded ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full flex items-center w-max">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Sudah Dinilai
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full flex items-center w-max">
                              <AlertCircle className="w-3 h-3 mr-1" /> Perlu Periksa/Koreksi
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {sub && sub.score !== null && !isInProgress ? (
                            <div className="flex items-center gap-2">
                              <span className={`font-black text-lg ${sub.score >= (selectedTask.kkm || 75) ? 'text-emerald-700' : 'text-red-600'}`}>
                                {sub.score}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                sub.score >= (selectedTask.kkm || 75)
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-red-50 text-red-800 border-red-200'
                              }`}>
                                {sub.score >= (selectedTask.kkm || 75) ? 'TUNTAS' : 'REMEDIAL'}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {sub ? (
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {isInProgress && (
                                <button
                                  type="button"
                                  onClick={() => handleForceFinishExam(item)}
                                  disabled={resettingId === `finish_${st.id}`}
                                  className="px-2.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-bold text-xs transition flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                  title="Selesaikan ujian siswa jika siswa lupa menekan tombol selesai"
                                >
                                  {resettingId === `finish_${st.id}` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                  Selesaikan
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleResetLoginKeepAnswers(item)}
                                disabled={resettingId === `login_${st.id}`}
                                className="px-2.5 py-1.5 bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 rounded-lg font-semibold text-xs transition flex items-center gap-1 disabled:opacity-50"
                                title="Reset Login karena kendala jaringan (Jawaban yang sudah dikerjakan TIDAK hilang)"
                              >
                                {resettingId === `login_${st.id}` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Unlock className="w-3.5 h-3.5" />
                                )}
                                Reset Login
                              </button>
                              <button
                                type="button"
                                onClick={() => openGradingModal(item, false)}
                                className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold text-xs transition flex items-center gap-1"
                                title="Periksa & Koreksi Nilai"
                              >
                                <Eye className="w-3.5 h-3.5" /> Koreksi
                              </button>
                              <button
                                type="button"
                                onClick={() => openGradingModal(item, true)}
                                className="px-2.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg font-semibold text-xs transition flex items-center gap-1"
                                title="Edit Jawaban & Nilai Ujian Siswa"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit Ujian
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResetStudentExam(item)}
                                disabled={resettingId === st.id}
                                className="px-2.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-semibold text-xs transition flex items-center gap-1 disabled:opacity-50"
                                title="Reset Ujian dari 0 (Hapus semua jawaban siswa)"
                              >
                                {resettingId === st.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3.5 h-3.5" />
                                )}
                                Reset 0
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-gray-400 italic">Belum Mengumpulkan</span>
                              <button
                                type="button"
                                onClick={() => openGradingModal(item, true)}
                                className="px-2.5 py-1.5 bg-gray-100 text-gray-700 hover:bg-amber-50 hover:text-amber-800 rounded-lg font-semibold text-xs transition flex items-center gap-1"
                                title="Input / Edit Ujian Manual untuk Siswa Ini"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit / Input
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Correction / Edit Student Exam Modal */}
      {gradingModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    {isEditingExamAnswers ? 'Edit Ujian & Jawaban Siswa' : 'Koreksi Lembar Jawaban Siswa'}
                  </h3>
                  <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md ${
                    isEditingExamAnswers ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {isEditingExamAnswers ? 'Mode Edit Ujian' : 'Mode Koreksi'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Siswa: <strong className="text-gray-800">{gradingModal.student.name}</strong> • NISN: {gradingModal.student.username}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingExamAnswers(!isEditingExamAnswers)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                    isEditingExamAnswers
                      ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {isEditingExamAnswers ? 'Selesai Edit Jawaban' : 'Edit Jawaban Siswa'}
                </button>
                <button 
                  onClick={() => setGradingModal(null)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Question & Answer Details (View or Interactive Edit Mode) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-bold text-gray-900 text-sm">
                    {isEditingExamAnswers ? 'Edit Butir Jawaban Ujian Siswa' : 'Daftar Jawaban Siswa'}
                  </h4>
                  {isEditingExamAnswers && (
                    <button
                      type="button"
                      onClick={handleRecalculateFromEditedAnswers}
                      className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <Calculator className="w-3.5 h-3.5" /> Hitung Ulang Skor PG Otomatis
                    </button>
                  )}
                </div>

                {selectedTask.content?.map((q: any, idx: number) => {
                  const studentAns = editingAnswers[idx] ?? '';
                  return (
                    <div key={idx} className={`p-4 rounded-xl border text-sm space-y-2.5 ${
                      isEditingExamAnswers ? 'bg-amber-50/40 border-amber-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-gray-900">Soal #{idx + 1}: {q.question}</p>
                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-600 shrink-0">
                          {q.type === 'pg' ? 'Pilihan Ganda' : 'Esai'}
                        </span>
                      </div>
                      
                      {q.type === 'pg' && (
                        isEditingExamAnswers ? (
                          <div className="space-y-2 pt-1">
                            <p className="text-xs font-semibold text-amber-900">Pilih/Ubah Jawaban Pilihan Ganda Siswa:</p>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {q.options?.map((opt: string, oIdx: number) => {
                                const letter = String.fromCharCode(65 + oIdx);
                                const isSelected = studentAns === letter || studentAns === opt;
                                const isKey = q.answer === letter || q.answer === opt;
                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() => {
                                      setEditingAnswers(prev => ({ ...prev, [idx]: letter }));
                                    }}
                                    className={`p-2.5 rounded-lg border text-left text-xs transition flex items-center justify-between ${
                                      isSelected
                                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                    }`}
                                  >
                                    <span><strong>{letter}.</strong> {opt}</span>
                                    {isKey && (
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                        isSelected ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                                      }`}>
                                        Kunci
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs space-y-1">
                            <p className="text-gray-700">
                              Jawaban Siswa: <span className={`font-bold ${
                                String(studentAns).trim().toLowerCase() === String(q.answer).trim().toLowerCase()
                                  ? 'text-emerald-700'
                                  : 'text-red-600'
                              }`}>{studentAns || '-'}</span>
                            </p>
                            <p className="text-gray-500">Kunci Jawaban: <span className="font-bold text-green-700">{q.answer}</span></p>
                          </div>
                        )
                      )}

                      {q.type === 'essay' && (
                        isEditingExamAnswers ? (
                          <div className="space-y-1.5 pt-1">
                            <label className="block text-xs font-semibold text-amber-900">Edit Jawaban Esai Siswa:</label>
                            <textarea
                              rows={2}
                              value={studentAns}
                              onChange={e => setEditingAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                              placeholder="Ketik atau perbaiki jawaban esai siswa..."
                              className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
                            />
                            <p className="text-[11px] text-emerald-800">
                              <strong>Kunci Jawaban Guru:</strong> "{q.answerKey || q.answer}"
                            </p>
                          </div>
                        ) : (
                          <div className="text-xs space-y-2 bg-white p-3 rounded-lg border border-gray-200">
                            <p className="text-gray-800 font-medium"><span className="text-gray-500 font-normal">Jawaban Siswa:</span> "{studentAns || '-'}"</p>
                            <p className="text-emerald-800 font-medium"><span className="text-gray-500 font-normal">Kunci Jawaban Guru:</span> "{q.answerKey || q.answer}"</p>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>

              {/* AI Auto Grade Button */}
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-indigo-900 text-sm flex items-center">
                    <Sparkles className="w-4 h-4 mr-1 text-indigo-600" /> Koreksi Otomatis dengan AI
                  </h4>
                  <p className="text-xs text-indigo-700">Gunakan AI untuk memeriksa jawaban siswa saat ini dan menghitung total nilai.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAiAutoGrade}
                  disabled={aiGradingLoading}
                  className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl text-xs hover:bg-indigo-700 transition flex items-center disabled:opacity-50 shrink-0"
                >
                  {aiGradingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  {aiGradingLoading ? 'Mengkoreksi...' : 'Jalankan Koreksi AI'}
                </button>
              </div>

              {/* Manual Grade & Status Adjustment */}
              <div className="space-y-4 pt-2">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Nilai Akhir (0 - 100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={gradingScore}
                      onChange={e => setGradingScore(Math.max(0, Math.min(100, Number(e.target.value))))}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl font-bold text-lg text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Status Ujian Siswa</label>
                    <select
                      value={gradingStatus}
                      onChange={e => setGradingStatus(e.target.value as 'graded' | 'submitted')}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl font-semibold text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="graded">✅ Sudah Dinilai (Selesai)</option>
                      <option value="submitted">⏳ Perlu Periksa / Koreksi Ulang</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Catatan / Umpan Balik Guru</label>
                  <textarea
                    rows={3}
                    value={gradingFeedback}
                    onChange={e => setGradingFeedback(e.target.value)}
                    placeholder="Berikan umpan balik atau catatan hasil ujian kepada siswa..."
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50">
              <div>
                {gradingModal.submission && (
                  <button
                    type="button"
                    onClick={() => handleResetStudentExam(gradingModal)}
                    disabled={resettingId === gradingModal.student.id}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold rounded-xl text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Ujian Siswa Ini
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setGradingModal(null)}
                  className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-200 rounded-xl text-sm transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveGrade}
                  disabled={savingGrade}
                  className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-700 transition flex items-center disabled:opacity-50 shadow-sm"
                >
                  {savingGrade ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  {savingGrade ? 'Menyimpan...' : 'Simpan Perubahan Ujian'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
