import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/AuthProvider';
import { CapaianPembelajaran } from '../../types';
import { 
  FileText, Upload, Plus, Trash2, Download, Search, 
  FileCheck, AlertCircle, Check, Copy, Eye, X, BookOpen, 
  Sparkles, Database, FileSpreadsheet, HardDrive
} from 'lucide-react';

const COMMON_SUBJECTS = [
  'Informatika',
  'Koding dan Kecerdasan Artifisial',
  'Matematika',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Fisika',
  'Kimia',
  'Biologi',
  'Sejarah',
  'Geografi',
  'Sosiologi',
  'Ekonomi',
  'Pendidikan Pancasila (PPKn)',
  'Pendidikan Agama dan Budi Pekerti',
  'PJOK',
  'Seni Budaya',
  'Prakarya dan Kewirausahaan',
  'Bimbingan Konseling'
];

const PHASES = [
  'Fase E (Kelas X)',
  'Fase F (Kelas XI)',
  'Fase F (Kelas XII)',
  'Semua Fase (Fase E & F)'
];

const LOCAL_STORAGE_KEY = 'admin_cp_repository_fallback';

export default function AdminCpManagement() {
  const { user } = useAuth();
  const [cpList, setCpList] = useState<CapaianPembelajaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [previewCp, setPreviewCp] = useState<CapaianPembelajaran | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dbTableMissing, setDbTableMissing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    mata_pelajaran: 'Informatika',
    custom_subject: '',
    fase: 'Fase E (Kelas X)',
    judul: '',
    deskripsi: '',
    teks_cp: ''
  });
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchCpData();
  }, []);

  async function fetchCpData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('capaian_pembelajaran')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('relation')) {
          setDbTableMissing(true);
          // Load from fallback localStorage
          const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (localData) {
            try {
              setCpList(JSON.parse(localData));
            } catch {
              setCpList([]);
            }
          }
        } else {
          console.error('Error fetching CP:', error);
        }
      } else if (data) {
        setDbTableMissing(false);
        setCpList(data);
      }
    } catch (err) {
      console.warn('Fallback loading local CP data');
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localData) {
        try {
          setCpList(JSON.parse(localData));
        } catch {
          setCpList([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Ukuran file maksimal adalah 15 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl: reader.result as string
      });
      // Auto fill title if empty
      if (!formData.judul) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        setFormData(prev => ({ ...prev, judul: cleanName }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const finalSubject = formData.mata_pelajaran === 'LAINNYA' 
      ? formData.custom_subject.trim() 
      : formData.mata_pelajaran;

    if (!finalSubject) {
      setErrorMessage('Mata pelajaran wajib diisi.');
      return;
    }
    if (!formData.judul.trim()) {
      setErrorMessage('Judul dokumen CP wajib diisi.');
      return;
    }
    if (!formData.teks_cp.trim() && !selectedFile) {
      setErrorMessage('Harap masukkan Teks Capaian Pembelajaran atau unggah file dokumen CP.');
      return;
    }

    setSubmitting(true);
    const newRecord: CapaianPembelajaran = {
      id: crypto.randomUUID(),
      mata_pelajaran: finalSubject,
      fase: formData.fase,
      judul: formData.judul.trim(),
      deskripsi: formData.deskripsi.trim() || undefined,
      teks_cp: formData.teks_cp.trim() || undefined,
      file_name: selectedFile?.name,
      file_size: selectedFile?.size,
      file_type: selectedFile?.type,
      file_data: selectedFile?.dataUrl,
      uploaded_by: user?.id,
      created_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('capaian_pembelajaran')
        .insert([newRecord]);

      if (error) {
        console.warn('Simpan ke Supabase gagal, beralih ke cache lokal:', error.message);
        setDbTableMissing(true);
      }
      
      // Save to local cache as backup
      const updatedList = [newRecord, ...cpList];
      setCpList(updatedList);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

      setSuccessMessage('Dokumen Capaian Pembelajaran (CP) berhasil diunggah!');
      setTimeout(() => {
        setIsUploadModalOpen(false);
        resetForm();
      }, 1200);
    } catch (err: any) {
      const updatedList = [newRecord, ...cpList];
      setCpList(updatedList);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
      setSuccessMessage('Dokumen disimpan ke repositori CP!');
      setTimeout(() => {
        setIsUploadModalOpen(false);
        resetForm();
      }, 1200);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Yakin ingin menghapus dokumen CP: "${title}"?`)) return;

    try {
      await supabase.from('capaian_pembelajaran').delete().eq('id', id);
    } catch (e) {
      console.warn('DB delete error, continuing with local update');
    }

    const updated = cpList.filter(item => item.id !== id);
    setCpList(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  const resetForm = () => {
    setFormData({
      mata_pelajaran: 'Informatika',
      custom_subject: '',
      fase: 'Fase E (Kelas X)',
      judul: '',
      deskripsi: '',
      teks_cp: ''
    });
    setSelectedFile(null);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const copyTextToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadFile = (cp: CapaianPembelajaran) => {
    if (!cp.file_data) {
      alert('Dokumen ini tidak memiliki file lampiran (hanya teks CP).');
      return;
    }
    const link = document.createElement('a');
    link.href = cp.file_data;
    link.download = cp.file_name || `CP_${cp.mata_pelajaran}_${cp.fase}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredList = cpList.filter(item => {
    const matchSearch = 
      item.judul.toLowerCase().includes(search.toLowerCase()) ||
      item.mata_pelajaran.toLowerCase().includes(search.toLowerCase()) ||
      (item.deskripsi && item.deskripsi.toLowerCase().includes(search.toLowerCase())) ||
      (item.teks_cp && item.teks_cp.toLowerCase().includes(search.toLowerCase()));

    const matchPhase = selectedPhase === 'ALL' || item.fase === selectedPhase;
    const matchSubject = selectedSubject === 'ALL' || item.mata_pelajaran === selectedSubject;

    return matchSearch && matchPhase && matchSubject;
  });

  const sqlAlterScript = `-- Jalankan query ini di menu SQL Editor pada Dashboard Supabase Anda:
CREATE TABLE IF NOT EXISTS public.capaian_pembelajaran (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mata_pelajaran TEXT NOT NULL,
  fase TEXT NOT NULL,
  judul TEXT NOT NULL,
  deskripsi TEXT,
  teks_cp TEXT,
  file_name TEXT,
  file_size NUMERIC,
  file_type TEXT,
  file_data TEXT,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs tracking-wider uppercase mb-1">
            <Database className="w-4 h-4" />
            Repositori Dokumen Kurikulum Merdeka
          </div>
          <h1 className="text-2xl font-black text-gray-900">Kelola Capaian Pembelajaran (CP)</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Unggah dan simpan berkas resmi Capaian Pembelajaran (CP) untuk dibaca, diunduh, dan dijadikan acuan otomatis oleh guru saat merancang Modul Ajar dan Bahan Ajar AI.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSqlModalOpen(true)}
            className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-xs flex items-center transition"
          >
            <Database className="w-4 h-4 mr-1.5 text-gray-600" />
            Script SQL Supabase
          </button>

          <button
            onClick={() => {
              resetForm();
              setIsUploadModalOpen(true);
            }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-sm flex items-center transition"
          >
            <Plus className="w-4 h-4 mr-2" />
            Unggah Dokumen CP
          </button>
        </div>
      </div>

      {/* Database Banner if table missing */}
      {dbTableMissing && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">Pemberitahuan Database Supabase</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Tabel <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">public.capaian_pembelajaran</code> belum dibuat di Supabase. Data saat ini disimpan sementara di memori lokal. Silakan jalankan script SQL di Supabase SQL Editor agar data tersimpan permanen di cloud.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSqlModalOpen(true)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold whitespace-nowrap"
          >
            Lihat Query SQL
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Cari berdasarkan judul dokumen, mata pelajaran, atau isi teks CP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={selectedSubject}
          onChange={e => setSelectedSubject(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium"
        >
          <option value="ALL">Semua Mata Pelajaran</option>
          {COMMON_SUBJECTS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={selectedPhase}
          onChange={e => setSelectedPhase(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium"
        >
          <option value="ALL">Semua Fase / Tingkat</option>
          {PHASES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* CP List Table / Cards */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Memuat repositori Capaian Pembelajaran...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">Belum ada dokumen CP yang cocok</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {search || selectedPhase !== 'ALL' || selectedSubject !== 'ALL'
              ? 'Coba sesuaikan kata kunci pencarian atau filter yang Anda pilih.'
              : 'Klik tombol "Unggah Dokumen CP" di atas untuk menambahkan berkas Capaian Pembelajaran pertama.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredList.map(cp => (
            <div
              key={cp.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
                    {cp.mata_pelajaran}
                  </span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                    {cp.fase}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 mb-2">
                  {cp.judul}
                </h3>

                {cp.deskripsi && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                    {cp.deskripsi}
                  </p>
                )}

                {cp.teks_cp && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-700 line-clamp-3 mb-3 font-mono leading-relaxed">
                    {cp.teks_cp}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>{new Date(cp.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {cp.file_name && (
                    <span className="font-medium text-gray-500">
                      📎 {cp.file_name.length > 20 ? cp.file_name.slice(0, 18) + '...' : cp.file_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setPreviewCp(cp);
                      setIsPreviewModalOpen(true);
                    }}
                    className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center justify-center"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Lihat Teks CP
                  </button>

                  {cp.file_data && (
                    <button
                      onClick={() => downloadFile(cp)}
                      title="Unduh file dokumen asli"
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(cp.id, cp.judul)}
                    title="Hapus dokumen CP"
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Unggah Capaian Pembelajaran (CP)</h2>
                <p className="text-xs text-gray-500">Berkas dan narasi CP akan disimpan di database untuk diakses oleh semua guru.</p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 mb-4 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center gap-2 border border-emerald-200">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveCp} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Mata Pelajaran</label>
                  <select
                    value={formData.mata_pelajaran}
                    onChange={e => setFormData({ ...formData, mata_pelajaran: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {COMMON_SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="LAINNYA">+ Ketik Mata Pelajaran Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Fase / Jenjang</label>
                  <select
                    value={formData.fase}
                    onChange={e => setFormData({ ...formData, fase: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {PHASES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.mata_pelajaran === 'LAINNYA' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Nama Mata Pelajaran</label>
                  <input
                    type="text"
                    placeholder="Contoh: Muatan Lokal Bahasa Sunda"
                    value={formData.custom_subject}
                    onChange={e => setFormData({ ...formData, custom_subject: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Judul Dokumen CP</label>
                <input
                  type="text"
                  placeholder="Contoh: Capaian Pembelajaran Informatika Fase E (SK BSKAP 032/H/KR/2024)"
                  value={formData.judul}
                  onChange={e => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Deskripsi / Keterangan Singkat (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Dokumen kurikulum merdeka revisi terbaru, mencakup elemen DPK & TIK"
                  value={formData.deskripsi}
                  onChange={e => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Teks Narasi Capaian Pembelajaran (CP)
                  <span className="text-gray-400 font-normal ml-1">(Sangat disarankan diisi agar guru dapat menyalin langsung)</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Tempelkan (paste) teks Capaian Pembelajaran lengkap di sini. Contoh: Pada akhir fase E, peserta didik mampu menerapkan strategi algoritmik standar..."
                  value={formData.teks_cp}
                  onChange={e => setFormData({ ...formData, teks_cp: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Unggah Dokumen Lampiran File (PDF, DOCX, TXT)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 text-center hover:bg-gray-50 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.rtf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-indigo-700 font-bold text-xs">
                      <FileCheck className="w-5 h-5 text-indigo-600" />
                      <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                      <p className="text-xs text-gray-600 font-medium">Klik atau seret file PDF / Word ke sini</p>
                      <p className="text-[11px] text-gray-400">Maksimal 15 MB. Disimpan langsung ke storage database.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan Dokumen...' : 'Simpan ke Repositori CP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewModalOpen && previewCp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
                {previewCp.mata_pelajaran}
              </span>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                {previewCp.fase}
              </span>
            </div>

            <h2 className="text-xl font-black text-gray-900 mb-2">{previewCp.judul}</h2>
            {previewCp.deskripsi && (
              <p className="text-xs text-gray-500 mb-4">{previewCp.deskripsi}</p>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">Teks Capaian Pembelajaran (CP):</label>
                {previewCp.teks_cp && (
                  <button
                    onClick={() => copyTextToClipboard(previewCp.teks_cp!, previewCp.id)}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  >
                    {copiedId === previewCp.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Salin Teks CP
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs font-mono leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap text-gray-800">
                {previewCp.teks_cp || 'Teks CP tidak tersedia secara langsung. Silakan unduh berkas lampiran untuk melihat dokumen lengkap.'}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Diunggah pada: {new Date(previewCp.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}
              </span>
              {previewCp.file_data && (
                <button
                  onClick={() => downloadFile(previewCp)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Unduh Dokumen File ({previewCp.file_name})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SQL Alter Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setIsSqlModalOpen(false)}
              className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Query SQL Pembuatan Tabel CP</h2>
                <p className="text-xs text-gray-500">Jalankan query ini di Supabase SQL Editor untuk membuat tabel penyimpanan permanen.</p>
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 bg-gray-900 text-emerald-400 rounded-2xl text-xs font-mono overflow-x-auto leading-relaxed max-h-72">
                {sqlAlterScript}
              </pre>
              <button
                onClick={() => copyTextToClipboard(sqlAlterScript, 'sql-query')}
                className="absolute right-3 top-3 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
              >
                {copiedId === 'sql-query' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Query Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Salin SQL
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 leading-relaxed">
              <strong>Cara Menjalankan:</strong> Buka <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-bold">Supabase Dashboard</a> &rarr; Pilih Project &rarr; Klik menu <strong>SQL Editor</strong> &rarr; Buat "New query", tempel script di atas &rarr; Klik <strong>Run</strong>.
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
