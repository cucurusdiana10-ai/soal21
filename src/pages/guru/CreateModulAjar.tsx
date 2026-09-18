import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Check,
  Search,
  Filter,
  Bookmark
} from 'lucide-react';
import { generateModulAjarApi } from '../../lib/aiService';
import { exportModulAjarToDocx } from '../../lib/modulDocxGenerator';
import ModulAjarEditor, { DELAPAN_DIMENSI_LULUSAN } from './ModulAjarEditor';
import {
  parseKepsek,
  getDetailedPendahuluan,
  getDetailedPenutup,
  getStoredTtdKepsek,
  getStoredCapSekolah
} from '../../lib/schoolSettings';
import OfficialSignatureStamp from '../../components/OfficialSignatureStamp';
import { getTeacherSavedCps, SavedCpItem } from '../../lib/cpStorage';

export function extractMateriTitleFromModule(mod: {
  title?: string;
  cp?: string;
  content_json?: any;
  subject_name?: string;
}): string {
  const cJson = mod.content_json || {};

  // 1. If content_json has elemenCp and it's meaningful
  if (cJson.elemenCp && typeof cJson.elemenCp === 'string' && cJson.elemenCp.trim() && !cJson.elemenCp.toLowerCase().includes('elemen/domain')) {
    const el = cJson.elemenCp.trim();
    if (el.length <= 65) return el;
  }

  // 2. If first meeting has a specific lesson/topic name
  if (Array.isArray(cJson.pertemuan) && cJson.pertemuan[0]?.nama) {
    const pNama = String(cJson.pertemuan[0].nama).trim();
    if (pNama && !pNama.toLowerCase().startsWith('pertemuan')) {
      return pNama;
    }
  }

  // 3. If first Tujuan Pembelajaran has a clear topic
  if (Array.isArray(cJson.tujuanPembelajaran) && cJson.tujuanPembelajaran[0]) {
    const tp = String(cJson.tujuanPembelajaran[0])
      .replace(/^(peserta didik mampu|siswa mampu|memahami|menganalisis|menerapkan|menjelaskan|mengevaluasi)\s+/i, '')
      .trim();
    if (tp && tp.length <= 70) {
      return tp.charAt(0).toUpperCase() + tp.slice(1);
    }
  }

  // 4. Extract from CP text
  const rawCp = mod.cp || cJson.capaianPembelajaran || '';
  if (rawCp) {
    const cleaned = rawCp.trim()
      .replace(/^pada akhir fase [a-z0-9\s()]+peserta didik mampu\s+/i, '')
      .replace(/^pada akhir fase [a-z0-9\s(),]+siswa mampu\s+/i, '')
      .replace(/^peserta didik mampu\s+/i, '')
      .replace(/^siswa mampu\s+/i, '');
    
    const firstSegment = cleaned.split(/[.\n;]/)[0].trim();
    if (firstSegment.length > 0) {
      if (firstSegment.length <= 65) {
        return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
      }
      return firstSegment.slice(0, 62).trim() + '...';
    }
  }

  // 5. If title has a custom material name after colon or hyphen
  if (mod.title) {
    const clean = mod.title.replace(/^Modul Ajar:\s*/i, '').replace(/^Modul:\s*/i, '').trim();
    const parts = clean.split(' - ');
    if (parts.length > 1 && parts[1] && !parts[1].toLowerCase().includes('learning') && !parts[1].toLowerCase().includes('inquiry')) {
      return parts[1].trim();
    }
  }

  return 'Materi Pokok';
}

function formatIndoDate(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

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
  const [autoSaving, setAutoSaving] = useState(false);
  const [currentSavedId, setCurrentSavedId] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  // School and User identity state
  const [schoolSettings, setSchoolSettings] = useState({
    nama_sekolah: 'SMAN 21 Garut',
    npsn: '20209194',
    alamat_sekolah: 'Jl. Raya Talegong No. 21, Kec. Talegong, Kab. Garut, Jawa Barat 44167',
    tahun_pelajaran: '2026/2027',
    semester: 'Ganjil',
    nama_kepsek: 'Agus Supriatna, S.Pd., M.Si.',
    nip_kepsek: '',
    ttd_kepsek: getStoredTtdKepsek(),
    cap_sekolah: getStoredCapSekolah()
  });

  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [savedModules, setSavedModules] = useState<any[]>([]);
  const [selectedSavedModule, setSelectedSavedModule] = useState<any | null>(null);
  const [teacherSavedCps, setTeacherSavedCps] = useState<SavedCpItem[]>([]);

  // Archive filters
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveSubjectFilter, setArchiveSubjectFilter] = useState('ALL');
  const [archiveMetodeFilter, setArchiveMetodeFilter] = useState('ALL');

  const todayStr = new Date().toISOString().split('T')[0];

  // Generator form
  const [formData, setFormData] = useState({
    subject: '',
    customSubject: '',
    grade: 'Fase E (Kelas X)',
    cp: '',
    metode: 'Problem-Based Learning (PBL)',
    pertemuanCount: 2,
    pertemuanMetode: ['Problem-Based Learning (PBL)', 'Problem-Based Learning (PBL)'],
    alokasiWaktu: '2 x 45 Menit (2 JP)',
    tanggalCetak: todayStr
  });

  // Generated Module Result
  const [result, setResult] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchSchoolSettings();
    fetchTeacherSubjects();
    fetchSavedModules();
    fetchTeacherSavedCps();

    const prefillCp = sessionStorage.getItem('prefill_modul_cp');
    const prefillSubject = sessionStorage.getItem('prefill_modul_subject');
    const prefillGrade = sessionStorage.getItem('prefill_modul_grade');
    if (prefillCp || prefillSubject || prefillGrade) {
      setFormData(prev => ({
        ...prev,
        ...(prefillCp ? { cp: prefillCp } : {}),
        ...(prefillSubject ? { subject: prefillSubject } : {}),
        ...(prefillGrade ? { grade: prefillGrade } : {})
      }));
      sessionStorage.removeItem('prefill_modul_cp');
      sessionStorage.removeItem('prefill_modul_subject');
      sessionStorage.removeItem('prefill_modul_grade');
    }
  }, [user]);

  async function fetchSchoolSettings() {
    try {
      const { data } = await supabase.from('app_settings').select('*').limit(1).single();
      if (data) {
        const kepsek = parseKepsek(data.nama_kepsek);
        const ttd = data.ttd_kepsek || getStoredTtdKepsek();
        const cap = data.cap_sekolah || getStoredCapSekolah();
        setSchoolSettings({
          nama_sekolah: data.nama_sekolah || 'SMAN 21 Garut',
          npsn: data.npsn || '20209194',
          alamat_sekolah: data.alamat_sekolah || 'Jl. Raya Talegong No. 21, Kec. Talegong, Kab. Garut, Jawa Barat 44167',
          tahun_pelajaran: data.tahun_pelajaran || '2026/2027',
          semester: data.semester || 'Ganjil',
          nama_kepsek: kepsek.nama,
          nip_kepsek: kepsek.nip,
          ttd_kepsek: ttd,
          cap_sekolah: cap
        });
      }
    } catch (err) {
      console.warn('Gagal memuat pengaturan sekolah:', err);
    }
  }

  async function fetchTeacherSubjects() {
    if (!user) return;
    try {
      const parsed: string[] = [];

      // 1. From subjects table for this guru
      const { data } = await supabase.from('subjects').select('name').eq('guru_id', user.id);
      if (data && data.length > 0) {
        data.forEach(s => {
          if (s.name) {
            s.name.split(',').forEach(item => {
              const trimmed = item.trim();
              if (trimmed && !parsed.includes(trimmed)) parsed.push(trimmed);
            });
          }
        });
      }

      // 2. Also check if user profile has subject field
      if ((user as any).subject) {
        String((user as any).subject).split(',').forEach(item => {
          const trimmed = item.trim();
          if (trimmed && !parsed.includes(trimmed)) parsed.push(trimmed);
        });
      }

      setTeacherSubjects(parsed);
      if (parsed.length > 0) {
        setFormData(prev => ({ ...prev, subject: parsed[0] }));
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

  async function fetchTeacherSavedCps() {
    if (!user) return;
    try {
      const list = await getTeacherSavedCps(user.id);
      setTeacherSavedCps(list);
    } catch (err) {
      console.warn('Gagal memuat CP tersimpan:', err);
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
        pertemuanMetode: (formData.pertemuanMetode || []).slice(0, Number(formData.pertemuanCount) || 2),
        alokasiWaktu: formData.alokasiWaktu,
        tanggalCetak: formData.tanggalCetak,
        namaGuru: user?.name || 'Guru Pengampu',
        nipGuru: user?.username || '-',
        namaSekolah: schoolSettings.nama_sekolah,
        npsn: schoolSettings.npsn,
        alamatSekolah: schoolSettings.alamat_sekolah,
        tahunPelajaran: schoolSettings.tahun_pelajaran,
        semester: schoolSettings.semester,
        namaKepsek: schoolSettings.nama_kepsek,
        nipKepsek: schoolSettings.nip_kepsek
      };

      const data = await generateModulAjarApi(payload);
      if (!data.tanggalCetak) data.tanggalCetak = formData.tanggalCetak;
      if (!data.titimangsa) {
        data.titimangsa = `Garut, ${formatIndoDate(formData.tanggalCetak)}`;
      }
      if (!data.identitas) data.identitas = {};
      if (!data.identitas.ttdKepsek) data.identitas.ttdKepsek = schoolSettings.ttd_kepsek;
      if (!data.identitas.capSekolah) data.identitas.capSekolah = schoolSettings.cap_sekolah;
      setResult(data);

      // Auto-save modul ajar to database
      if (user?.id) {
        setAutoSaving(true);
        try {
          const materiSnippet = extractMateriTitleFromModule({
            cp: formData.cp || data.capaianPembelajaran,
            content_json: data,
            subject_name: selectedSubjectFinal || data.identitas?.mataPelajaran
          });
          const distinctTitle = materiSnippet && materiSnippet !== 'Materi Pokok'
            ? `${selectedSubjectFinal || 'Mapel'} - ${materiSnippet}`
            : `Modul Ajar: ${selectedSubjectFinal || 'Mapel'} - ${formData.metode}`;

          const { data: savedRecord, error: saveErr } = await supabase
            .from('modul_ajar')
            .insert([
              {
                guru_id: user.id,
                subject_name: selectedSubjectFinal || data.identitas?.mataPelajaran || 'Mata Pelajaran',
                grade: formData.grade || data.identitas?.fase || 'Fase E (Kelas X)',
                cp: formData.cp || data.capaianPembelajaran || '',
                metode: formData.metode || data.modelMetode?.nama || '',
                pertemuan_count: Number(formData.pertemuanCount) || 2,
                alokasi_waktu: formData.alokasiWaktu || '2 x 45 Menit',
                title: distinctTitle,
                content_json: data
              }
            ])
            .select()
            .single();

          if (!saveErr && savedRecord) {
            setCurrentSavedId(savedRecord.id);
            setSavedSuccess(true);
            fetchSavedModules();
          } else if (saveErr) {
            console.error('Error auto-saving modul ajar:', saveErr);
          }
        } catch (dbErr) {
          console.error('Gagal menyimpan modul ajar otomatis ke database:', dbErr);
        } finally {
          setAutoSaving(false);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Gagal meracik Modul Ajar AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEdit = async () => {
    if (isEditing && result) {
      // Auto-sync edited changes to database
      if (user?.id) {
        try {
          setAutoSaving(true);
          const editMateriSnippet = extractMateriTitleFromModule({
            cp: result.capaianPembelajaran || formData.cp,
            content_json: result,
            subject_name: result.identitas?.mataPelajaran || selectedSubjectFinal
          });
          const editDistinctTitle = editMateriSnippet && editMateriSnippet !== 'Materi Pokok'
            ? `${result.identitas?.mataPelajaran || selectedSubjectFinal || 'Mapel'} - ${editMateriSnippet}`
            : `Modul Ajar: ${result.identitas?.mataPelajaran || selectedSubjectFinal} - ${result.modelMetode?.nama || formData.metode}`;

          if (currentSavedId) {
            await supabase
              .from('modul_ajar')
              .update({
                content_json: result,
                title: editDistinctTitle,
                updated_at: new Date().toISOString()
              })
              .eq('id', currentSavedId);
          } else {
            const { data: savedRecord } = await supabase
              .from('modul_ajar')
              .insert([
                {
                  guru_id: user.id,
                  subject_name: result.identitas?.mataPelajaran || selectedSubjectFinal || 'Mata Pelajaran',
                  grade: result.identitas?.fase || formData.grade || 'Fase E (Kelas X)',
                  cp: result.capaianPembelajaran || formData.cp || '',
                  metode: result.modelMetode?.nama || formData.metode || '',
                  pertemuan_count: Number(result.pertemuan?.length || formData.pertemuanCount) || 2,
                  alokasi_waktu: result.identitas?.alokasiWaktu || formData.alokasiWaktu || '2 x 45 Menit',
                  title: editDistinctTitle,
                  content_json: result
                }
              ])
              .select()
              .single();
            if (savedRecord) setCurrentSavedId(savedRecord.id);
          }
          fetchSavedModules();
          setSavedSuccess(true);
        } catch (err) {
          console.error('Gagal memperbarui modul ajar ke database:', err);
        } finally {
          setAutoSaving(false);
        }
      }
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleDownloadDocx = async (dataToExport = result) => {
    if (!dataToExport) return;
    setExportingDocx(true);
    try {
      const exportPayload = {
        ...dataToExport,
        identitas: {
          ...(dataToExport.identitas || {}),
          ttdKepsek: dataToExport.identitas?.ttdKepsek || schoolSettings.ttd_kepsek,
          capSekolah: dataToExport.identitas?.capSekolah || schoolSettings.cap_sekolah,
          namaSekolah: dataToExport.identitas?.namaSekolah || schoolSettings.nama_sekolah,
          namaKepsek: dataToExport.identitas?.namaKepsek || schoolSettings.nama_kepsek,
          nipKepsek: dataToExport.identitas?.nipKepsek || schoolSettings.nip_kepsek
        }
      };
      const subject = exportPayload.identitas?.mataPelajaran || selectedSubjectFinal || 'Modul_Ajar';
      const cleanSubject = subject.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Modul_Ajar_${cleanSubject}_SMAN21Garut.docx`;
      await exportModulAjarToDocx(exportPayload, filename);
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
                {/* 1. Mata Pelajaran yang Diampu */}
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
                    <option value="">-- Pilih Mata Pelajaran yang Diampu --</option>
                    {teacherSubjects.length > 0 ? (
                      <optgroup label="Mata Pelajaran Anda (Tercatat di Akun)">
                        {teacherSubjects.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </optgroup>
                    ) : (
                      <option disabled value="__empty__">Belum ada mapel di akun guru</option>
                    )}
                    <option value="OTHER">+ Ketik Mata Pelajaran Manual...</option>
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
                      onChange={e => {
                        const count = Number(e.target.value);
                        setFormData(prev => {
                          const currentMethods = [...prev.pertemuanMetode];
                          while (currentMethods.length < count) {
                            currentMethods.push(prev.metode);
                          }
                          return {
                            ...prev,
                            pertemuanCount: count,
                            pertemuanMetode: currentMethods.slice(0, count)
                          };
                        });
                      }}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                    >
                      <option value={1}>1 Pertemuan</option>
                      <option value={2}>2 Pertemuan</option>
                      <option value={3}>3 Pertemuan</option>
                      <option value={4}>4 Pertemuan</option>
                      <option value={5}>5 Pertemuan</option>
                      <option value={6}>6 Pertemuan</option>
                      <option value={7}>7 Pertemuan</option>
                      <option value={8}>8 Pertemuan</option>
                      <option value={9}>9 Pertemuan</option>
                      <option value={10}>10 Pertemuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-1">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Alokasi JP
                    </label>
                    <select
                      value={formData.alokasiWaktu}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => {
                          const next = { ...prev, alokasiWaktu: val };
                          if (val.includes('5 JP') && prev.pertemuanCount < 2) {
                            next.pertemuanCount = 2;
                            const arr = [...prev.pertemuanMetode];
                            while (arr.length < 2) arr.push(prev.metode);
                            next.pertemuanMetode = arr.slice(0, 2);
                          }
                          return next;
                        });
                      }}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                    >
                      <option value="1 x 45 Menit (1 JP)">1 x 45 Menit (1 JP)</option>
                      <option value="2 x 45 Menit (2 JP)">2 x 45 Menit (2 JP)</option>
                      <option value="3 x 45 Menit (3 JP)">3 x 45 Menit (3 JP)</option>
                      <option value="4 x 45 Menit (4 JP)">4 x 45 Menit (4 JP)</option>
                      <option value="5 x 45 Menit (5 JP - Pertemuan 1: 2 JP, Pertemuan 2: 3 JP)">
                        5 x 45 Menit (5 JP - P1: 2 JP, P2: 3 JP)
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Model / Metode Pembelajaran Tiap Pertemuan */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      Model / Metode Pembelajaran Tiap Pertemuan ({formData.pertemuanCount} Pertemuan)
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tentukan model pembelajaran yang sesuai dengan karakteristik materi pada masing-masing pertemuan.
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {Array.from({ length: formData.pertemuanCount }).map((_, idx) => {
                    const currentMethodId = formData.pertemuanMetode[idx] || formData.metode;
                    const currentOpt = METODE_OPTIONS.find(m => m.id === currentMethodId) || METODE_OPTIONS[0];

                    return (
                      <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-sm space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-md">
                            Pertemuan Ke-{idx + 1}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">Sintaks Resmi Kemendikbud</span>
                        </div>
                        <select
                          value={currentMethodId}
                          onChange={e => {
                            const val = e.target.value;
                            setFormData(prev => {
                              const updated = [...prev.pertemuanMetode];
                              while (updated.length <= idx) updated.push(prev.metode || METODE_OPTIONS[0].id);
                              updated[idx] = val;
                              return {
                                ...prev,
                                metode: updated[0] || val,
                                pertemuanMetode: updated
                              };
                            });
                          }}
                          className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                        >
                          {METODE_OPTIONS.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {currentOpt.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. Capaian Pembelajaran (CP) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-gray-800">
                    Capaian Pembelajaran (CP) / Materi Utama
                  </label>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>Template:</span>
                    {CONTOH_CP.slice(0, 2).map((ex, i) => (
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

                {/* Pilih dari CP yang Telah Disimpan (Filter Sesuai Mata Pelajaran) */}
                {(() => {
                  const effectiveSub = formData.subject === 'OTHER' ? formData.customSubject : formData.subject;
                  const matchingSavedCps = teacherSavedCps.filter(item => {
                    if (!effectiveSub) return true;
                    return (
                      item.mata_pelajaran.toLowerCase() === effectiveSub.toLowerCase() ||
                      item.mata_pelajaran.toLowerCase().includes(effectiveSub.toLowerCase()) ||
                      effectiveSub.toLowerCase().includes(item.mata_pelajaran.toLowerCase())
                    );
                  });

                  return (
                    <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-2xl space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Bookmark className="w-4 h-4 text-blue-700" />
                          <span className="text-xs font-bold text-blue-950">
                            Pilih dari CP Tersimpan di Akun Anda
                          </span>
                          {effectiveSub && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-200/70 text-blue-900">
                              Filter Mapel: {effectiveSub}
                            </span>
                          )}
                        </div>

                        <Link
                          to="/dashboard/cp"
                          className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
                        >
                          Cari & Simpan CP BSKAP 046/2025 →
                        </Link>
                      </div>

                      {matchingSavedCps.length > 0 ? (
                        <div className="space-y-2">
                          <select
                            onChange={(e) => {
                              const sel = teacherSavedCps.find(c => c.id === e.target.value);
                              if (sel) {
                                setFormData(prev => ({
                                  ...prev,
                                  cp: sel.teks_cp,
                                  ...(sel.fase ? { grade: sel.fase } : {}),
                                  ...(prev.subject ? {} : { subject: sel.mata_pelajaran })
                                }));
                              }
                            }}
                            defaultValue=""
                            className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                          >
                            <option value="" disabled>
                              -- Klik di sini untuk memilih CP ({matchingSavedCps.length} CP tersedia) --
                            </option>
                            {matchingSavedCps.map((cp) => (
                              <option key={cp.id} value={cp.id}>
                                [{cp.mata_pelajaran} - {cp.fase}] {cp.judul}
                              </option>
                            ))}
                          </select>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-blue-800 font-semibold">Pilih Cepat:</span>
                            {matchingSavedCps.slice(0, 4).map((cp) => (
                              <button
                                key={cp.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    cp: cp.teks_cp,
                                    ...(cp.fase ? { grade: cp.fase } : {}),
                                    ...(prev.subject ? {} : { subject: cp.mata_pelajaran })
                                  }));
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-blue-100 border border-blue-300 text-blue-950 rounded-lg text-[11px] font-medium transition shadow-2xs max-w-xs truncate"
                                title={cp.judul}
                              >
                                ✓ {cp.judul}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-900 bg-white/70 p-2.5 rounded-xl border border-blue-100">
                          <p>
                            {effectiveSub
                              ? `Belum ada CP tersimpan untuk mata pelajaran "${effectiveSub}".`
                              : 'Belum ada CP tersimpan di akun Anda.'}
                          </p>
                          <Link
                            to="/dashboard/cp"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition shadow-sm w-fit"
                          >
                            <Bookmark className="w-3 h-3" />
                            Cari di Dokumen BSKAP 046/2025
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <textarea
                  rows={4}
                  value={formData.cp}
                  onChange={e => setFormData({ ...formData, cp: e.target.value })}
                  placeholder="Ketik Capaian Pembelajaran atau pilih dari CP tersimpan di atas..."
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed bg-white shadow-2xs"
                  required
                />
              </div>

              {/* 6. Fitur Pilih Tanggal Cetak Modul (Titimangsa Pengesahan) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Pilih Tanggal Cetak Modul
                  </label>
                  <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                    Titimangsa: Garut, {formatIndoDate(formData.tanggalCetak)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Tanggal ini akan disinkronkan langsung pada titimangsa lembar pengesahan di atas Guru Mata Pelajaran pada akhir modul.
                </p>
                <div className="max-w-xs">
                  <input
                    type="date"
                    value={formData.tanggalCetak}
                    onChange={e => setFormData({ ...formData, tanggalCetak: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-800"
                    required
                  />
                </div>
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
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="font-bold text-gray-900 text-sm">
                    Modul Ajar: {result.identitas?.mataPelajaran || selectedSubjectFinal} ({result.pertemuan?.length || formData.pertemuanCount} Pertemuan)
                  </span>
                  
                  {autoSaving ? (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border border-blue-200">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> Menyimpan...
                    </span>
                  ) : (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Otomatis Tersimpan
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
                    onClick={handleToggleEdit}
                    className={`px-3 py-2 border rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                      isEditing
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                        : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {isEditing ? 'Selesai Edit' : 'Edit Teks'}
                  </button>
                </div>
              </div>

              {/* Formal Printable Document Preview Container or Editor */}
              {isEditing ? (
                <ModulAjarEditor
                  result={result}
                  onChange={setResult}
                  onSave={handleToggleEdit}
                  onCancel={() => setIsEditing(false)}
                  isSaving={autoSaving}
                />
              ) : (
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
                        <tr>
                          <td className="p-2.5 bg-gray-50 font-semibold text-gray-700">Model & Metode Pembelajaran</td>
                          <td className="p-2.5 font-medium text-blue-900 font-bold">{result.modelMetode?.nama || formData.metode}</td>
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
                    <h4 className="text-xs md:text-sm font-bold text-gray-900 font-sans mb-1.5">
                      G. Dimensi Profil Lulusan (8 Dimensi Lulusan)
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-2 font-sans">
                      {((Array.isArray(result.dimensiProfilLulusan) && result.dimensiProfilLulusan.length > 0)
                        ? result.dimensiProfilLulusan
                        : (Array.isArray(result.dimensiProfilPelajarPancasila) && result.dimensiProfilPelajarPancasila.length > 0)
                        ? result.dimensiProfilPelajarPancasila
                        : DELAPAN_DIMENSI_LULUSAN
                      ).map((dim: string, idx: number) => (
                        <div key={idx} className="text-xs bg-slate-50 text-slate-800 p-2 rounded-lg border border-slate-200 flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-snug">{dim}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5. III. KEGIATAN PEMBELAJARAN SESUAI SINTAKS PER PERTEMUAN */}
                <div className="mb-8 space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 font-sans text-gray-900">
                    III. Rincian Kegiatan Pembelajaran
                  </h3>

                  {result.pertemuan?.map((ptm: any, pIdx: number) => (
                    <div key={pIdx} className="border border-gray-300 rounded-xl overflow-hidden font-sans mb-6">
                      {/* Pertemuan Header */}
                      <div className="bg-slate-100 p-3 border-b border-gray-300 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase text-blue-800 tracking-wider">
                            Pertemuan Ke-{ptm.nomor || pIdx + 1} • {ptm.metode || result.modelMetode?.nama || formData.metode}
                          </span>
                          <h4 className="text-sm md:text-base font-bold text-gray-900 mt-0.5">
                            {ptm.topik || `Materi Pertemuan ${pIdx + 1}`}
                          </h4>
                        </div>
                        <div className="text-right text-xs text-gray-600 font-medium">
                          <span className="px-2.5 py-1 bg-white rounded-md border border-gray-300 font-semibold">{ptm.alokasiWaktu || formData.alokasiWaktu}</span>
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
                            {getDetailedPendahuluan(ptm.kegiatanPendahuluan?.langkah).map((step: string, sIdx: number) => (
                              <li key={sIdx}>{step}</li>
                            ))}
                          </ul>
                        </div>

                        {/* 2. Kegiatan Inti Sintaks */}
                        <div>
                          <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            2. Kegiatan Inti ({ptm.kegiatanInti?.durasi || '60 Menit'}) — Sintaks {ptm.metode || result.modelMetode?.nama || formData.metode}
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
                            {getDetailedPenutup(ptm.kegiatanPenutup?.langkah).map((step: string, sIdx: number) => (
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
                      <div className="flex items-center justify-center my-1 min-h-[96px]">
                        <OfficialSignatureStamp
                          ttdUrl={result.identitas?.ttdKepsek || schoolSettings.ttd_kepsek}
                          capUrl={result.identitas?.capSekolah || schoolSettings.cap_sekolah}
                          schoolName={result.identitas?.namaSekolah || schoolSettings.nama_sekolah}
                          showStamp={true}
                        />
                      </div>
                      <p className="font-bold underline text-gray-900">
                        {result.identitas?.namaKepsek || schoolSettings.nama_kepsek}
                      </p>
                      <p className="text-xs text-gray-600 font-mono">
                        NIP. {result.identitas?.nipKepsek || schoolSettings.nip_kepsek || '........................................'}
                      </p>
                    </div>

                    <div>
                      <p>
                        {result.titimangsa || `Garut, ${formatIndoDate(result.tanggalCetak || formData.tanggalCetak)}`}
                      </p>
                      <p className="font-bold">Guru Mata Pelajaran,</p>
                      <div className="h-24 flex items-center justify-center">
                        {/* Ruang TTD Manual Guru */}
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
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ARSIP MODUL TERSIMPAN */}
      {activeTab === 'saved' && (() => {
        // Unique options for filters
        const uniqueSubjects = Array.from(new Set(savedModules.map(m => m.subject_name).filter(Boolean)));
        const uniqueMethods = Array.from(new Set(savedModules.map(m => m.metode).filter(Boolean)));

        const filteredSavedModules = savedModules.filter(m => {
          const materi = extractMateriTitleFromModule(m).toLowerCase();
          const cp = (m.cp || '').toLowerCase();
          const title = (m.title || '').toLowerCase();
          const subj = (m.subject_name || '').toLowerCase();
          const met = (m.metode || '').toLowerCase();
          const q = archiveSearch.toLowerCase().trim();

          const matchSearch = !q || materi.includes(q) || cp.includes(q) || title.includes(q) || subj.includes(q) || met.includes(q);
          const matchSubject = archiveSubjectFilter === 'ALL' || m.subject_name === archiveSubjectFilter;
          const matchMetode = archiveMetodeFilter === 'ALL' || m.metode === archiveMetodeFilter;

          return matchSearch && matchSubject && matchMetode;
        });

        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <BookMarked className="w-5 h-5 text-blue-600" />
                    Arsip Modul Ajar Tersimpan
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Daftar Modul Ajar terorganisir berdasarkan Capaian Pembelajaran (CP), Materi Utama, dan Metode Pembelajaran.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-bold border border-blue-200">
                    Total: {savedModules.length} Modul
                  </span>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                  >
                    + Buat Modul Baru
                  </button>
                </div>
              </div>

              {/* Filter and Search Bar */}
              {savedModules.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  {/* Search Input */}
                  <div className="sm:col-span-6 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={archiveSearch}
                      onChange={e => setArchiveSearch(e.target.value)}
                      placeholder="Cari materi, topik CP, mata pelajaran..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    {archiveSearch && (
                      <button
                        onClick={() => setArchiveSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Subject Filter */}
                  <div className="sm:col-span-3">
                    <select
                      value={archiveSubjectFilter}
                      onChange={e => setArchiveSubjectFilter(e.target.value)}
                      className="w-full py-2 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="ALL">Semua Mata Pelajaran</option>
                      {uniqueSubjects.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  {/* Metode Filter */}
                  <div className="sm:col-span-3">
                    <select
                      value={archiveMetodeFilter}
                      onChange={e => setArchiveMetodeFilter(e.target.value)}
                      className="w-full py-2 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="ALL">Semua Model/Metode</option>
                      {uniqueMethods.map(met => (
                        <option key={met} value={met}>{met}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {savedModules.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <BookMarked className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-bold text-sm">Belum ada modul ajar yang tersimpan.</p>
                  <p className="text-gray-400 text-xs mt-1">Setiap modul ajar yang Anda buat di tab "Buat Modul Baru" akan tersimpan otomatis ke database dan tampil di sini.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-4 px-4 py-2 bg-blue-700 text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition"
                  >
                    Buat Modul Ajar Sekarang
                  </button>
                </div>
              ) : filteredSavedModules.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-gray-600 font-medium text-xs">Tidak ada modul yang cocok dengan kata kunci pencarian atau filter.</p>
                  <button
                    onClick={() => {
                      setArchiveSearch('');
                      setArchiveSubjectFilter('ALL');
                      setArchiveMetodeFilter('ALL');
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-xs font-bold underline"
                  >
                    Reset Filter Pencarian
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredSavedModules.map(m => {
                    const materiName = extractMateriTitleFromModule(m);

                    return (
                      <div
                        key={m.id}
                        className="p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition bg-white shadow-sm flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-2.5">
                          {/* Tags & Date Row */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                {m.subject_name}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {m.grade || 'Fase E'}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-400 font-medium">
                              {new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>

                          {/* Prominent Materi / Topik Title */}
                          <div>
                            <div className="text-[10px] uppercase tracking-wider font-bold text-blue-600 mb-0.5">
                              Nama Materi / Topik Modul
                            </div>
                            <h3 className="font-bold text-gray-900 text-sm leading-snug">
                              {materiName}
                            </h3>
                          </div>

                          {/* Capaian Pembelajaran Box */}
                          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Capaian Pembelajaran (CP):</span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2 italic leading-relaxed">
                              "{m.cp || 'Tidak ada uraian CP'}"
                            </p>
                          </div>

                          {/* Metode Pembelajaran & Sesi */}
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-medium text-[11px]">
                              🌱 {m.metode || 'Problem-Based Learning'}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-medium text-[11px]">
                              ⏱️ {m.pertemuan_count} Pertemuan ({m.alokasi_waktu || '2 JP'})
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setResult(m.content_json);
                                setCurrentSavedId(m.id);
                                setActiveTab('create');
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5" /> Buka Modul
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadDocx(m.content_json)}
                              className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                            >
                              <FileDown className="w-3.5 h-3.5" /> Word (.docx)
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
