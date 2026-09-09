import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import {
  BookOpen,
  Sparkles,
  Loader2,
  FileDown,
  Printer,
  Save,
  Trash2,
  Eye,
  Edit3,
  CheckCircle2,
  Layers,
  School,
  Calendar,
  Clock,
  ChevronRight,
  BookMarked,
  HelpCircle,
  RotateCcw,
  Check
} from 'lucide-react';
import { generateModulAjarApi } from '../../lib/aiService';
import { exportModulAjarToDocx } from '../../lib/modulDocxGenerator';

const METODE_OPTIONS = [
  {
    id: 'Problem-Based Learning (PBL)',
    label: 'Problem-Based Learning (PBL)',
    desc: 'Peserta didik memecahkan masalah kontekstual nyata melalui penyelidikan mendalam dan kolaboratif.',
    sintaks: ['Orientasi Masalah', 'Organisasi Belajar', 'Penyelidikan Mandiri/Kelompok', 'Pengembangan & Penyajian Solusi', 'Evaluasi Pemecahan Masalah']
  },
  {
    id: 'Project-Based Learning (PjBL)',
    label: 'Project-Based Learning (PjBL)',
    desc: 'Pembelajaran berbasis proyek menghasilkan karya/produk nyata yang bermanfaat dan otentik.',
    sintaks: ['Pertanyaan Mendasar', 'Perencanaan Proyek', 'Penyusunan Jadwal', 'Monitoring Kemajuan', 'Pengujian Hasil/Produk', 'Evaluasi Pengalaman']
  },
  {
    id: 'Discovery Learning',
    label: 'Discovery Learning',
    desc: 'Peserta didik aktif menemukan konsep dan prinsip secara mandiri melalui data dan pembuktian.',
    sintaks: ['Stimulasi/Rangsangan', 'Identifikasi Masalah', 'Pengumpulan Data', 'Pengolahan Data', 'Pembuktian (Verifikasi)', 'Generalisasi/Kesimpulan']
  },
  {
    id: 'Inquiry-Based Learning',
    label: 'Inquiry-Based Learning',
    desc: 'Penyelidikan ilmiah berbasis observasi fenomena, perumusan hipotesis, dan pengujian empiris.',
    sintaks: ['Orientasi Fenomena', 'Perumusan Masalah & Hipotesis', 'Eksplorasi & Pengumpulan Data', 'Pengujian Hipotesis', 'Penarikan Kesimpulan & Refleksi']
  },
  {
    id: 'Pembelajaran Mendalam (Deep Learning)',
    label: 'Pembelajaran Mendalam (Deep Learning)',
    desc: 'Fokus integratif pada 3 pilar: Berkesadaran (Mindful), Bermakna (Meaningful), dan Menyenangkan (Joyful).',
    sintaks: ['Koneksi Awal & Kesadaran Belajar', 'Eksplorasi Konsep Kontekstual', 'Penyelidikan Kritis & Aplikasi Nyata', 'Aksi Solutif Kolaboratif', 'Refleksi Metakognisi']
  },
  {
    id: 'Teaching at the Right Level (TaRL)',
    label: 'Teaching at the Right Level (TaRL)',
    desc: 'Pendekatan berpusat pada kesiapan belajar aktual peserta didik dengan pengelompokan fleksibel.',
    sintaks: ['Asesmen Awal Kesiapan', 'Diferensiasi Kelompok Belajar', 'Bimbingan Terfokus Berjenjang', 'Unjuk Pemahaman Mandiri', 'Refleksi & Asesmen Lanjutan']
  },
  {
    id: 'Flipped Classroom',
    label: 'Flipped Classroom',
    desc: 'Materi dasar dipelajari mandiri sebelum kelas, ruang kelas dimanfaatkan untuk pendalaman intensif.',
    sintaks: ['Eksplorasi Mandiri Pra-Kelas', 'Klarifikasi Konsep & Pertanyaan Kunci', 'Aktivitas Pemecahan Kasus Kelompok', 'Presentasi & Umpan Balik', 'Konsolidasi & Refleksi']
  },
  {
    id: 'Cooperative Learning (Jigsaw/STAD)',
    label: 'Cooperative Learning (Jigsaw / STAD)',
    desc: 'Kerja sama tim terstruktur di mana tiap peserta didik bertanggung jawab atas penguasaan submateri.',
    sintaks: ['Penyampaian Tujuan & Pengelompokan', 'Diskusi Tim Ahli', 'Penyebaran ke Kelompok Asal', 'Kuis & Evaluasi Hasil Tim', 'Pemberian Apresiasi/Rekognisi']
  }
];

const CONTOH_CP = [
  {
    label: 'Biologi (Ekosistem & Keanekaragaman)',
    cp: 'Peserta didik mampu menganalisis keterkaitan interaksi komponen biotik dan abiotik dalam ekosistem, mengidentifikasi ancaman degradasi lingkungan lokal di Garut, serta merancang solusi konservasi keanekaragaman hayati secara berkelanjutan.'
  },
  {
    label: 'Matematika (Fungsi & Peluang)',
    cp: 'Peserta didik dapat memodelkan fenomena kontekstual menggunakan konsep fungsi kuadrat dan eksponensial, menganalisis peluang kejadian majemuk, serta menggunakan penalaran matematis untuk memecahkan masalah sehari-hari.'
  },
  {
    label: 'Bahasa Indonesia (Teks Negosiasi & Argumentasi)',
    cp: 'Peserta didik mampu mengevaluasi struktur gagasan dan kebahasaan teks argumentasi serta negosiasi, mengonstruksi argumen kritis yang persuasif dan santun, serta mempresentasikannya secara efektif dalam forum diskusi.'
  },
  {
    label: 'Fisika (Energi Terbarukan)',
    cp: 'Peserta didik mampu menganalisis konsep perubahan energi dan hukum kekekalan energi, mengidentifikasi potensi energi terbarukan ramah lingkungan di lingkungan sekitar, serta merancang model pembangkit energi alternatif sederhana.'
  },
  {
    label: 'Informatika (Algoritma & Pemrograman)',
    cp: 'Peserta didik mampu menerapkan berpikir komputasional untuk menganalisis dan memecahkan persoalan terstruktur, merancang algoritma yang efisien, serta mengimplementasikannya dalam kode pemrograman terstruktur.'
  }
];

export default function CreateModulAjar() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'saved'>('create');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  // School and User identity state
  const [schoolSettings, setSchoolSettings] = useState({
    nama_sekolah: 'SMAN 21 Garut',
    npsn: '20209194',
    alamat_sekolah: 'Jl. Raya Talegong No. 21, Kec. Talegong, Kab. Garut, Jawa Barat 44167',
    tahun_pelajaran: '2026/2027',
    semester: 'Ganjil',
    nama_kepsek: 'Agus Supriatna, S.Pd., M.Si.'
  });

  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [savedModules, setSavedModules] = useState<any[]>([]);
  const [selectedSavedModule, setSelectedSavedModule] = useState<any | null>(null);

  // Generator form
  const [formData, setFormData] = useState({
    subject: '',
    customSubject: '',
    grade: 'Fase E (Kelas X)',
    cp: '',
    metode: 'Problem-Based Learning (PBL)',
    pertemuanCount: 2,
    alokasiWaktu: '2 x 45 Menit (2 JP)'
  });

  // Generated Module Result
  const [result, setResult] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchSchoolSettings();
    fetchTeacherSubjects();
    fetchSavedModules();
  }, [user]);

  async function fetchSchoolSettings() {
    try {
      const { data } = await supabase.from('app_settings').select('*').limit(1).single();
      if (data) {
        setSchoolSettings({
          nama_sekolah: data.nama_sekolah || 'SMAN 21 Garut',
          npsn: data.npsn || '20209194',
          alamat_sekolah: data.alamat_sekolah || 'Jl. Raya Talegong No. 21, Kec. Talegong, Kab. Garut, Jawa Barat 44167',
          tahun_pelajaran: data.tahun_pelajaran || '2026/2027',
          semester: data.semester || 'Ganjil',
          nama_kepsek: data.nama_kepsek || 'Agus Supriatna, S.Pd., M.Si.'
        });
      }
    } catch (err) {
      console.warn('Gagal memuat pengaturan sekolah:', err);
    }
  }

  async function fetchTeacherSubjects() {
    if (!user) return;
    try {
      const { data } = await supabase.from('subjects').select('name').eq('guru_id', user.id);
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
        if (parsed.length > 0 && !formData.subject) {
          setFormData(prev => ({ ...prev, subject: parsed[0] }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchSavedModules() {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('modul_ajar')
        .select('*')
        .eq('guru_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setSavedModules(data);
    } catch (err) {
      console.error(err);
    }
  }

  const selectedSubjectFinal = formData.subject === 'OTHER' ? formData.customSubject : formData.subject;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectFinal) {
      return alert('Pilih atau isi mata pelajaran yang diampu.');
    }
    if (!formData.cp || formData.cp.trim().length < 15) {
      return alert('Masukkan Capaian Pembelajaran (CP) dengan lebih lengkap.');
    }

    setLoading(true);
    setIsEditing(false);
    setSavedSuccess(false);

    try {
      const payload = {
        subject: selectedSubjectFinal,
        cp: formData.cp,
        grade: formData.grade,
        metode: formData.metode,
        pertemuanCount: Number(formData.pertemuanCount) || 2,
        alokasiWaktu: formData.alokasiWaktu,
        namaGuru: user?.name || 'Guru Pengampu',
        nipGuru: user?.username || '-',
        namaSekolah: schoolSettings.nama_sekolah,
        npsn: schoolSettings.npsn,
        alamatSekolah: schoolSettings.alamat_sekolah,
        tahunPelajaran: schoolSettings.tahun_pelajaran,
        semester: schoolSettings.semester,
        namaKepsek: schoolSettings.nama_kepsek
      };

      const data = await generateModulAjarApi(payload);
      setResult(data);
    } catch (err: any) {
      alert(err.message || 'Gagal meracik Modul Ajar AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!result || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('modul_ajar').insert([
        {
          guru_id: user.id,
          subject_name: selectedSubjectFinal || result.identitas?.mataPelajaran || 'Mata Pelajaran',
          grade: formData.grade || result.identitas?.fase || 'Fase E (Kelas X)',
          cp: formData.cp || result.capaianPembelajaran || '',
          metode: formData.metode || result.modelMetode?.nama || '',
          pertemuan_count: Number(formData.pertemuanCount) || 2,
          alokasi_waktu: formData.alokasiWaktu || '2 x 45 Menit',
          title: `Modul Ajar: ${selectedSubjectFinal || 'Mapel'} - ${formData.metode}`,
          content_json: result
        }
      ]);

      if (error) throw error;
      setSavedSuccess(true);
      fetchSavedModules();
      setTimeout(() => setSavedSuccess(false), 4000);
      alert('Modul Ajar berhasil disimpan ke database!');
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan modul ajar ke database.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadDocx = async (dataToExport = result) => {
    if (!dataToExport) return;
    setExportingDocx(true);
    try {
      const subject = dataToExport.identitas?.mataPelajaran || selectedSubjectFinal || 'Modul_Ajar';
      const cleanSubject = subject.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Modul_Ajar_${cleanSubject}_SMAN21Garut.docx`;
      await exportModulAjarToDocx(dataToExport, filename);
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor file Word (.docx).');
    } finally {
      setExportingDocx(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleDeleteSavedModule = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus arsip Modul Ajar ini?')) return;
    try {
      const { error } = await supabase.from('modul_ajar').delete().eq('id', id);
      if (error) throw error;
      if (selectedSavedModule?.id === id) {
        setSelectedSavedModule(null);
      }
      fetchSavedModules();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus modul ajar.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-6 text-white shadow-md print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-sm mb-2 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Generator Modul Ajar Otomatis (Deep Learning)
            </div>
            <h1 className="text-2xl font-bold">Modul Ajar Pembelajaran Mendalam</h1>
            <p className="text-blue-100 text-sm mt-1 max-w-2xl">
              Rancang modul ajar Kurikulum Merdeka secara instan dengan sintaks metode pembelajaran terstruktur,
              terintegrasi otomatis dengan identitas akun guru, NPSN, dan profil {schoolSettings.nama_sekolah}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center gap-2 ${
                activeTab === 'create'
                  ? 'bg-white text-blue-800'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Buat Modul Baru
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center gap-2 ${
                activeTab === 'saved'
                  ? 'bg-white text-blue-800'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <BookMarked className="w-4 h-4" />
              Arsip Modul ({savedModules.length})
            </button>
          </div>
        </div>

        {/* Identity preview strip */}
        <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-blue-200 block">Guru Penyusun:</span>
            <span className="font-semibold text-white truncate block">{user?.name}</span>
          </div>
          <div>
            <span className="text-blue-200 block">NIP / ID Guru:</span>
            <span className="font-semibold text-white">{user?.username || '-'}</span>
          </div>
          <div>
            <span className="text-blue-200 block">Satuan Pendidikan:</span>
            <span className="font-semibold text-white truncate block">{schoolSettings.nama_sekolah} (NPSN: {schoolSettings.npsn})</span>
          </div>
          <div>
            <span className="text-blue-200 block">Tahun / Semester:</span>
            <span className="font-semibold text-white">{schoolSettings.tahun_pelajaran} • {schoolSettings.semester}</span>
          </div>
        </div>
      </div>

      {/* TAB 1: CREATE FORM & RESULT */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Input Form Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm print:hidden">
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                {/* 1. Mata Pelajaran */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    Mata Pelajaran yang Diampu
                  </label>
                  <select
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                    required
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
                    {teacherSubjects.length > 0 && (
                      <optgroup label="Mata Pelajaran Anda">
                        {teacherSubjects.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Daftar Mata Pelajaran SMA">
                      <option value="Matematika">Matematika</option>
                      <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                      <option value="Bahasa Inggris">Bahasa Inggris</option>
                      <option value="Biologi">Biologi</option>
                      <option value="Fisika">Fisika</option>
                      <option value="Kimia">Kimia</option>
                      <option value="Informatika">Informatika</option>
                      <option value="Sejarah">Sejarah</option>
                      <option value="Geografi">Geografi</option>
                      <option value="Ekonomi">Ekonomi</option>
                      <option value="Sosiologi">Sosiologi</option>
                      <option value="Pendidikan Pancasila (PPKn)">Pendidikan Pancasila (PPKn)</option>
                      <option value="Pendidikan Agama Islam (PAI)">Pendidikan Agama Islam (PAI)</option>
                      <option value="PJOK">PJOK</option>
                      <option value="Seni Budaya">Seni Budaya</option>
                      <option value="Prakarya & Kewirausahaan (PKWU)">Prakarya & Kewirausahaan (PKWU)</option>
                      <option value="Bahasa Sunda">Bahasa Sunda</option>
                      <option value="Bimbingan Konseling (BK)">Bimbingan Konseling (BK)</option>
                    </optgroup>
                    <option value="OTHER">Lainnya (Ketik Manual)...</option>
                  </select>

                  {formData.subject === 'OTHER' && (
                    <input
                      type="text"
                      placeholder="Ketik nama mata pelajaran..."
                      value={formData.customSubject}
                      onChange={e => setFormData({ ...formData, customSubject: e.target.value })}
                      className="mt-2 w-full p-2.5 border border-blue-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  )}
                </div>

                {/* 2. Jenjang / Fase */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Fase & Tingkat Kelas
                  </label>
                  <select
                    value={formData.grade}
                    onChange={e => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="Fase E (Kelas X)">Fase E (Kelas X SMA)</option>
                    <option value="Fase F (Kelas XI)">Fase F (Kelas XI SMA)</option>
                    <option value="Fase F (Kelas XII)">Fase F (Kelas XII SMA)</option>
                  </select>
                </div>

                {/* 3. Jumlah Pertemuan & Alokasi Waktu */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Pertemuan
                    </label>
                    <select
                      value={formData.pertemuanCount}
                      onChange={e => setFormData({ ...formData, pertemuanCount: Number(e.target.value) })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                    >
                      <option value={1}>1 Pertemuan</option>
                      <option value={2}>2 Pertemuan</option>
                      <option value={3}>3 Pertemuan</option>
                      <option value={4}>4 Pertemuan</option>
                      <option value={5}>5 Pertemuan</option>
                      <option value={6}>6 Pertemuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-1">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Alokasi JP
                    </label>
                    <select
                      value={formData.alokasiWaktu}
                      onChange={e => setFormData({ ...formData, alokasiWaktu: e.target.value })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                    >
                      <option value="2 x 45 Menit (2 JP)">2 x 45 Menit (2 JP)</option>
                      <option value="3 x 45 Menit (3 JP)">3 x 45 Menit (3 JP)</option>
                      <option value="4 x 45 Menit (4 JP)">4 x 45 Menit (4 JP)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Pilihan Metode Pembelajaran */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Metode Pembelajaran (Sistem Akan Menyusun Sintaks Pembelajaran Sesuai Metode Ini)
                </label>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {METODE_OPTIONS.map(m => {
                    const isSelected = formData.metode === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setFormData({ ...formData, metode: m.id })}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-bold text-xs ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                            {m.label}
                          </p>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {m.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. Capaian Pembelajaran (CP) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-bold text-gray-800">
                    Capaian Pembelajaran (CP) / Materi Utama
                  </label>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>Template Cepat:</span>
                    {CONTOH_CP.slice(0, 3).map((ex, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, cp: ex.cp });
                          if (!formData.subject) {
                            const sub = ex.label.split(' ')[0];
                            setFormData(prev => ({ ...prev, subject: sub, cp: ex.cp }));
                          }
                        }}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-medium"
                      >
                        {ex.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={formData.cp}
                  onChange={e => setFormData({ ...formData, cp: e.target.value })}
                  placeholder="Contoh: Peserta didik mampu menganalisis keterkaitan interaksi komponen biotik dan abiotik dalam ekosistem, mengidentifikasi ancaman kerusakan lingkungan di sekitar Garut, serta merancang solusi pelestarian lingkungan hidup..."
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                  required
                />
              </div>

              {/* Submit button */}
              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-amber-300" />}
                  {loading ? 'AI Sedang Meracik Modul Ajar Pembelajaran Mendalam...' : '⚡ Buat Modul Ajar Otomatis'}
                </button>
              </div>
            </form>
          </div>

          {/* Loading Indicator Overlay */}
          {loading && (
            <div className="bg-white rounded-2xl p-10 border border-blue-100 text-center space-y-4 shadow-sm">
              <div className="inline-block p-4 bg-blue-50 rounded-full text-blue-600 animate-pulse">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Merancang Modul Ajar Pembelajaran Mendalam</h3>
              <p className="text-sm text-gray-500 max-w-lg mx-auto">
                Sistem AI sedang menganalisis Capaian Pembelajaran, memetakan 3 pilar Deep Learning (Mindful, Meaningful, Joyful),
                dan menyusun sintaks operasional untuk {formData.pertemuanCount} pertemuan...
              </p>
              <div className="w-48 h-1.5 bg-blue-100 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full animate-indeterminate" />
              </div>
            </div>
          )}

          {/* Result View */}
          {result && !loading && (
            <div className="space-y-4">
              {/* Action Toolbar */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                  <span className="font-bold text-gray-900 text-sm">
                    Modul Ajar Siap: {result.identitas?.mataPelajaran || selectedSubjectFinal} ({result.pertemuan?.length || formData.pertemuanCount} Pertemuan)
                  </span>
                  {savedSuccess && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Tersimpan
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadDocx(result)}
                    disabled={exportingDocx}
                    className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
                  >
                    {exportingDocx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                    {exportingDocx ? 'Memproses Word...' : 'Unduh Word (.docx)'}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak / Unduh PDF
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToDatabase}
                    disabled={saving}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {saving ? 'Menyimpan...' : 'Simpan ke Database'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {isEditing ? 'Selesai Edit' : 'Edit Teks'}
                  </button>
                </div>
              </div>

              {/* Formal Printable Document Preview Container */}
              <div
                id="printable-modul"
                className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm max-w-5xl mx-auto print:p-0 print:border-none print:shadow-none text-gray-900 font-serif leading-relaxed"
              >
                {/* 1. KOP SURAT FORMAL */}
                <div className="text-center border-b-4 border-double border-gray-800 pb-4 mb-6">
                  <h3 className="text-sm md:text-base font-bold tracking-wider text-gray-800 uppercase">
                    Pemerintah Daerah Provinsi Jawa Barat
                  </h3>
                  <h4 className="text-sm md:text-base font-bold tracking-wider text-gray-800 uppercase">
                    Dinas Pendidikan • Cabang Dinas Pendidikan Wilayah XI
                  </h4>
                  <h2 className="text-xl md:text-2xl font-black tracking-wide text-blue-900 uppercase my-1 font-sans">
                    {result.identitas?.namaSekolah || schoolSettings.nama_sekolah}
                  </h2>
                  <p className="text-xs text-gray-600 italic font-sans">
                    Alamat: {result.identitas?.alamatSekolah || schoolSettings.alamat_sekolah} • NPSN: {result.identitas?.npsn || schoolSettings.npsn}
                  </p>
                </div>

                {/* 2. JUDUL BESAR */}
                <div className="text-center mb-8">
                  <h1 className="text-lg md:text-xl font-bold uppercase text-gray-900 tracking-wide font-sans">
                    MODUL AJAR PEMBELAJARAN MENDALAM (DEEP LEARNING)
                  </h1>
                  <h2 className="text-base md:text-lg font-bold text-blue-800 uppercase font-sans mt-0.5">
                    Mata Pelajaran: {result.identitas?.mataPelajaran || selectedSubjectFinal}
                  </h2>
                  <p className="text-xs text-gray-600 font-sans mt-1">
                    Tahun Pelajaran {result.identitas?.tahunPelajaran || schoolSettings.tahun_pelajaran} • Semester {result.identitas?.semester || schoolSettings.semester}
                  </p>
                </div>

                {/* 3. I. IDENTITAS MODUL */}
                <div className="mb-8">
                  <h3 className="text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 mb-3 font-sans text-gray-900">
                    I. Informasi Umum & Identitas Modul
                  </h3>
                  <div className="border border-gray-300 rounded-lg overflow-hidden text-xs md:text-sm font-sans">
                    <table className="w-full text-left border-collapse">
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="w-1/3 p-2.5 bg-gray-50 font-semibold text-gray-700">Nama Satuan Pendidikan</td>
                          <td className="p-2.5 font-medium">{result.identitas?.namaSekolah || schoolSettings.nama_sekolah}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="p-2.5 bg-gray-50 font-semibold text-gray-700">NPSN & Alamat</td>
                          <td className="p-2.5 font-medium">{result.identitas?.npsn || schoolSettings.npsn} — {result.identitas?.alamatSekolah || schoolSettings.alamat_sekolah}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="p-2.5 bg-gray-50 font-semibold text-gray-700">Nama Guru Pengampu</td>
                          <td className="p-2.5 font-bold text-gray-900">{result.identitas?.namaGuru || user?.name}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="p-2.5 bg-gray-50 font-semibold text-gray-700">NIP / ID Guru</td>
                          <td className="p-2.5 font-medium">{result.identitas?.nipGuru || user?.username || '-'}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="p-2.5 bg-gray-50 font-semibold text-gray-700">Mata Pelajaran & Fase/Kelas</td>
                          <td className="p-2.5 font-medium">{result.identitas?.mataPelajaran || selectedSubjectFinal} • {result.identitas?.fase || formData.grade}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="p-2.5 bg-gray-50 font-semibold text-gray-700">Alokasi Waktu & Jumlah Pertemuan</td>
                          <td className="p-2.5 font-medium">{result.identitas?.alokasiWaktu || formData.alokasiWaktu} ({result.identitas?.jumlahPertemuan || formData.pertemuanCount} Pertemuan)</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="p-2.5 bg-gray-50 font-semibold text-gray-700">Model & Metode Pembelajaran</td>
                          <td className="p-2.5 font-medium text-blue-900 font-bold">{result.modelMetode?.nama || formData.metode}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 bg-gray-50 font-semibold text-gray-700">Target Peserta Didik</td>
                          <td className="p-2.5 font-medium">{result.targetPesertaDidik || 'Peserta didik reguler dengan diferensiasi pembelajaran'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. II. KOMPONEN INTI & PRINSIP PEMBELAJARAN MENDALAM */}
                <div className="mb-8 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 font-sans text-gray-900">
                    II. Komponen Inti & Prinsip Pembelajaran Mendalam
                  </h3>

                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-gray-900 font-sans mb-1">A. Capaian Pembelajaran (CP)</h4>
                    <p className="text-xs md:text-sm bg-blue-50/40 p-3 rounded-lg border border-blue-100 font-sans leading-relaxed text-gray-800">
                      {result.capaianPembelajaran || formData.cp}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-gray-900 font-sans mb-1">B. Elemen / Domain Konten CP</h4>
                    <p className="text-xs md:text-sm font-sans text-gray-700">
                      {result.elemenCp || 'Pemahaman Konsep dan Keterampilan Proses Sains/Sosial'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-gray-900 font-sans mb-1">C. Tujuan Pembelajaran (TP) Operasional</h4>
                    <ul className="list-decimal pl-5 space-y-1 text-xs md:text-sm font-sans text-gray-800">
                      {result.tujuanPembelajaran?.map((tp: string, idx: number) => (
                        <li key={idx}>{tp}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 3 Pilar Deep Learning */}
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-gray-900 font-sans mb-2">
                      D. Prinsip Pembelajaran Mendalam (Deep Learning Framework)
                    </h4>
                    <div className="grid md:grid-cols-3 gap-3 text-xs font-sans">
                      <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                        <span className="font-bold text-purple-900 block mb-1">1. Mindful (Berkesadaran)</span>
                        <p className="text-purple-800 leading-relaxed">
                          {result.prinsipPembelajaranMendalam?.mindful || 'Peserta didik sadar tujuan belajar, fokus, dan aktif merefleksikan proses berpikirnya.'}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                        <span className="font-bold text-blue-900 block mb-1">2. Meaningful (Bermakna)</span>
                        <p className="text-blue-800 leading-relaxed">
                          {result.prinsipPembelajaranMendalam?.meaningful || 'Menghubungkan konsep secara mendalam dengan masalah otentik di sekitar siswa.'}
                        </p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <span className="font-bold text-amber-900 block mb-1">3. Joyful (Menyenangkan)</span>
                        <p className="text-amber-800 leading-relaxed">
                          {result.prinsipPembelajaranMendalam?.joyful || 'Pengalaman belajar kolaboratif, eksploratif, tanpa tekanan intimidatif.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-gray-900 font-sans mb-1">E. Pemahaman Bermakna (Enduring Understanding)</h4>
                    <p className="text-xs md:text-sm italic font-sans text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      "{result.pemahamanBermakna || '-'}"
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-gray-900 font-sans mb-1">F. Pertanyaan Pemantik (Driving Questions)</h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs md:text-sm font-sans text-gray-800">
                      {result.pertanyaanPemantik?.map((q: string, idx: number) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-gray-900 font-sans mb-1">G. Dimensi Profil Pelajar Pancasila</h4>
                    <div className="flex flex-wrap gap-1.5 font-sans">
                      {result.dimensiProfilPelajarPancasila?.map((dim: string, idx: number) => (
                        <span key={idx} className="text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full font-medium border border-slate-200">
                          {dim}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5. III. KEGIATAN PEMBELAJARAN SESUAI SINTAKS PER PERTEMUAN */}
                <div className="mb-8 space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 font-sans text-gray-900">
                    III. Rincian Kegiatan Pembelajaran (Sintaks {result.modelMetode?.nama || formData.metode})
                  </h3>

                  {result.pertemuan?.map((ptm: any, pIdx: number) => (
                    <div key={pIdx} className="border border-gray-300 rounded-xl overflow-hidden font-sans mb-6">
                      {/* Pertemuan Header */}
                      <div className="bg-slate-100 p-3 border-b border-gray-300 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase text-blue-800 tracking-wider">
                            Pertemuan Ke-{ptm.nomor || pIdx + 1}
                          </span>
                          <h4 className="text-sm md:text-base font-bold text-gray-900 mt-0.5">
                            {ptm.topik || `Materi Pertemuan ${pIdx + 1}`}
                          </h4>
                        </div>
                        <div className="text-right text-xs text-gray-600 font-medium">
                          <span>{ptm.alokasiWaktu || formData.alokasiWaktu}</span>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        <p className="text-xs text-gray-600 italic">
                          <span className="font-semibold text-gray-800">Target Pertemuan:</span> {ptm.tujuanPertemuan || 'Pencapaian Indikator Kompetensi'}
                        </p>

                        {/* 1. Pendahuluan */}
                        <div className="bg-gray-50/70 p-3 rounded-lg border border-gray-200">
                          <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            1. Kegiatan Pendahuluan ({ptm.kegiatanPendahuluan?.durasi || '15 Menit'})
                          </h5>
                          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                            {ptm.kegiatanPendahuluan?.langkah?.map((step: string, sIdx: number) => (
                              <li key={sIdx}>{step}</li>
                            ))}
                          </ul>
                        </div>

                        {/* 2. Kegiatan Inti Sintaks */}
                        <div>
                          <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            2. Kegiatan Inti ({ptm.kegiatanInti?.durasi || '60 Menit'}) — Sintaks {result.modelMetode?.nama || formData.metode}
                          </h5>

                          <div className="border border-gray-300 rounded-lg overflow-hidden">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-blue-900 text-white font-semibold">
                                  <th className="p-2.5 w-1/4 border-r border-blue-800">Tahap Sintaks</th>
                                  <th className="p-2.5 w-1/3 border-r border-blue-800">Aktivitas Guru</th>
                                  <th className="p-2.5 w-5/12">Aktivitas Siswa & Deep Learning</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ptm.kegiatanInti?.sintaks?.map((stx: any, sIdx: number) => (
                                  <tr key={sIdx} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="p-2.5 font-bold text-blue-900 bg-blue-50/30 border-r border-gray-200 align-top">
                                      {stx.tahap}
                                    </td>
                                    <td className="p-2.5 text-gray-700 border-r border-gray-200 align-top leading-relaxed">
                                      {stx.aktivitasGuru}
                                    </td>
                                    <td className="p-2.5 text-gray-800 align-top leading-relaxed">
                                      <p>{stx.aktivitasSiswa}</p>
                                      {stx.fokusMendalam && (
                                        <span className="inline-block mt-1 text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold border border-indigo-200">
                                          Fokus: {stx.fokusMendalam}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* 3. Penutup */}
                        <div className="bg-gray-50/70 p-3 rounded-lg border border-gray-200">
                          <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            3. Kegiatan Penutup ({ptm.kegiatanPenutup?.durasi || '15 Menit'})
                          </h5>
                          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                            {ptm.kegiatanPenutup?.langkah?.map((step: string, sIdx: number) => (
                              <li key={sIdx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 6. IV. ASESMEN & RUBRIK PENILAIAN */}
                <div className="mb-8 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 font-sans text-gray-900">
                    IV. Rancangan Asesmen & Rubrik Penilaian Mendalam
                  </h3>

                  <div className="grid md:grid-cols-3 gap-3 text-xs font-sans">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="font-bold text-gray-900 block mb-1">1. Asesmen Diagnostik</span>
                      <p className="text-gray-700"><strong>Teknik:</strong> {result.asesmen?.diagnostik?.teknik || '-'}</p>
                      <p className="text-gray-600 mt-1"><strong>Instrumen:</strong> {result.asesmen?.diagnostik?.instrumen || '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="font-bold text-gray-900 block mb-1">2. Asesmen Formatif</span>
                      <p className="text-gray-700"><strong>Teknik:</strong> {result.asesmen?.formatif?.teknik || '-'}</p>
                      <p className="text-gray-600 mt-1"><strong>Instrumen:</strong> {result.asesmen?.formatif?.instrumen || '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="font-bold text-gray-900 block mb-1">3. Asesmen Sumatif</span>
                      <p className="text-gray-700"><strong>Teknik:</strong> {result.asesmen?.sumatif?.teknik || '-'}</p>
                      <p className="text-gray-600 mt-1"><strong>Instrumen:</strong> {result.asesmen?.sumatif?.instrumen || '-'}</p>
                    </div>
                  </div>

                  {/* Rubrik Table */}
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-gray-900 font-sans mb-2">
                      Tabel Rubrik Penilaian Ketercapaian Pembelajaran Mendalam
                    </h4>
                    <div className="border border-gray-300 rounded-lg overflow-hidden font-sans text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-800 text-white font-semibold">
                            <th className="p-2.5 w-1/5 border-r border-slate-700">Aspek Penilaian</th>
                            <th className="p-2.5 w-1/5 border-r border-slate-700">Sangat Mahir (86-100)</th>
                            <th className="p-2.5 w-1/5 border-r border-slate-700">Mahir (71-85)</th>
                            <th className="p-2.5 w-1/5 border-r border-slate-700">Berkembang (56-70)</th>
                            <th className="p-2.5 w-1/5">Perlu Bimbingan (&lt;56)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.asesmen?.rubrik?.map((rb: any, rIdx: number) => (
                            <tr key={rIdx} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-2 font-bold text-gray-900 bg-gray-50 border-r border-gray-200 align-top">
                                {rb.aspek}
                              </td>
                              <td className="p-2 text-gray-700 border-r border-gray-200 align-top">{rb.sangatMahir}</td>
                              <td className="p-2 text-gray-700 border-r border-gray-200 align-top">{rb.mahir}</td>
                              <td className="p-2 text-gray-700 border-r border-gray-200 align-top">{rb.berkembang}</td>
                              <td className="p-2 text-gray-700 align-top">{rb.perluBimbingan}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* 7. V. PENGAYAAN DAN REMEDIAL */}
                <div className="mb-8 font-sans text-xs md:text-sm space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 text-gray-900">
                    V. Pengayaan dan Remedial
                  </h3>
                  <p><strong>A. Pengayaan:</strong> {result.pengayaanRemedial?.pengayaan || 'Diberikan pengayaan materi dan studi kasus lanjutan bagi siswa yang telah tuntas.'}</p>
                  <p><strong>B. Remedial:</strong> {result.pengayaanRemedial?.remedial || 'Bimbingan tutor sebaya atau pendampingan terfokus pada konsep yang belum tuntas.'}</p>
                </div>

                {/* 8. VI. REFLEKSI */}
                <div className="mb-8 font-sans text-xs md:text-sm space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 text-gray-900">
                    VI. Refleksi Guru dan Peserta Didik
                  </h3>
                  <div>
                    <span className="font-bold text-gray-900 block mb-1">A. Refleksi Peserta Didik:</span>
                    <ul className="list-disc pl-5 space-y-1 text-gray-700">
                      {result.refleksi?.refleksiSiswa?.map((q: string, idx: number) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block mb-1">B. Refleksi Guru:</span>
                    <ul className="list-disc pl-5 space-y-1 text-gray-700">
                      {result.refleksi?.refleksiGuru?.map((q: string, idx: number) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 9. VII. LAMPIRAN */}
                <div className="mb-10 font-sans text-xs md:text-sm space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 text-gray-900">
                    VII. Lampiran Dokumen Pembelajaran
                  </h3>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="font-bold text-gray-900 block mb-1">
                      A. {result.lampiran?.lkpd?.judul || 'Lembar Kerja Peserta Didik (LKPD) Pembelajaran Mendalam'}
                    </span>
                    <p className="text-gray-600 italic mb-2">Petunjuk: {result.lampiran?.lkpd?.petunjuk || '-'}</p>
                    <p className="font-semibold text-gray-800">Tantangan Studi Kasus:</p>
                    <p className="text-gray-700 mt-0.5">{result.lampiran?.lkpd?.studiKasusSoal || '-'}</p>
                  </div>

                  <div>
                    <span className="font-bold text-gray-900 block mb-1">B. Glosarium Istilah:</span>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {result.lampiran?.glosarium?.map((g: any, idx: number) => (
                        <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-200 text-xs">
                          <strong className="text-blue-900">{g.istilah}:</strong> {g.definisi}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-gray-900 block mb-1">C. Daftar Pustaka:</span>
                    <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                      {result.lampiran?.daftarPustaka?.map((dp: string, idx: number) => (
                        <li key={idx}>{dp}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 10. LEMBAR PENGESAHAN */}
                <div className="pt-6 border-t-2 border-gray-300 font-sans break-inside-avoid">
                  <div className="grid grid-cols-2 text-center text-xs md:text-sm">
                    <div>
                      <p>Mengetahui,</p>
                      <p className="font-bold">Kepala Sekolah {result.identitas?.namaSekolah || schoolSettings.nama_sekolah}</p>
                      <div className="h-24 flex items-center justify-center">
                        {/* Space for signature */}
                      </div>
                      <p className="font-bold underline text-gray-900">
                        {result.identitas?.namaKepsek || schoolSettings.nama_kepsek}
                      </p>
                      <p className="text-xs text-gray-500">NIP. ........................................</p>
                    </div>

                    <div>
                      <p>
                        Garut, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="font-bold">Guru Mata Pelajaran,</p>
                      <div className="h-24 flex items-center justify-center">
                        {/* Space for signature */}
                      </div>
                      <p className="font-bold underline text-gray-900">
                        {result.identitas?.namaGuru || user?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        NIP/ID. {result.identitas?.nipGuru || user?.username || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ARSIP MODUL TERSIMPAN */}
      {activeTab === 'saved' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Arsip Modul Ajar Tersimpan</h2>
                <p className="text-sm text-gray-500">Daftar Modul Ajar Pembelajaran Mendalam yang telah Anda racik dan simpan.</p>
              </div>
            </div>

            {savedModules.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <BookMarked className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-bold text-sm">Belum ada modul ajar yang disimpan.</p>
                <p className="text-gray-400 text-xs mt-1">Buat modul ajar baru di tab "Buat Modul Baru", lalu klik tombol Simpan ke Database.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 px-4 py-2 bg-blue-700 text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition"
                >
                  Buat Modul Ajar Sekarang
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {savedModules.map(m => (
                  <div key={m.id} className="p-4 rounded-xl border border-gray-200 hover:border-blue-400 transition bg-white shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-100">
                          {m.subject_name}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-900 text-sm mt-2">{m.title}</h3>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        <strong>Metode:</strong> {m.metode} • <strong>Pertemuan:</strong> {m.pertemuan_count} Pertemuan
                      </p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">
                        "{m.cp}"
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setResult(m.content_json);
                            setActiveTab('create');
                          }}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Buka
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadDocx(m.content_json)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                        >
                          <FileDown className="w-3.5 h-3.5" /> Word
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSavedModule(m.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                        title="Hapus Modul"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
