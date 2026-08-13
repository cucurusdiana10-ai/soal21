import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { BookOpen, Sparkles, Loader2, Save, Trash2, Eye, X, Send, Edit3, Maximize2, Minimize2, Image, PlusCircle, Check } from 'lucide-react';
import CreateQuestions from './CreateQuestions';
import GradeReports from './GradeReports';

function MaterialGenerator() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fullscreenMaterial, setFullscreenMaterial] = useState<any | null>(null);

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [savedMaterials, setSavedMaterials] = useState<any[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);

  const [form, setForm] = useState({
    subject: '',
    grade: '',
    class_id: '',
    topic: ''
  });

  useEffect(() => {
    fetchClasses();
    fetchTeacherSubjects();
    fetchSavedMaterials();
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
      if (parsed.length > 0 && !form.subject) {
        setForm(prev => ({ ...prev, subject: parsed[0] }));
      }
    }
  }

  async function fetchSavedMaterials() {
    if (!user) return;
    const { data } = await supabase
      .from('teaching_materials')
      .select('*, class:classes(name)')
      .eq('guru_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setSavedMaterials(data);
  }

  const handleGenerate = async () => {
    if (!form.subject || !form.grade || !form.topic) return alert('Lengkapi Mata Pelajaran, Tingkat Kelas, dan Topik');
    
    setLoading(true);
    setIsEditing(false);
    try {
      const res = await fetch('/api/generate-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: form.subject,
          grade: form.grade,
          topic: form.topic
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal meracik bahan ajar AI');
      
      // Ensure image fallback if missing
      if (!data.imageUrl) {
        data.imageUrl = `https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80`;
      }
      setResult(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMaterial = async () => {
    if (!result) return alert('Belum ada materi hasil racikan AI.');
    if (!user) return alert('Sesi login Anda telah berakhir, silakan re-login.');
    if (!form.class_id) {
      alert('Pilih target kelas terlebih dahulu untuk membagikan materi ini ke siswa');
      return;
    }

    setSaving(true);
    try {
      const subject = form.subject || 'Mata Pelajaran';
      const topic = form.topic || 'Topik Pembelajaran';
      const grade = form.grade || 'Umum';

      if (form.class_id === 'ALL_GRADE') {
        // Save to all classes matching grade or all classes
        const matchingClasses = classes.filter(c => !grade || c.name.toLowerCase().startsWith(grade.toLowerCase()) || c.name.includes(grade));
        const targetClassList = matchingClasses.length > 0 ? matchingClasses : classes;

        const inserts = targetClassList.map(c => ({
          guru_id: user.id,
          class_id: c.id,
          subject_name: subject,
          grade: grade,
          topic: topic,
          title: `${subject} - ${topic}`,
          content_json: result
        }));

        const { error } = await supabase.from('teaching_materials').insert(inserts);
        if (error) throw error;
        alert(`Bahan Ajar berhasil disimpan dan diterbitkan ke ${inserts.length} kelas di tingkat ${grade}!`);
      } else {
        const { error } = await supabase.from('teaching_materials').insert([{
          guru_id: user.id,
          class_id: form.class_id,
          subject_name: subject,
          grade: grade,
          topic: topic,
          title: `${subject} - ${topic}`,
          content_json: result
        }]);

        if (error) throw error;
        alert('Bahan Ajar berhasil disimpan dan dibagikan ke siswa!');
      }

      setResult(null);
      setIsEditing(false);
      setForm({ subject: teacherSubjects[0] || '', grade: '', class_id: '', topic: '' });
      fetchSavedMaterials();
    } catch (err: any) {
      alert('Gagal menyimpan bahan ajar: ' + (err.message || 'Terjadi kesalahan saat menyimpan'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Hapus bahan ajar ini?')) return;
    const { error } = await supabase.from('teaching_materials').delete().eq('id', id);
    if (!error) fetchSavedMaterials();
  };

  // Filter classes according to grade if selected
  const availableClasses = form.grade 
    ? classes.filter(c => c.name.toLowerCase().startsWith(form.grade.toLowerCase()) || c.name.includes(form.grade))
    : classes;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bahan Ajar Cerdas (AI)</h1>
        <p className="text-gray-500">Buat materi pembelajaran interaktif lengkap dengan Peta Konsep, Gambar Pendukung, dan Mode Presentasi Fullscreen.</p>
      </div>

      {/* Generator Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mata Pelajaran</label>
            {teacherSubjects.length > 0 ? (
              <select
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {teacherSubjects.map((s, idx) => (
                  <option key={idx} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input 
                type="text" 
                value={form.subject}
                onChange={e => setForm({...form, subject: e.target.value})}
                placeholder="Contoh: Biologi" 
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tingkat Kelas</label>
            <select 
              value={form.grade}
              onChange={e => setForm({...form, grade: e.target.value, class_id: ''})}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Pilih Tingkat --</option>
              <option value="X">Tingkat X (10)</option>
              <option value="XI">Tingkat XI (11)</option>
              <option value="XII">Tingkat XII (12)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Rombel Kelas</label>
            <select 
              value={form.class_id}
              onChange={e => setForm({...form, class_id: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-indigo-900"
            >
              <option value="">-- Pilih Kelas --</option>
              {form.grade && (
                <option value="ALL_GRADE" className="font-bold text-indigo-700 bg-indigo-50">
                  ✨ Semua Kelas (Tingkat {form.grade})
                </option>
              )}
              {(availableClasses.length > 0 ? availableClasses : classes).map(c => (
                <option key={c.id} value={c.id}>Kelas {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Topik / Capaian</label>
            <input 
              type="text" 
              value={form.topic}
              onChange={e => setForm({...form, topic: e.target.value})}
              placeholder="Contoh: Sistem Pencernaan" 
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={loading}
          className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition flex items-center justify-center disabled:opacity-70 shadow-sm"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
          {loading ? 'AI Sedang Meracik Materi...' : 'Generate Bahan Ajar Interaktif'}
        </button>
      </div>

      {/* Generated Result Card */}
      {result && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-indigo-50 border-b border-indigo-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                <span>Hasil Bahan Ajar AI</span>
                {isEditing && <span className="text-xs px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold">Modus Perbaikan / Edit</span>}
              </h2>
              <p className="text-sm text-indigo-600 mt-1">Periksa dan sesuaikan materi jika diperlukan sebelum disimpan.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center ${
                  isEditing ? 'bg-amber-500 text-white shadow-sm' : 'bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-100'
                }`}
              >
                <Edit3 className="w-4 h-4 mr-1.5" />
                {isEditing ? 'Selesai Edit' : 'Perbaiki Materi'}
              </button>

              <button
                type="button"
                onClick={() => setFullscreenMaterial({ title: `${form.subject} - ${form.topic}`, topic: form.topic, content_json: result })}
                className="px-3.5 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded-xl text-xs font-bold transition flex items-center"
              >
                <Maximize2 className="w-4 h-4 mr-1.5" />
                Layar Penuh (Fullscreen)
              </button>

              <select
                value={form.class_id}
                onChange={e => setForm({ ...form, class_id: e.target.value })}
                className="p-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Target Kelas --</option>
                {form.grade && <option value="ALL_GRADE">✨ Semua Kelas ({form.grade})</option>}
                {(availableClasses.length > 0 ? availableClasses : classes).map(c => (
                  <option key={c.id} value={c.id}>Kelas {c.name}</option>
                ))}
              </select>

              <button 
                onClick={handleSaveMaterial}
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center hover:bg-indigo-700 shadow-sm transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
                {saving ? 'Menyimpan...' : 'Simpan & Bagikan'}
              </button>
            </div>
          </div>
          
          <div className="p-8 space-y-8">
            {/* Supporting Image */}
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 group max-h-80">
              <img 
                src={result.imageUrl || "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80"} 
                alt="Gambar Pendukung Materi" 
                className="w-full h-80 object-cover opacity-90 group-hover:scale-105 transition duration-500"
                onError={(e) => {
                  (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80');
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-black/20 p-6 flex flex-col justify-end">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-indigo-600/90 text-white text-xs font-bold rounded-full backdrop-blur-sm flex items-center">
                    <Image className="w-3.5 h-3.5 mr-1" /> Gambar Pendukung Pembelajaran
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">{form.topic || 'Materi Visual'}</h3>
              </div>
            </div>

            {isEditing && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2">
                <label className="font-bold text-amber-900 block">URL Gambar Pendukung Custom:</label>
                <input 
                  type="text"
                  value={result.imageUrl || ''}
                  onChange={e => setResult({ ...result, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-xs"
                />
              </div>
            )}

            {/* Mindmap / Konsep Utama */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-indigo-500" /> Peta Konsep Utama
              </h3>
              <div className="flex flex-wrap gap-3">
                {result.mindMap?.map((item: string, idx: number) => (
                  <span key={idx} className="px-4 py-2 bg-indigo-50 text-indigo-800 rounded-full text-sm font-semibold border border-indigo-100 flex items-center gap-1">
                    {isEditing ? (
                      <input 
                        type="text"
                        value={item}
                        onChange={e => {
                          const updated = [...result.mindMap];
                          updated[idx] = e.target.value;
                          setResult({ ...result, mindMap: updated });
                        }}
                        className="bg-white border px-2 py-0.5 rounded text-xs text-indigo-900 font-bold"
                      />
                    ) : item}
                  </span>
                ))}
              </div>
            </div>

            {/* Detail Materi */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Detail Materi Pembelajaran</h3>
              {result.materials?.map((mat: any, idx: number) => (
                <div key={idx} className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-3">
                  {isEditing ? (
                    <>
                      <input 
                        type="text"
                        value={mat.title}
                        onChange={e => {
                          const updated = [...result.materials];
                          updated[idx].title = e.target.value;
                          setResult({ ...result, materials: updated });
                        }}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg font-bold text-base text-gray-900"
                      />
                      <textarea
                        rows={4}
                        value={mat.content}
                        onChange={e => {
                          const updated = [...result.materials];
                          updated[idx].content = e.target.value;
                          setResult({ ...result, materials: updated });
                        }}
                        className="w-full p-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 leading-relaxed"
                      />
                    </>
                  ) : (
                    <>
                      <h4 className="font-bold text-lg text-gray-900">{mat.title}</h4>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">{mat.content}</p>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Pertanyaan Pemantik */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Pertanyaan Pemantik Interaktif</h3>
              <div className="space-y-4">
                {result.interactiveQuestions?.map((q: any, idx: number) => (
                  <div key={idx} className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100">
                    <p className="font-semibold text-gray-900 mb-4">{idx + 1}. {q.question}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {q.options?.map((opt: string, oIdx: number) => (
                        <div key={oIdx} className={`p-3 rounded-lg border text-sm font-medium ${opt === q.answer ? 'bg-green-100 border-green-200 text-green-800' : 'bg-white border-gray-200 text-gray-700'}`}>
                          {String.fromCharCode(65 + oIdx)}. {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Materials Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-indigo-600" /> Daftar Bahan Ajar Terbit untuk Siswa
        </h2>

        {savedMaterials.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">Belum ada bahan ajar yang disimpan & dibagikan.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {savedMaterials.map((mat) => (
              <div key={mat.id} className="py-4 flex items-center justify-between gap-4 hover:bg-gray-50 px-2 rounded-xl transition">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{mat.title || mat.topic}</span>
                    <span className="text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded-full border border-indigo-100">
                      Kelas: {mat.class?.name || mat.grade}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Topik: {mat.topic} • Diterbitkan: {new Date(mat.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedMaterial(mat)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="Lihat Detail"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setFullscreenMaterial(mat)}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                    title="Modus Presentasi / Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteMaterial(mat.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Hapus Bahan Ajar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Material Detail Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-indigo-50">
              <div>
                <h3 className="text-lg font-bold text-indigo-950">{selectedMaterial.title}</h3>
                <p className="text-xs text-indigo-700">Kelas {selectedMaterial.class?.name || selectedMaterial.grade} • Topik: {selectedMaterial.topic}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setFullscreenMaterial(selectedMaterial);
                    setSelectedMaterial(null);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center"
                >
                  <Maximize2 className="w-3.5 h-3.5 mr-1" /> Fullscreen
                </button>
                <button onClick={() => setSelectedMaterial(null)} className="text-gray-400 hover:text-gray-600 p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Image */}
              {selectedMaterial.content_json?.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <img 
                    src={selectedMaterial.content_json.imageUrl} 
                    alt="Visual Bahan Ajar" 
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              {/* Mind Map */}
              {selectedMaterial.content_json?.mindMap && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2 text-sm">Peta Konsep</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMaterial.content_json.mindMap.map((item: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-800 rounded-full text-xs font-medium">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Materials */}
              {selectedMaterial.content_json?.materials && (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 border-b pb-1 text-sm">Materi Utama</h4>
                  {selectedMaterial.content_json.materials.map((m: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <h5 className="font-bold text-gray-900 mb-1 text-sm">{m.title}</h5>
                      <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">{m.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Presentation Fullscreen View */}
      {fullscreenMaterial && (
        <div className="fixed inset-0 z-[100] bg-gray-950 text-white overflow-y-auto flex flex-col p-6 md:p-12">
          <div className="flex items-center justify-between border-b border-gray-800 pb-6 mb-8 max-w-6xl mx-auto w-full">
            <div>
              <span className="px-3 py-1 bg-indigo-600 text-white font-bold rounded-full text-xs uppercase tracking-wider">
                Mode Presentasi / Bahan Ajar
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-2">{fullscreenMaterial.title}</h2>
              <p className="text-gray-400 text-sm mt-1">SMAN 21 Garut • Topik: {fullscreenMaterial.topic}</p>
            </div>

            <button 
              onClick={() => setFullscreenMaterial(null)}
              className="p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl transition flex items-center gap-2 font-bold text-sm"
            >
              <Minimize2 className="w-5 h-5" /> Keluar Fullscreen
            </button>
          </div>

          <div className="max-w-6xl mx-auto w-full space-y-12 flex-1 pb-16">
            {/* Supporting Image in Fullscreen */}
            {fullscreenMaterial.content_json?.imageUrl && (
              <div className="rounded-3xl overflow-hidden border border-gray-800 bg-gray-900 max-h-[450px]">
                <img 
                  src={fullscreenMaterial.content_json.imageUrl} 
                  alt="Slide Image" 
                  className="w-full h-[450px] object-cover"
                />
              </div>
            )}

            {/* Mindmap Fullscreen */}
            {fullscreenMaterial.content_json?.mindMap && (
              <div className="p-8 bg-gray-900/80 rounded-3xl border border-gray-800">
                <h3 className="text-xl font-bold text-indigo-400 mb-4 flex items-center">
                  <BookOpen className="w-6 h-6 mr-2" /> Peta Konsep Utama
                </h3>
                <div className="flex flex-wrap gap-4">
                  {fullscreenMaterial.content_json.mindMap.map((item: string, idx: number) => (
                    <span key={idx} className="px-5 py-3 bg-indigo-900/50 text-indigo-200 rounded-2xl text-base font-bold border border-indigo-700/50 shadow-inner">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Material Cards Fullscreen */}
            {fullscreenMaterial.content_json?.materials && (
              <div className="space-y-8">
                {fullscreenMaterial.content_json.materials.map((m: any, idx: number) => (
                  <div key={idx} className="p-8 bg-gray-900/90 rounded-3xl border border-gray-800 space-y-4 shadow-2xl">
                    <h4 className="text-2xl font-bold text-white border-b border-gray-800 pb-3">{idx + 1}. {m.title}</h4>
                    <p className="text-gray-200 text-lg md:text-xl leading-relaxed whitespace-pre-line font-normal">{m.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuruDashboard() {
  const location = useLocation();

  if (location.pathname.startsWith('/dashboard/soal')) {
    return <CreateQuestions />;
  }
  if (location.pathname.startsWith('/dashboard/laporan')) {
    return <GradeReports />;
  }

  return <MaterialGenerator />;
}
