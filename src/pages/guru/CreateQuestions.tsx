import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { 
  FileText, Sparkles, Loader2, Send, Trash2, Eye, X, CheckCircle2, 
  PlusCircle, Edit2, AlertCircle, Save, Check
} from 'lucide-react';
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
  const [autoPublish, setAutoPublish] = useState(false);
  
  const [form, setForm] = useState({
    class_id: '',
    subject_name: '',
    title: '',
    type: 'pg', // 'pg', 'essay', 'mixed'
    count: 5
  });

  const [generatedQuestions, setGeneratedQuestions] = useState<any[] | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);

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
    try {
      let { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('guru_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error || !data || data.length === 0) {
        // Fallback: fetch all tasks in case guru_id is not tagged
        const { data: allData } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });
        if (allData) data = allData;
      }
      
      if (data) {
        setTasks(data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  }

  const handleGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.class_id || !form.subject_name || !form.title) {
      alert('Mohon lengkapi Target Kelas, Mata Pelajaran, dan Judul/Topik Soal!');
      return;
    }

    setLoading(true);
    setGeneratedQuestions(null);
    setEditingQuestionIdx(null);

    try {
      const data = await generateQuestionsApi({
        topic: `${form.subject_name} - ${form.title}`,
        type: form.type,
        count: form.count
      });

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('AI tidak mengembalikan butir soal yang valid.');
      }

      setGeneratedQuestions(data);

      // If autoPublish is checked, automatically publish
      if (autoPublish) {
        await publishQuestionsDirectly(data);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal meracik soal dari AI');
    } finally {
      setLoading(false);
    }
  };

  const publishQuestionsDirectly = async (questionsToPublish: any[]) => {
    if (!questionsToPublish || !user) return;

    setSaving(true);
    try {
      if (form.class_id === 'ALL_GRADE') {
        const inserts = classes.map(c => ({
          guru_id: user.id,
          class_id: c.id,
          subject_name: form.subject_name,
          title: form.title,
          type: form.type,
          content: questionsToPublish
        }));

        const { error } = await supabase.from('tasks').insert(inserts);
        if (error) throw error;

        alert(`✅ Sukses! ${questionsToPublish.length} butir soal telah berhasil diterbitkan ke ${inserts.length} kelas.`);
      } else {
        const { error } = await supabase.from('tasks').insert([{
          guru_id: user.id,
          class_id: form.class_id,
          subject_name: form.subject_name,
          title: form.title,
          type: form.type,
          content: questionsToPublish
        }]);

        if (error) throw error;
        alert(`✅ Sukses! ${questionsToPublish.length} butir soal berhasil diterbitkan dan siap dikerjakan siswa.`);
      }

      setGeneratedQuestions(null);
      setEditingQuestionIdx(null);
      setForm({ class_id: '', subject_name: teacherSubjects[0] || '', title: '', type: 'pg', count: 5 });
      setCustomTopic(false);
      fetchTasks();
    } catch (err: any) {
      alert('Gagal menerbitkan soal: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishTask = async () => {
    if (!generatedQuestions) return;
    await publishQuestionsDirectly(generatedQuestions);
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tugas/soal ini?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) fetchTasks();
  };

  const removeQuestion = (idx: number) => {
    if (!generatedQuestions) return;
    const updated = generatedQuestions.filter((_, i) => i !== idx);
    setGeneratedQuestions(updated);
    if (editingQuestionIdx === idx) setEditingQuestionIdx(null);
  };

  const addManualQuestion = () => {
    const newQ = {
      type: 'pg',
      question: 'Tulis pertanyaan baru di sini...',
      options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
      answer: 'A',
      explanation: 'Penjelasan jawaban'
    };
    if (generatedQuestions) {
      setGeneratedQuestions([...generatedQuestions, newQ]);
      setEditingQuestionIdx(generatedQuestions.length);
    } else {
      setGeneratedQuestions([newQ]);
      setEditingQuestionIdx(0);
    }
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

  const getClassName = (classId: string) => {
    const c = classes.find(item => item.id === classId);
    return c ? c.name : '-';
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buat Soal & Ujian (AI)</h1>
        <p className="text-gray-500">Buat soal Pilihan Ganda, Esai, atau Campuran secara otomatis dengan AI dan terbitkan langsung ke siswa.</p>
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
                    placeholder="Contoh: Ulangan Harian Bab 1"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Soal</label>
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

            <div className="flex items-end">
              <label className="flex items-center gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl cursor-pointer w-full text-xs font-semibold text-blue-900 hover:bg-blue-100 transition">
                <input 
                  type="checkbox"
                  checked={autoPublish}
                  onChange={e => setAutoPublish(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>⚡ Langsung terbitkan ke siswa setelah AI selesai</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition flex items-center justify-center disabled:opacity-70 shadow-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
              {loading ? 'AI Sedang Meracik Soal...' : 'Buatkan Soal dengan AI'}
            </button>

            <button
              type="button"
              onClick={addManualQuestion}
              className="px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition flex items-center text-sm"
            >
              <PlusCircle className="w-4 h-4 mr-2 text-gray-600" /> + Tambah Soal Manual
            </button>
          </div>
        </form>
      </div>

      {/* Generated Preview & Publish Section */}
      {generatedQuestions && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-300 overflow-hidden animate-fadeIn">
          {/* Action Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-300" />
                <h2 className="text-xl font-bold">Hasil Soal AI ({generatedQuestions.length} Butir Soal)</h2>
              </div>
              <p className="text-xs text-blue-100 mt-1">
                ⚠️ Klik tombol <strong>"Terbitkan ke Siswa Sekarang"</strong> di samping agar soal masuk ke daftar soal & dapat dikerjakan siswa.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={addManualQuestion}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-sm transition flex items-center"
              >
                <PlusCircle className="w-4 h-4 mr-1" /> + Tambah Butir
              </button>
              <button
                onClick={handlePublishTask}
                disabled={saving}
                className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-md transition flex items-center justify-center disabled:opacity-50 text-sm"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                {saving ? 'Sedang Menerbitkan...' : '🚀 Terbitkan ke Siswa Sekarang'}
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {generatedQuestions.map((q: any, idx: number) => {
              const isEditingThis = editingQuestionIdx === idx;

              return (
                <div key={idx} className={`p-5 rounded-xl border transition ${isEditingThis ? 'bg-blue-50/50 border-blue-400' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${q.type === 'pg' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                        {q.type === 'pg' ? 'Pilihan Ganda' : 'Esai'}
                      </span>
                      <span className="font-bold text-gray-900">Soal #{idx + 1}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingQuestionIdx(isEditingThis ? null : idx)}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 rounded-lg font-semibold flex items-center gap-1 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> {isEditingThis ? 'Selesai Edit' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Hapus Butir Soal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isEditingThis ? (
                    /* Inline Editing Mode */
                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Teks Pertanyaan</label>
                        <textarea
                          rows={3}
                          value={q.question}
                          onChange={e => {
                            const updated = [...generatedQuestions];
                            updated[idx].question = e.target.value;
                            setGeneratedQuestions(updated);
                          }}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                      </div>

                      {q.type === 'pg' && (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-gray-700">Pilihan Jawaban & Kunci</label>
                          {q.options?.map((opt: string, oIdx: number) => {
                            const letter = String.fromCharCode(65 + oIdx);
                            const isCorrect = q.answer === letter;

                            return (
                              <div key={oIdx} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...generatedQuestions];
                                    updated[idx].answer = letter;
                                    setGeneratedQuestions(updated);
                                  }}
                                  className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition ${
                                    isCorrect ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                  title={`Jadikan ${letter} sebagai Kunci Jawaban`}
                                >
                                  {letter}
                                </button>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={e => {
                                    const updated = [...generatedQuestions];
                                    updated[idx].options[oIdx] = e.target.value;
                                    setGeneratedQuestions(updated);
                                  }}
                                  className="flex-1 p-2 bg-white border border-gray-300 rounded-lg text-sm"
                                  placeholder={`Pilihan ${letter}`}
                                />
                                {isCorrect && (
                                  <span className="text-xs font-bold text-green-700 flex items-center">
                                    <Check className="w-3.5 h-3.5 mr-1" /> Kunci
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'essay' && (
                        <div>
                          <label className="block text-xs font-bold text-amber-800 mb-1">Kunci Jawaban Esai / Panduan Guru</label>
                          <textarea
                            rows={2}
                            value={q.answerKey || q.answer || ''}
                            onChange={e => {
                              const updated = [...generatedQuestions];
                              updated[idx].answerKey = e.target.value;
                              setGeneratedQuestions(updated);
                            }}
                            className="w-full p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Read-Only Preview Mode */
                    <div>
                      <p className="text-gray-900 font-medium mb-3">{q.question}</p>

                      {q.type === 'pg' && q.options && (
                        <div className="grid sm:grid-cols-2 gap-3 mb-2">
                          {q.options.map((opt: string, oIdx: number) => {
                            const letter = String.fromCharCode(65 + oIdx);
                            const isCorrect = q.answer === letter || q.answer === opt;
                            return (
                              <div key={oIdx} className={`p-3 rounded-lg border text-sm font-medium ${isCorrect ? 'bg-green-100 border-green-300 text-green-900 font-bold' : 'bg-white border-gray-200 text-gray-700'}`}>
                                <span className="mr-2">{letter}.</span> {opt}
                                {isCorrect && <span className="ml-2 text-xs text-green-700">✓ (Kunci)</span>}
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
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Publish Button */}
          <div className="bg-gray-100 p-4 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Total {generatedQuestions.length} Butir Soal Terbentuk</span>
            <button
              onClick={handlePublishTask}
              disabled={saving}
              className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md transition flex items-center disabled:opacity-50 text-sm"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
              {saving ? 'Sedang Menerbitkan...' : '🚀 Terbitkan ke Siswa Sekarang'}
            </button>
          </div>
        </div>
      )}

      {/* Published Tasks List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" /> Daftar Soal & Tugas Terbit
            </h2>
            <p className="text-xs text-gray-500">Soal-soal yang aktif dan dapat dikerjakan langsung oleh siswa kelas target.</p>
          </div>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
            Total: {tasks.length} Paket Soal
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 font-medium text-sm">Belum ada paket soal yang diterbitkan.</p>
            <p className="text-gray-400 text-xs mt-1">Gunakan form di atas untuk membuat soal dengan AI dan klik tombol "Terbitkan".</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map((task) => {
              const questionCount = Array.isArray(task.content) ? task.content.length : 0;
              const className = getClassName(task.class_id);

              return (
                <div key={task.id} className="py-4 flex items-center justify-between gap-4 hover:bg-gray-50/80 px-2 rounded-xl transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-gray-900">{task.title}</span>
                      <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-full border border-blue-100">
                        Kelas: {className}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 bg-gray-100 text-gray-700 capitalize rounded-full">
                        {task.type === 'pg' ? 'Pilihan Ganda' : task.type === 'essay' ? 'Esai' : 'Campuran'}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full">
                        {questionCount} Soal
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Mata Pelajaran: {task.subject_name || '-'} • Dibuat: {new Date(task.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedTask({ ...task, className })}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                      title="Lihat Soal"
                    >
                      <Eye className="w-3.5 h-3.5" /> Lihat
                    </button>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Hapus Tugas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
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
                <p className="text-xs text-gray-500">Kelas {selectedTask.className || getClassName(selectedTask.class_id)} • {selectedTask.subject_name}</p>
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
                        const isCorrect = q.answer === letter || q.answer === opt;
                        return (
                          <p key={oIdx} className={isCorrect ? 'font-bold text-green-700 bg-green-50 p-1.5 rounded' : 'text-gray-600'}>
                            {letter}. {opt} {isCorrect ? '✓ (Kunci Jawaban)' : ''}
                          </p>
                        );
                      })}
                    </div>
                  )}
                  {q.type === 'essay' && (
                    <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded mt-2">
                      <span className="font-bold">Kunci Jawaban:</span> {q.answerKey || q.answer}
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
