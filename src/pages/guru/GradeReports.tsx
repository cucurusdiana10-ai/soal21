import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { CheckSquare, Eye, Sparkles, Loader2, Save, X, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function GradeReports() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gradingModal, setGradingModal] = useState<any | null>(null);
  const [gradingScore, setGradingScore] = useState<number>(0);
  const [gradingFeedback, setGradingFeedback] = useState<string>('');
  const [aiGradingLoading, setAiGradingLoading] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [user]);

  async function fetchTasks() {
    if (!user) return;
    const { data } = await supabase
      .from('tasks')
      .select('*, class:classes(name)')
      .eq('guru_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setTasks(data);
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

  const openGradingModal = (item: any) => {
    const sub = item.submission;
    setGradingModal(item);
    setGradingScore(sub?.score || 0);
    setGradingFeedback(sub?.feedback || '');
  };

  const handleAiAutoGrade = async () => {
    if (!gradingModal || !selectedTask) return;
    const questions = selectedTask.content || [];
    const studentAnswers = gradingModal.submission?.answers || {};

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
          const res = await fetch('/api/grade-essay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: q.question,
              answerKey: q.answerKey || q.answer || '',
              studentAnswer: studentAns
            })
          });

          const data = await res.json();
          if (res.ok && data.score !== undefined) {
            const essayScaledScore = (data.score / 100) * pointsPerQuestion;
            calculatedScore += essayScaledScore;
            feedbacks.push(`Soal #${i + 1} (Esai): ${data.score}/100 - ${data.feedback || ''}`);
          } else {
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
    if (!sub) {
      alert('Siswa belum mengumpulkan tugas.');
      return;
    }

    setSavingGrade(true);
    try {
      const { error } = await supabase
        .from('task_submissions')
        .update({
          score: gradingScore,
          status: 'graded',
          feedback: gradingFeedback
        })
        .eq('id', sub.id);

      if (error) throw error;

      alert('Nilai dan umpan balik berhasil disimpan!');
      setGradingModal(null);
      handleSelectTask(selectedTask); // Refresh list
    } catch (err: any) {
      alert('Gagal menyimpan nilai: ' + err.message);
    } finally {
      setSavingGrade(false);
    }
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
                <span className="text-xs px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-full">
                  Kelas {task.class?.name || '-'}
                </span>
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
              <h2 className="text-lg font-bold text-gray-900">Hasil Pekerjaan Siswa</h2>
              <p className="text-sm text-gray-500">
                Tugas: <span className="font-semibold text-gray-900">{selectedTask.title}</span> • Kelas {selectedTask.class?.name}
              </p>
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
                    const isSubmitted = sub && sub.status !== 'pending';

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
                        <td className="px-6 py-4 font-black text-lg text-gray-900">
                          {sub && sub.score !== null ? (
                            <span className={sub.score >= 75 ? 'text-green-600' : 'text-amber-600'}>
                              {sub.score}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {sub ? (
                            <button
                              onClick={() => openGradingModal(item)}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold text-xs transition"
                            >
                              Periksa & Koreksi
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Belum Mengumpulkan</span>
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

      {/* Correction / Grading Modal */}
      {gradingModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Koreksi Lembar Jawaban</h3>
                <p className="text-xs text-gray-500">Siswa: {gradingModal.student.name} • NISN: {gradingModal.student.username}</p>
              </div>
              <button 
                onClick={() => setGradingModal(null)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Question & Answer Details */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 text-sm border-b pb-2">Jawaban Siswa</h4>
                {selectedTask.content?.map((q: any, idx: number) => {
                  const studentAns = gradingModal.submission?.answers?.[idx] || gradingModal.submission?.answers?.[String(idx)] || '-';
                  return (
                    <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm space-y-2">
                      <p className="font-bold text-gray-900">Soal #{idx + 1}: {q.question}</p>
                      
                      {q.type === 'pg' && (
                        <div className="text-xs space-y-1">
                          <p className="text-gray-700">Jawaban Siswa: <span className="font-bold text-blue-700">{studentAns}</span></p>
                          <p className="text-gray-500">Kunci Jawaban: <span className="font-bold text-green-700">{q.answer}</span></p>
                        </div>
                      )}

                      {q.type === 'essay' && (
                        <div className="text-xs space-y-2 bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-gray-800 font-medium"><span className="text-gray-500 font-normal">Jawaban Siswa:</span> "{studentAns}"</p>
                          <p className="text-emerald-800 font-medium"><span className="text-gray-500 font-normal">Kunci Jawaban Guru:</span> "{q.answerKey || q.answer}"</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* AI Auto Grade Button */}
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-indigo-900 text-sm flex items-center">
                    <Sparkles className="w-4 h-4 mr-1 text-indigo-600" /> Koreksi Otomatis dengan AI
                  </h4>
                  <p className="text-xs text-indigo-700">Gunakan Gemini AI untuk memeriksa jawaban esai dan menghitung total nilai.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAiAutoGrade}
                  disabled={aiGradingLoading}
                  className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl text-xs hover:bg-indigo-700 transition flex items-center disabled:opacity-50"
                >
                  {aiGradingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  {aiGradingLoading ? 'Mengkoreksi...' : 'Jalankan Koreksi AI'}
                </button>
              </div>

              {/* Manual Grade Adjustment */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Nilai Akhir (0 - 100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={gradingScore}
                    onChange={e => setGradingScore(Number(e.target.value))}
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl font-bold text-lg text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Catatan / Umpan Balik Guru</label>
                  <textarea
                    rows={3}
                    value={gradingFeedback}
                    onChange={e => setGradingFeedback(e.target.value)}
                    placeholder="Berikan umpan balik atau apresiasi kepada siswa..."
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
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
                className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-700 transition flex items-center disabled:opacity-50"
              >
                {savingGrade ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                {savingGrade ? 'Menyimpan...' : 'Simpan Penilaian'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
