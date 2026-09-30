import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { BookOpen, Sparkles, Loader2, Save, Trash2, Eye, X, Send, Edit3, Maximize2, Minimize2, Image, PlusCircle, Check, Film, Video, ExternalLink, FileText, CheckCircle2, Search, LayoutGrid, List, Calendar, Layers, HelpCircle } from 'lucide-react';
import { generateMaterialApi } from '../../lib/aiService';
import MediaViewer from '../../components/MediaViewer';
import CreateQuestions from './CreateQuestions';
import GradeReports from './GradeReports';
import CreateModulAjar, { extractMateriTitleFromModule } from './CreateModulAjar';
import GuruLihatCp from './GuruLihatCp';
import InteractiveBahanAjar from '../../components/InteractiveBahanAjar';

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

  const [editingSavedMaterial, setEditingSavedMaterial] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Filter & Tampilan Daftar Bahan Ajar States
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialSubjectFilter, setMaterialSubjectFilter] = useState('ALL');
  const [materialClassFilter, setMaterialClassFilter] = useState('ALL');
  const [materialViewMode, setMaterialViewMode] = useState<'grid' | 'table'>('grid');

  // Modul Ajar Acuan States
  const [savedModules, setSavedModules] = useState<any[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedMeetingIndex, setSelectedMeetingIndex] = useState<string>('ALL');
  const [useManualTopic, setUseManualTopic] = useState<boolean>(false);

  const [form, setForm] = useState({
    subject: '',
    grade: '',
    class_id: '',
    topic: '',
    description: '',
    mediaPreference: 'both' // 'both', 'video', 'image'
  });

  useEffect(() => {
    fetchClasses();
    fetchTeacherSubjects();
    fetchSavedMaterials();
    fetchSavedModules();
  }, [user]);

  async function fetchClasses() {
    const { data } = await supabase.from('classes').select('id, name').order('name');
    if (data) setClasses(data);
  }

  // Helper for safe formatting of kegiatan inti (supports string or object)
  const formatKegiatanIntiSummary = (kegiatanInti: any): string => {
    if (!kegiatanInti) return '-';
    if (typeof kegiatanInti === 'string') {
      return kegiatanInti.slice(0, 180) + (kegiatanInti.length > 180 ? '...' : '');
    }
    if (typeof kegiatanInti === 'object') {
      if (Array.isArray(kegiatanInti.sintaks) && kegiatanInti.sintaks.length > 0) {
        return kegiatanInti.sintaks
          .map((s: any) => `${s.tahap || 'Tahap'}: ${s.aktivitasSiswa || s.aktivitasGuru || ''}`)
          .filter(Boolean)
          .join('; ')
          .slice(0, 200) + '...';
      }
      if (kegiatanInti.deskripsi) return String(kegiatanInti.deskripsi).slice(0, 180);
    }
    return String(kegiatanInti).slice(0, 180);
  };

  async function fetchSavedModules() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('modul_ajar')
        .select('*')
        .eq('guru_id', user.id)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setSavedModules(data);

        // Check if modulId is present in URL search params to auto-select
        const params = new URLSearchParams(window.location.search);
        const mId = params.get('modulId');
        if (mId) {
          const matched = data.find(m => m.id === mId);
          if (matched) {
            setTimeout(() => {
              setSelectedModuleId(mId);
              setSelectedMeetingIndex('ALL');
              applyModuleSelection(matched, 'ALL');
            }, 100);
          }
        }
      }
    } catch (err) {
      console.warn('Gagal memuat daftar modul ajar:', err);
    }
  }

  const applyModuleSelection = (mod: any, meetingIdxStr: string = 'ALL') => {
    // Normalize grade
    let gradeVal = '10';
    const rawGrade = (mod.grade || '').toUpperCase();
    if (rawGrade.includes('XII') || rawGrade.includes('12')) gradeVal = '12';
    else if (rawGrade.includes('XI') || rawGrade.includes('11')) gradeVal = '11';
    else if (rawGrade.includes('X') || rawGrade.includes('10')) gradeVal = '10';

    const subjectVal = mod.subject_name || form.subject;
    const materiTitle = extractMateriTitleFromModule(mod);
    const cleanTitle = materiTitle || (mod.title ? mod.title.replace(/^Modul Ajar:\s*/i, '') : mod.subject_name);

    const cJson = mod.content_json || {};
    const pertemuanList = Array.isArray(cJson.pertemuan) ? cJson.pertemuan : [];

    if (meetingIdxStr === 'ALL') {
      let topicVal = cleanTitle;
      const descVal = `Bahan Ajar ini mengacu pada Modul Ajar Kurikulum Merdeka:\n• Dokumen / Materi: ${cleanTitle}\n• Capaian Pembelajaran: ${mod.cp || '-'}\n• Model Pembelajaran: ${mod.metode || 'Problem-Based Learning'}\n• Alokasi Waktu: ${mod.alokasi_waktu || '2 x 45 Menit'}\nSajikan bahan ajar menyeluruh yang selaras dengan seluruh alur pertemuan pada modul tersebut.`;

      setForm(prev => ({
        ...prev,
        subject: subjectVal,
        grade: gradeVal,
        topic: topicVal,
        description: descVal
      }));
    } else {
      const idx = parseInt(meetingIdxStr, 10);
      const meeting = pertemuanList[idx] || pertemuanList[0];
      const meetingName = meeting?.nama || `Pertemuan ${idx + 1}`;
      const intiSummary = formatKegiatanIntiSummary(meeting?.kegiatanInti);

      setForm(prev => ({
        ...prev,
        subject: subjectVal,
        grade: gradeVal,
        topic: `${cleanTitle} - ${meetingName}`,
        description: `Bahan ajar khusus untuk ${meetingName} pada Modul Ajar: "${cleanTitle}".\n• Capaian Pembelajaran: ${mod.cp || '-'}\n• Model Pembelajaran: ${meeting?.metode || mod.metode || 'Problem-Based Learning'}\n• Alokasi: ${meeting?.alokasiWaktu || mod.alokasi_waktu || '2 x 45 Menit'}\n• Sintaks/Kegiatan Inti: ${intiSummary}`
      }));
    }
  };

  const handleSelectModule = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setSelectedMeetingIndex('ALL');

    if (!moduleId || moduleId === 'MANUAL') {
      setUseManualTopic(true);
      return;
    }

    setUseManualTopic(false);
    const mod = savedModules.find(m => m.id === moduleId);
    if (!mod) return;

    applyModuleSelection(mod, 'ALL');
  };

  const handleSelectMeeting = (meetingIdxStr: string) => {
    setSelectedMeetingIndex(meetingIdxStr);
    const mod = savedModules.find(m => m.id === selectedModuleId);
    if (!mod) return;

    applyModuleSelection(mod, meetingIdxStr);
  };

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
    const { data, error } = await supabase
      .from('teaching_materials')
      .select('*, class:classes(name)')
      .eq('guru_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSavedMaterials(data.filter((m: any) => m.guru_id === user.id));
    } else {
      setSavedMaterials([]);
    }
  }

  const handleGenerate = async () => {
    if (!form.subject || !form.grade || !form.topic) return alert('Lengkapi Mata Pelajaran, Tingkat Kelas, dan Topik');
    
    setLoading(true);
    setIsEditing(false);
    try {
      const selectedMod = savedModules.find(m => m.id === selectedModuleId);
      const cJson = selectedMod?.content_json || {};
      const pertemuanList = Array.isArray(cJson.pertemuan) ? cJson.pertemuan : [];

      const data = await generateMaterialApi({
        subject: form.subject,
        grade: form.grade,
        topic: form.topic,
        description: form.description,
        pertemuanList,
        pertemuanCount: pertemuanList.length,
        selectedMeetingIndex
      });
      
      // Ensure image fallback if missing
      if (!data.imageUrl) {
        data.imageUrl = `https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80`;
      }
      data.mediaType = form.mediaPreference || 'both';
      setResult(data);
    } catch (err: any) {
      alert(err.message || 'Gagal meracik bahan ajar');
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
      setForm({ subject: teacherSubjects[0] || '', grade: '', class_id: '', topic: '', description: '', mediaPreference: 'both' });
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

  const handleSaveEditedMaterial = async () => {
    if (!editingSavedMaterial) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('teaching_materials')
        .update({
          title: editingSavedMaterial.title,
          topic: editingSavedMaterial.topic,
          subject_name: editingSavedMaterial.subject_name,
          grade: editingSavedMaterial.grade,
          class_id: editingSavedMaterial.class_id,
          content_json: editingSavedMaterial.content_json
        })
        .eq('id', editingSavedMaterial.id);

      if (error) throw error;
      alert('Bahan ajar berhasil diperbarui!');
      setEditingSavedMaterial(null);
      fetchSavedMaterials();
    } catch (err: any) {
      alert('Gagal memperbarui bahan ajar: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Filter classes according to grade if selected
  const availableClasses = form.grade 
    ? classes.filter(c => c.name.toLowerCase().startsWith(form.grade.toLowerCase()) || c.name.includes(form.grade))
    : classes;

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bahan Ajar Cerdas (AI)</h1>
          <p className="text-gray-500">Buat materi pembelajaran interaktif lengkap dengan Gambar/Video Pembelajaran, Peta Konsep, dan Mode Presentasi Fullscreen.</p>
        </div>
        <Link
          to="/dashboard/modul"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-sm rounded-xl shadow-sm transition"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          Buat Modul Ajar Otomatis →
        </Link>
      </div>

      {/* Generator Form */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200">
        {/* Acuan Modul Ajar Selector */}
        <div className="mb-6 p-4 md:p-5 bg-gradient-to-br from-indigo-50/80 to-blue-50/50 rounded-2xl border border-indigo-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Acuan Modul Ajar (Capaian Pembelajaran Otomatis)
                </h3>
                <p className="text-xs text-gray-500">
                  Pilih Modul Ajar yang telah Anda racik sebelumnya agar materi terhubung langsung dengan Capaian Pembelajaran & Skenario Modul.
                </p>
              </div>
            </div>

            <Link
              to="/dashboard/cp"
              className="text-xs font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1 self-start md:self-auto"
            >
              <FileText className="w-3.5 h-3.5" />
              Lihat Repositori CP →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div className={selectedModuleId && selectedModuleId !== 'MANUAL' ? "md:col-span-2" : "md:col-span-3"}>
              <select
                value={selectedModuleId}
                onChange={e => handleSelectModule(e.target.value)}
                className="w-full p-3 text-xs font-semibold border border-indigo-200 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="">-- Pilih Modul Ajar yang Telah Dibuat (Rekomendasi) --</option>
                {savedModules.map(m => {
                  const mName = extractMateriTitleFromModule(m);
                  return (
                    <option key={m.id} value={m.id}>
                      📚 [{m.grade || 'Fase'}] {m.subject_name} • Materi: {mName} ({m.metode || 'PBL'})
                    </option>
                  );
                })}
                <option value="MANUAL">✏️ Mode Bebas: Ketik Topik & Capaian Manual (Tanpa Modul Ajar)</option>
              </select>
            </div>

            {selectedModuleId && selectedModuleId !== 'MANUAL' && (
              <div>
                {(() => {
                  const mod = savedModules.find(m => m.id === selectedModuleId);
                  const meetings = Array.isArray(mod?.content_json?.pertemuan) ? mod.content_json.pertemuan : [];
                  return (
                    <select
                      value={selectedMeetingIndex}
                      onChange={e => handleSelectMeeting(e.target.value)}
                      className="w-full p-3 text-xs font-semibold border border-indigo-200 rounded-xl bg-white text-indigo-900 focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    >
                      <option value="ALL">🌐 Seluruh Sesi (Rangkuman Modul)</option>
                      {meetings.map((meet: any, mIdx: number) => (
                        <option key={mIdx} value={String(mIdx)}>
                          📌 {meet.nama || `Pertemuan ${mIdx + 1}`}
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>
            )}
          </div>

          {/* If a module is selected, show summary pill card */}
          {selectedModuleId && selectedModuleId !== 'MANUAL' && (() => {
            const mod = savedModules.find(m => m.id === selectedModuleId);
            if (!mod) return null;
            const mName = extractMateriTitleFromModule(mod);
            return (
              <div className="mt-3.5 p-3.5 bg-white rounded-xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-indigo-900">{mName}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-semibold text-[11px]">
                      {mod.subject_name}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px]">
                      {mod.grade || 'Fase'}
                    </span>
                    {mod.metode && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-semibold text-[11px]">
                        {mod.metode}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-[11px] line-clamp-1">
                    <strong className="text-gray-700">Capaian Pembelajaran (CP):</strong> {mod.cp || '-'}
                  </p>
                </div>

                <span className="inline-flex items-center text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start md:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Acuan Terhubung
                </span>
              </div>
            );
          })()}
        </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-2">Topik / Capaian Utama</label>
            <input 
              type="text" 
              value={form.topic}
              onChange={e => setForm({...form, topic: e.target.value})}
              placeholder="Contoh: Sistem Pencernaan Manusia" 
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi Materi / Instruksi Khusus (Opsional - Agar AI Lebih Presisi)
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              placeholder="Contoh: Fokuskan pada penjelasan organ lambung & usus halus, enzim yang bekerja, serta penyakit pencernaan seperti maag dan diare."
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format Media yang Diinginkan
            </label>
            <select
              value={form.mediaPreference}
              onChange={e => setForm({...form, mediaPreference: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-gray-800 bg-gray-50"
            >
              <option value="both">🖼️ & 🎥 Gambar + Video YouTube</option>
              <option value="video">🎥 Video Pembelajaran YouTube</option>
              <option value="image">🖼️ Gambar Ilustrasi Saja</option>
            </select>
            <p className="text-[11px] text-gray-500 mt-1">Anda juga dapat mengganti atau mengunggah gambar/video sendiri setelah AI selesai.</p>
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={loading}
          className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition flex items-center justify-center disabled:opacity-70 shadow-sm"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
          {loading ? 'AI Sedang Meracik Materi & Media...' : 'Generate Bahan Ajar Interaktif'}
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
                {isEditing ? 'Selesai Edit' : 'Perbaiki Materi & Media'}
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
            {/* Supporting Media: Video / Image */}
            <MediaViewer
              imageUrl={result.imageUrl}
              videoUrl={result.videoUrl}
              mediaType={result.mediaType || 'both'}
              title={form.topic || 'Bahan Ajar Visual'}
              subject={form.subject || ''}
              isEditing={isEditing}
              onImageUrlChange={url => setResult({ ...result, imageUrl: url })}
              onVideoUrlChange={url => setResult({ ...result, videoUrl: url })}
              onMediaTypeChange={type => setResult({ ...result, mediaType: type })}
            />

            {/* Fun Fact & Real World Application */}
            {result.funFact && (
              <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200">
                <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" /> Tahukah Kamu? (Fun Fact Menarik)
                </h4>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={result.funFact}
                    onChange={e => setResult({ ...result, funFact: e.target.value })}
                    className="w-full p-2.5 mt-2 bg-white border border-amber-300 rounded-lg text-xs text-amber-950 font-medium"
                  />
                ) : (
                  <p className="text-amber-800 text-xs mt-1 leading-relaxed">{result.funFact}</p>
                )}
              </div>
            )}

            {result.realWorldApplication && (
              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200">
                <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" /> Penerapan Nyata & Kasus Seru
                </h4>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={result.realWorldApplication}
                    onChange={e => setResult({ ...result, realWorldApplication: e.target.value })}
                    className="w-full p-2.5 mt-2 bg-white border border-emerald-300 rounded-lg text-xs text-emerald-950 font-medium"
                  />
                ) : (
                  <p className="text-emerald-800 text-xs mt-1 leading-relaxed">{result.realWorldApplication}</p>
                )}
              </div>
            )}

            {/* Interactive Gamification & Peta Konsep Arena */}
            <InteractiveBahanAjar
              petaKonsep={result.petaKonsep}
              gamifikasi={result.gamifikasi}
              mindMapFallback={result.mindMap}
              topicTitle={form.topic || form.subject}
              pertemuanMateri={result.pertemuanMateri}
              isTeacherView={true}
            />

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

      {/* Saved Materials Section - Redesigned Clean & Structured View */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 overflow-hidden space-y-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Daftar Bahan Ajar Terbit</span>
              <span className="text-xs font-semibold text-gray-500 font-normal">
                · {savedMaterials.length} Materi Tersimpan
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Kelola materi pembelajaran interaktif yang telah Anda terbitkan untuk siswa per kelas.
            </p>
          </div>

          {/* View Mode Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 self-end md:self-auto">
            <button
              type="button"
              onClick={() => setMaterialViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                materialViewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kartu Rapih
            </button>
            <button
              type="button"
              onClick={() => setMaterialViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                materialViewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Tabel Ringkas
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        {savedMaterials.length > 0 && (() => {
          const uniqueSubjects = Array.from(new Set(savedMaterials.map(m => m.subject_name).filter(Boolean)));
          const uniqueClasses = Array.from(new Set(savedMaterials.map(m => m.class?.name || m.grade).filter(Boolean)));

          return (
            <div className="grid sm:grid-cols-3 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={materialSearch}
                  onChange={e => setMaterialSearch(e.target.value)}
                  placeholder="Cari judul atau topik bahan ajar..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={materialSubjectFilter}
                onChange={e => setMaterialSubjectFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Mata Pelajaran ({uniqueSubjects.length})</option>
                {uniqueSubjects.map((sub: any, idx: number) => (
                  <option key={idx} value={sub}>{sub}</option>
                ))}
              </select>

              <select
                value={materialClassFilter}
                onChange={e => setMaterialClassFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Kelas Target ({uniqueClasses.length})</option>
                {uniqueClasses.map((cls: any, idx: number) => (
                  <option key={idx} value={cls}>Kelas {cls}</option>
                ))}
              </select>
            </div>
          );
        })()}

        {(() => {
          const filteredMaterials = savedMaterials.filter(mat => {
            const matchesSearch =
              !materialSearch ||
              (mat.title || '').toLowerCase().includes(materialSearch.toLowerCase()) ||
              (mat.topic || '').toLowerCase().includes(materialSearch.toLowerCase()) ||
              (mat.subject_name || '').toLowerCase().includes(materialSearch.toLowerCase());

            const matchesSubject =
              materialSubjectFilter === 'ALL' || mat.subject_name === materialSubjectFilter;

            const clsName = mat.class?.name || mat.grade;
            const matchesClass =
              materialClassFilter === 'ALL' || String(clsName) === String(materialClassFilter);

            return matchesSearch && matchesSubject && matchesClass;
          });

          if (savedMaterials.length === 0) {
            return (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-700 font-semibold text-sm">Belum ada bahan ajar yang diterbitkan.</p>
                <p className="text-gray-400 text-xs mt-1">Gunakan generator Bahan Ajar AI di atas untuk meracik dan membagikan materi ke kelas.</p>
              </div>
            );
          }

          if (filteredMaterials.length === 0) {
            return (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-200 text-gray-500 text-xs">
                Tidak ada bahan ajar yang cocok dengan pencarian / filter yang dipilih.
              </div>
            );
          }

          if (materialViewMode === 'grid') {
            return (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredMaterials.map((mat, idx) => {
                  const subCount = Array.isArray(mat.content_json?.materials) ? mat.content_json.materials.length : 0;
                  const quizCount = Array.isArray(mat.content_json?.interactiveQuestions) ? mat.content_json.interactiveQuestions.length : 0;
                  const hasVideo = Boolean(mat.content_json?.videoUrl);
                  const hasImage = Boolean(mat.content_json?.imageUrl);
                  const dateFormatted = new Date(mat.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <div
                      key={mat.id}
                      className="group bg-white rounded-xl border border-gray-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between p-5"
                    >
                      <div>
                        {/* Quiet Metadata Header Line */}
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                          <div className="flex items-center gap-1.5 font-medium truncate">
                            <span className="font-bold text-indigo-700">{mat.subject_name || 'Mata Pelajaran'}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-700 font-semibold">Kelas {mat.class?.name || mat.grade}</span>
                            <span aria-hidden="true">·</span>
                            <span>Tingkat {mat.grade || '-'}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {dateFormatted}
                          </span>
                        </div>

                        {/* Title & Topic */}
                        <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-indigo-950 transition-colors line-clamp-2">
                          {idx + 1}. {mat.title || mat.topic}
                        </h3>
                        {mat.topic && mat.topic !== mat.title && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            Topik: <span className="text-gray-700 font-medium">{mat.topic}</span>
                          </p>
                        )}

                        {/* Clean Unboxed Content Summary Line */}
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" />
                            {subCount} Sub-Materi
                          </span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="flex items-center gap-1">
                            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                            {quizCount} Kuis Pemantik
                          </span>
                          {hasVideo && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">·</span>
                              <span className="flex items-center gap-1 text-red-700 font-medium">
                                <Film className="w-3.5 h-3.5" /> Video
                              </span>
                            </>
                          )}
                          {hasImage && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">·</span>
                              <span className="flex items-center gap-1 text-blue-700 font-medium">
                                <Image className="w-3.5 h-3.5" /> Visual
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedMaterial(mat)}
                            className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" /> Buka Materi
                          </button>
                          <button
                            type="button"
                            onClick={() => setFullscreenMaterial(mat)}
                            className="px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                            title="Layar Penuh Presentasi"
                          >
                            <Maximize2 className="w-3.5 h-3.5" /> Presentasi
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingSavedMaterial(JSON.parse(JSON.stringify(mat)))}
                            className="px-2.5 py-1.5 text-amber-800 hover:bg-amber-50 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                            title="Edit Bahan Ajar"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(mat.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Hapus Bahan Ajar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          return (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm text-gray-600 border-collapse">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-10">No</th>
                    <th className="px-4 py-3">Judul & Topik Bahan Ajar</th>
                    <th className="px-4 py-3">Mata Pelajaran & Kelas</th>
                    <th className="px-4 py-3">Kelengkapan</th>
                    <th className="px-4 py-3">Terbit</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMaterials.map((mat, idx) => {
                    const subCount = Array.isArray(mat.content_json?.materials) ? mat.content_json.materials.length : 0;
                    return (
                      <tr key={mat.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3.5 font-semibold text-gray-500 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3.5 max-w-xs">
                          <div className="font-bold text-gray-900 line-clamp-1">{mat.title || mat.topic}</div>
                          <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{mat.topic}</div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-gray-900 text-xs">{mat.subject_name || '-'}</div>
                          <div className="text-xs text-indigo-700 font-medium mt-0.5">
                            Kelas {mat.class?.name || mat.grade} · Tingkat {mat.grade || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                          <span>{subCount} Sub-Materi</span>
                          {mat.content_json?.videoUrl && <span> · Video</span>}
                          {mat.content_json?.imageUrl && <span> · Visual</span>}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(mat.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedMaterial(mat)}
                              className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                              title="Lihat Detail"
                            >
                              <Eye className="w-3.5 h-3.5" /> Lihat
                            </button>
                            <button
                              onClick={() => setFullscreenMaterial(mat)}
                              className="px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                              title="Modus Presentasi"
                            >
                              <Maximize2 className="w-3.5 h-3.5" /> Presentasi
                            </button>
                            <button
                              onClick={() => setEditingSavedMaterial(JSON.parse(JSON.stringify(mat)))}
                              className="px-2.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                              title="Edit Bahan Ajar"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMaterial(mat.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
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
              {/* Media Viewer in Modal */}
              <MediaViewer
                imageUrl={selectedMaterial.content_json?.imageUrl}
                videoUrl={selectedMaterial.content_json?.videoUrl}
                mediaType={selectedMaterial.content_json?.mediaType || 'both'}
                title={selectedMaterial.title}
                subject={selectedMaterial.subject || ''}
              />

              {/* Fun Fact */}
              {selectedMaterial.content_json?.funFact && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                  <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-4 h-4 text-amber-600" /> Tahukah Kamu? (Fun Fact)
                  </h4>
                  <p className="text-amber-800 text-xs leading-relaxed">{selectedMaterial.content_json.funFact}</p>
                </div>
              )}

              {/* Interactive Gamification & Peta Konsep Arena */}
              <InteractiveBahanAjar
                petaKonsep={selectedMaterial.content_json?.petaKonsep}
                gamifikasi={selectedMaterial.content_json?.gamifikasi}
                mindMapFallback={selectedMaterial.content_json?.mindMap}
                topicTitle={selectedMaterial.topic || selectedMaterial.title}
                pertemuanMateri={selectedMaterial.content_json?.pertemuanMateri}
                isTeacherView={true}
              />

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
            {/* Supporting Media in Fullscreen */}
            <MediaViewer
              imageUrl={fullscreenMaterial.content_json?.imageUrl}
              videoUrl={fullscreenMaterial.content_json?.videoUrl}
              mediaType={fullscreenMaterial.content_json?.mediaType || 'both'}
              title={fullscreenMaterial.title}
              subject={fullscreenMaterial.subject || ''}
              className="max-w-5xl mx-auto"
            />

            {/* Interactive Gamification & Peta Konsep Arena in Fullscreen */}
            <div className="bg-white text-gray-900 rounded-3xl p-6 shadow-2xl">
              <InteractiveBahanAjar
                petaKonsep={fullscreenMaterial.content_json?.petaKonsep}
                gamifikasi={fullscreenMaterial.content_json?.gamifikasi}
                mindMapFallback={fullscreenMaterial.content_json?.mindMap}
                topicTitle={fullscreenMaterial.topic || fullscreenMaterial.title}
                pertemuanMateri={fullscreenMaterial.content_json?.pertemuanMateri}
                isTeacherView={true}
              />
            </div>

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

      {/* Edit Saved Material Modal */}
      {editingSavedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-amber-50">
              <div>
                <h3 className="text-lg font-bold text-amber-950 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-amber-600" /> Edit Bahan Ajar
                </h3>
                <p className="text-xs text-amber-700">Perbarui judul, topik, target kelas, media video/gambar, atau isi materi yang tersimpan.</p>
              </div>
              <button 
                onClick={() => setEditingSavedMaterial(null)} 
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Judul Bahan Ajar</label>
                  <input
                    type="text"
                    value={editingSavedMaterial.title || ''}
                    onChange={e => setEditingSavedMaterial({ ...editingSavedMaterial, title: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Topik Utama</label>
                  <input
                    type="text"
                    value={editingSavedMaterial.topic || ''}
                    onChange={e => setEditingSavedMaterial({ ...editingSavedMaterial, topic: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    value={editingSavedMaterial.subject_name || ''}
                    onChange={e => setEditingSavedMaterial({ ...editingSavedMaterial, subject_name: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Target Kelas</label>
                  <select
                    value={editingSavedMaterial.class_id || ''}
                    onChange={e => setEditingSavedMaterial({ ...editingSavedMaterial, class_id: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>Kelas {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Media Settings in Edit Modal */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-red-600" /> Media Gambar & Video
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">URL Video (YouTube / MP4)</label>
                    <input
                      type="text"
                      value={editingSavedMaterial.content_json?.videoUrl || ''}
                      onChange={e => {
                        const updated = { ...editingSavedMaterial.content_json, videoUrl: e.target.value };
                        setEditingSavedMaterial({ ...editingSavedMaterial, content_json: updated });
                      }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">URL Gambar Ilustrasi</label>
                    <input
                      type="text"
                      value={editingSavedMaterial.content_json?.imageUrl || ''}
                      onChange={e => {
                        const updated = { ...editingSavedMaterial.content_json, imageUrl: e.target.value };
                        setEditingSavedMaterial({ ...editingSavedMaterial, content_json: updated });
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Edit Materials Content List */}
              {editingSavedMaterial.content_json?.materials && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <h4 className="font-bold text-gray-900 text-sm">Sunting Isi Submateri</h4>
                  {editingSavedMaterial.content_json.materials.map((m: any, mIdx: number) => (
                    <div key={mIdx} className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/60 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Judul Submateri #{mIdx + 1}</label>
                        <input
                          type="text"
                          value={m.title}
                          onChange={e => {
                            const newMats = [...editingSavedMaterial.content_json.materials];
                            newMats[mIdx].title = e.target.value;
                            setEditingSavedMaterial({
                              ...editingSavedMaterial,
                              content_json: { ...editingSavedMaterial.content_json, materials: newMats }
                            });
                          }}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Isi / Penjelasan Submateri</label>
                        <textarea
                          rows={3}
                          value={m.content}
                          onChange={e => {
                            const newMats = [...editingSavedMaterial.content_json.materials];
                            newMats[mIdx].content = e.target.value;
                            setEditingSavedMaterial({
                              ...editingSavedMaterial,
                              content_json: { ...editingSavedMaterial.content_json, materials: newMats }
                            });
                          }}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingSavedMaterial(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEditedMaterial}
                className="px-5 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition flex items-center gap-1.5 disabled:opacity-70 shadow-sm"
              >
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuruDashboard() {
  const location = useLocation();

  if (location.pathname.startsWith('/dashboard/cp')) {
    return <GuruLihatCp />;
  }
  if (location.pathname.startsWith('/dashboard/bahan-ajar')) {
    return <MaterialGenerator />;
  }
  if (location.pathname.startsWith('/dashboard/soal')) {
    return <CreateQuestions />;
  }
  if (location.pathname.startsWith('/dashboard/laporan')) {
    return <GradeReports />;
  }
  if (location.pathname.startsWith('/dashboard/modul')) {
    return <CreateModulAjar />;
  }

  // Default: Lihat CP as the primary top menu item
  return <GuruLihatCp />;
}
