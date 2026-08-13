import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { BookOpen, CheckCircle2, Clock, Search, FileText, Send, Loader2, X } from 'lucide-react';
import SiswaMateri from './SiswaMateri';
import SiswaNilai from './SiswaNilai';

function SiswaTugas() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStudentTasks();
  }, [user]);

  async function fetchStudentTasks() {
    if (!user) return;

    // Get student's class
    const { data: classStud } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', user.id)
      .single();

    if (classStud?.class_id) {
      // Fetch tasks for this class
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*')
        .eq('class_id', classStud.class_id)
        .order('created_at', { ascending: false });

      if (taskData) setTasks(taskData);

      // Fetch student's submissions
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

  const openTaskModal = (task: any) => {
    setActiveTask(task);
    setAnswers({});
  };

  const handleAnswerChange = (questionIndex: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: value }));
  };

  const handleSubmitTask = async () => {
    if (!activeTask || !user) return;

    const questions = activeTask.content || [];
    if (Object.keys(answers).length < questions.length) {
      if (!confirm('Masih ada soal yang belum dijawab. Yakin ingin mengumpulkan tugas sekarang?')) return;
    }

    setSubmitting(true);

    try {
      // Auto-score PG questions instantly
      let totalQuestions = questions.length;
      let pointsPerQuestion = 100 / totalQuestions;
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

      const { error } = await supabase.from('task_submissions').insert([{
        task_id: activeTask.id,
        student_id: user.id,
        answers: answers,
        score: finalScore,
        status: finalStatus,
        feedback: hasEssay ? 'Jawaban esai dikumpulkan dan sedang menunggu kaji ulang guru.' : `Skor Pilihan Ganda Otomatis: ${Math.round(calculatedScore)}`
      }]);

      if (error) throw error;

      alert(hasEssay ? 'Tugas berhasil dikumpulkan! Jawaban esai Anda akan diperiksa oleh guru.' : `Tugas selesai! Nilai Pilihan Ganda Anda: ${Math.round(calculatedScore)}/100`);

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

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Halo, {user?.name}!</h1>
        <p className="text-blue-100 text-lg">NISN: {user?.username} • SMAN 21 Garut</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Daftar Tugas & Soal Kelas</h2>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari mata pelajaran / tugas..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm"
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

            return (
              <div key={task.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-300 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${isCompleted ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{task.title}</h3>
                        <p className="text-sm text-gray-500">{task.subject_name || 'Mata Pelajaran'}</p>
                      </div>
                    </div>

                    {isCompleted ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Selesai
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> Belum
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm mb-6 capitalize">
                    Jenis Soal: {task.type === 'pg' ? 'Pilihan Ganda' : task.type === 'essay' ? 'Esai' : 'Campuran'} • Jumlah: {task.content?.length || 0} Soal
                  </p>
                </div>

                {isCompleted ? (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                    <span className="text-xs text-gray-600 font-medium">Nilai Akhir:</span>
                    <span className="text-xl font-black text-green-600">
                      {sub.score !== null ? sub.score : 'Menunggu Koreksi Guru'}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => openTaskModal(task)}
                    className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
                  >
                    Mulai Kerjakan Soal
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Task Answering Modal */}
      {activeTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-blue-50">
              <div>
                <h3 className="text-lg font-bold text-blue-950">{activeTask.title}</h3>
                <p className="text-xs text-blue-700">Mata Pelajaran: {activeTask.subject_name}</p>
              </div>
              <button onClick={() => setActiveTask(null)} className="text-gray-400 hover:text-gray-600 p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {activeTask.content?.map((q: any, idx: number) => (
                <div key={idx} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
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
                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                onClick={() => setActiveTask(null)}
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
