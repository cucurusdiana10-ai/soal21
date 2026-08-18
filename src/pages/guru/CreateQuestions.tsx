import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { FileText, Sparkles, Loader2, Send, Trash2, Eye, X, CheckCircle2 } from 'lucide-react';
import { generateQuestionsApi } from '../../lib/aiService';

export default function CreateQuestions() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [materialTopics, setMaterialTopics] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customTopic, setCustomTopic] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  
  const [form, setForm] = useState({
    class_id: '',
    subject_name: '',
    title: '',
    type: 'pg', // 'pg', 'essay', 'mixed'
    count: 5
  });

  const [generatedQuestions, setGeneratedQuestions] = useState<any[] | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  useEffect(() => {
    fetchClasses();
    fetchTeacherSubjects();
    fetchMaterialTopics();
    fetchTasks();
  }, [user]);

  async function fetchClasses() {
    const { data } = await supabase.from('classes').select('id, name').order('name');
    if (data) setClasses(data);
  }

  async function fetchTeacherSubjects() {
    if (!user) return;
    const { data } = await supabase
      .from('subjects')
      .select('name')
      .eq('guru_id', user.id);

    if (data && data.length > 0) {
      const parsed: string[] = [];
      data.forEach(s => {
        if (s.name) {
          s.name.split(',').forEach(item => {
            const trimmed = item.trim();
            if (trimmed && !parsed.includes(trimmed)) parsed.push(trimmed);
          });
        }
      });
      setTeacherSubjects(parsed);
      if (parsed.length > 0 && !form.subject_name) {
        setForm(prev => ({ ...prev, subject_name: parsed[0] }));
      }
    }
  }

  async function fetchMaterialTopics() {
    if (!user) return;
    const { data } = await supabase
      .from('teaching_materials')
      .select('id, topic, title, subject_name, grade')
      .eq('guru_id', user.id);

    if (data) setMaterialTopics(data);
  }

  async function fetchTasks() {
    if (!user) return;
    const { data } = await supabase
      .from('tasks')
      .select('*, class:classes(name)')
      .eq('guru_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setTasks(data);
  }

  const handleGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.class_id || !form.subject_name || !form.title) {
      alert('Lengkapi Kelas, Mata Pelajaran, dan Judul/Topik Soal');
      return;
    }

    setLoading(true);
    setGeneratedQuestions(null);

    try {
      const data = await generateQuestionsApi({
        topic: `${form.subject_name} - ${form.title}`,
        type: form.type,
        count: form.count
      });

      setGeneratedQuestions(data);
    } catch (err: any) {
      alert(err.message || 'Gagal meracik soal dari AI');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishTask = async () => {
    if (!generatedQuestions || !user) return;

    setSaving(true);
    try {
      if (form.class_id === 'ALL_GRADE') {
        const inserts = classes.map(c => ({
          guru_id: user.id,
          class_id: c.id,
          subject_name: form.subject_name,
          title: form.title,
          type: form.type,
          content: generatedQuestions
        }));

        const { error } = await supabase.from('tasks').insert(inserts);
        if (error) throw error;

        alert(`Soal/Tugas berhasil diterbitkan ke ${inserts.length} kelas!`);
      } else {
        const { error } = await supabase.from('tasks').insert([{
          guru_id: user.id,
          class_id: form.class_id,
          subject_name: form.subject_name,
          title: form.title,
          type: form.type,
          content: generatedQuestions
        }]);

        if (error) throw error;
        alert('Soal/Tugas berhasil diterbitkan ke siswa!');
      }

      setGeneratedQuestions(null);
      setForm({ class_id: '', subject_name: teacherSubjects[0] || '', title: '', type: 'pg', count: 5 });
      setCustomTopic(false);
      fetchTasks();
    } catch (err: any) {
      alert('Gagal menerbitkan soal: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) fetchTasks();
  };

  // Filter and deduplicate topics for the selected subject
  const uniqueMaterialTopics: string[] = Array.from(
    new Set(
      materialTopics
        .filter(m => {
          if (!form.subject_name) return true;
          return !m.subject_name || 
            m.subject_name.toLowerCase().includes(form.subject_name.toLowerCase()) || 
            form.subject_name.toLowerCase().includes(m.subject_name.toLowerCase());
        })
        .map(m => String(m.topic || m.title || ''))
        .filter(Boolean)
    )
  );

  const toggleTopic = (topicName: string) => {
    let updated: string[];
    if (selectedTopics.includes(topicName)) {
      updated = selectedTopics.filter(t => t !== topicName);
    } else {
      updated = [...selectedTopics, topicName];
    }
    setSelectedTopics(updated);
    setForm(prev => ({ ...prev, title: updated.join(', ') }));
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buat Soal & Ujian (AI)</h1>
        <p className="text-gray-500">Buat soal Pilihan Ganda, Esai, atau Campuran secara otomatis dari topik Bahan Ajar AI.</p>
      </div>

      {/* Generator Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <form onSubmit={handleGenerateQuestions} className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Kelas / Rombel</label>
              <select
                required
                value={form.class_id}
                onChange={e => setForm({ ...form, class_id: e.target.value })}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-blue-900"
              >
                <option value="">-- Pilih Kelas --</option>
                <option value="ALL_GRADE" className="font-bold text-blue-700 bg-blue-50">
                  ✨ Semua Kelas
                </option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>Kelas {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mata Pelajaran</label>
              {teacherSubjects.length > 0 ? (
                <select
                  required
                  value={form.subject_name}
                  onChange={e => {
                    const newSub = e.target.value;
                    setForm({ ...form, subject_name: newSub, title: '' });
                  }}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {teacherSubjects.map((sub, idx) => (
                    <option key={idx} value={sub}>{sub}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={form.subject_name}
                  onChange={e => setForm({ ...form, subject_name: e.target.value })}
                  placeholder="Contoh: Matematika"
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <div className="md:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Judul / Topik Soal (Dapat Pilih Multi-Topik)
                </label>
                {uniqueMaterialTopics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomTopic(!customTopic);
                      if (!customTopic) setSelectedTopics([]);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    {customTopic ? '← Pilih dari Bahan Ajar' : '+ Ketik Manual'}
                  </button>
                )}
              </div>

              {!customTopic && uniqueMaterialTopics.length > 0 ? (
                <div className="space-y-2">
                  <div className="p-3 bg-gray-50 border border-gray-300 rounded-xl max-h-40 overflow-y-auto space-y-2">
                    <div className="text-xs text-gray-500 font-medium border-b border-gray-200 pb-1 mb-1 flex justify-between">
                      <span>Centang 1 atau Lebih Topik:</span>
                      <span className="font-bold text-blue-600">{selectedTopics.length} Terpilih</span>
                    </div>
                    {uniqueMaterialTopics.map((topName, idx) => {
                      const isChecked = selectedTopics.includes(topName);
                      return (
                        <label 
                          key={idx} 
                          className={`flex items-center gap-2 text-xs p-2 rounded-lg cursor-pointer transition font-medium ${
                            isChecked ? 'bg-blue-100 text-blue-900 font-bold border border-blue-300' : 'bg-white hover:bg-gray-100 border border-gray-200 text-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTopic(topName)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span className="flex-1 truncate">{topName}</span>
                        </label>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Judul Soal Tergabung"
                    className="w-full p-2 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-700"
                  />
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Contoh: Persamaan Kuadrat & Trigonometri"
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Soal</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="pg">Pilihan Ganda (PG)</option>
                <option value="essay">Esai</option>
                <option value="mixed">Campuran (PG & Esai)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Soal (Ketik Sendiri)</label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={form.count}
                onChange={e => setForm({ ...form, count: Math.max(1, Number(e.target.value)) })}
                placeholder="Jumlah soal, contoh: 10"
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition flex items-center justify-center disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
            {loading ? 'AI Sedang Meracik Soal...' : 'Buatkan Soal dengan AI'}
          </button>
        </form>
      </div>

      {/* Generated Preview */}
      {generatedQuestions && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-50 border-b border-blue-100 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-blue-900">Hasil Buat Soal AI ({generatedQuestions.length} Soal)</h2>
              <p className="text-sm text-blue-700">Periksa soal di bawah sebelum diterbitkan ke kelas target.</p>
            </div>
            <button
              onClick={handlePublishTask}
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium flex items-center hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {saving ? 'Menerbitkan...' : 'Terbitkan ke Siswa'}
            </button>
          </div>

          <div className="p-6 space-y-6">
            {generatedQuestions.map((q: any, idx: number) => (
              <div key={idx} className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${q.type === 'pg' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                    {q.type === 'pg' ? 'Pilihan Ganda' : 'Esai'}
                  </span>
                  <span className="font-bold text-gray-900">Soal #{idx + 1}</span>
                </div>
                
                <p className="text-gray-900 font-medium mb-4">{q.question}</p>

                {q.type === 'pg' && q.options && (
                  <div className="grid sm:grid-cols-2 gap-3 mb-2">
                    {q.options.map((opt: string, oIdx: number) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      const isCorrect = q.answer === letter || q.answer === opt;
                      return (
                        <div key={oIdx} className={`p-3 rounded-lg border text-sm font-medium ${isCorrect ? 'bg-green-100 border-green-300 text-green-900' : 'bg-white border-gray-200 text-gray-700'}`}>
                          <span className="font-bold mr-2">{letter}.</span> {opt}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === 'essay' && (
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900">
                    <span className="font-bold">Kunci Jawaban Esai:</span> {q.answerKey || q.answer || '-'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Published Tasks List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-blue-600" /> Daftar Soal & Tugas Terbit
        </h2>

        {tasks.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">Belum ada soal/tugas yang diterbitkan.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <div key={task.id} className="py-4 flex items-center justify-between gap-4 hover:bg-gray-50/80 px-2 rounded-xl transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{task.title}</span>
                    <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-full border border-blue-100">
                      Kelas: {task.class?.name || '-'}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 bg-gray-100 text-gray-700 capitalize rounded-full">
                      {task.type === 'pg' ? 'Pilihan Ganda' : task.type === 'essay' ? 'Esai' : 'Campuran'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Mata Pelajaran: {task.subject_name || '-'} • Dibuat: {new Date(task.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedTask(task)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Lihat Soal"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Hapus Tugas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedTask.title}</h3>
                <p className="text-xs text-gray-500">Kelas {selectedTask.class?.name} • {selectedTask.subject_name}</p>
              </div>
              <button 
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {Array.isArray(selectedTask.content) && selectedTask.content.map((q: any, idx: number) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm">
                  <p className="font-bold text-gray-900 mb-2">{idx + 1}. {q.question}</p>
                  {q.type === 'pg' && q.options && (
                    <div className="space-y-1 pl-4">
                      {q.options.map((opt: string, oIdx: number) => {
                        const letter = String.fromCharCode(65 + oIdx);
                        return (
                          <p key={oIdx} className={q.answer === letter || q.answer === opt ? 'font-bold text-green-700' : 'text-gray-600'}>
                            {letter}. {opt} {q.answer === letter || q.answer === opt ? '✓ (Kunci)' : ''}
                          </p>
                        );
                      })}
                    </div>
                  )}
                  {q.type === 'essay' && (
                    <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded mt-2">
                      Kunci Jawaban: {q.answerKey || q.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
