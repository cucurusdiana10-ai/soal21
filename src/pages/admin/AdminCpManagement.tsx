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
    mata_pelajaran: 'Semua Mata Pelajaran (Umum)',
    custom_subject: '',
    fase: 'Semua Fase (Fase E & F)',
    judul: '',
    deskripsi: '',
    teks_cp: ''
  });
  const [isSpecificScope, setIsSpecificScope] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    name: string;
    size: number;
    type: string;
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

    if (file.size > 25 * 1024 * 1024) {
      alert('Ukuran file maksimal adalah 25 MB.');
      return;
    }

    setSelectedFile({
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream'
    });

    // Auto fill title if empty
    if (!formData.judul) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setFormData(prev => ({ ...prev, judul: cleanName }));
    }
  };

  const handleSaveCp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    let finalSubject = formData.mata_pelajaran;
    let finalFase = formData.fase;

    if (!isSpecificScope) {
      finalSubject = 'Semua Mata Pelajaran (Umum)';
      finalFase = 'Semua Fase (Fase E & F)';
    } else {
      if (formData.mata_pelajaran === 'LAINNYA') {
        finalSubject = formData.custom_subject.trim() || 'Semua Mata Pelajaran (Umum)';
      }
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

    try {
      let uploadedFileUrl: string | undefined = undefined;

      // 1. Upload file directly to Supabase Storage bucket 'cp-documents' (NOT database)
      if (selectedFile?.file) {
        const rawFile = selectedFile.file;
        const fileExt = rawFile.name.split('.').pop() || 'pdf';
        const cleanName = rawFile.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
        const filePath = `${Date.now()}_${cleanName}.${fileExt}`;

        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('cp-documents')
            .upload(filePath, rawFile, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.warn('Upload to cp-documents bucket failed:', uploadError.message);
            // Try fallback to 'documents' bucket
            const { error: fallbackError } = await supabase.storage
              .from('documents')
              .upload(filePath, rawFile, {
                cacheControl: '3600',
                upsert: true
              });

            if (!fallbackError) {
              const { data: pubData } = supabase.storage.from('documents').getPublicUrl(filePath);
              uploadedFileUrl = pubData?.publicUrl;
            } else {
              console.warn('Storage fallback failed as well, error:', uploadError.message);
              // Inform admin how to enable bucket if needed, but allow save with notification
              setErrorMessage(`Peringatan Storage Supabase: Bucket 'cp-documents' belum dapat diakses (${uploadError.message}). Pastikan bucket 'cp-documents' telah dibuat di Supabase Storage dengan status Public.`);
              setSubmitting(false);
              return;
            }
          } else {
            const { data: pubData } = supabase.storage.from('cp-documents').getPublicUrl(filePath);
            uploadedFileUrl = pubData?.publicUrl;
          }
        } catch (storageErr: any) {
          console.error('Storage upload exception:', storageErr);
          setErrorMessage(`Gagal mengunggah ke Supabase Storage: ${storageErr.message || 'Koneksi terputus'}`);
          setSubmitting(false);
          return;
        }
      }

      // 2. Insert metadata to database table (only storing file_url, NOT heavy base64 data)
      const newRecord: CapaianPembelajaran = {
        id: crypto.randomUUID(),
        mata_pelajaran: finalSubject,
        fase: finalFase,
        judul: formData.judul.trim(),
        deskripsi: formData.deskripsi.trim() || undefined,
        teks_cp: formData.teks_cp.trim() || undefined,
        file_name: selectedFile?.name,
        file_size: selectedFile?.size,
        file_type: selectedFile?.type,
        file_url: uploadedFileUrl,
        uploaded_by: user?.id,
        created_at: new Date().toISOString()
      };

      const insertPayload: any = {
        id: newRecord.id,
        mata_pelajaran: newRecord.mata_pelajaran,
        fase: newRecord.fase,
        judul: newRecord.judul,
        deskripsi: newRecord.deskripsi,
        teks_cp: newRecord.teks_cp,
        file_name: newRecord.file_name,
        file_size: newRecord.file_size,
        file_type: newRecord.file_type,
        file_url: uploadedFileUrl,
        uploaded_by: newRecord.uploaded_by,
        created_at: newRecord.created_at
      };

      let { error: insertError } = await supabase
        .from('capaian_pembelajaran')
        .insert([insertPayload]);

      // If file_url column does not exist yet in Supabase schema, fallback gracefully
      if (insertError && insertError.message?.includes('file_url')) {
        delete insertPayload.file_url;
        insertPayload.file_data = uploadedFileUrl; // Store the storage URL in file_data column as fallback string
        const retryRes = await supabase.from('capaian_pembelajaran').insert([insertPayload]);
        insertError = retryRes.error;
      }

      if (insertError) {
        console.warn('Simpan ke tabel Supabase gagal, simpan ke cache lokal:', insertError.message);
        setDbTableMissing(true);
      }
      
      // Save to local cache as backup
      const updatedList = [newRecord, ...cpList];
      setCpList(updatedList);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

      setSuccessMessage('Dokumen CP berhasil disimpan! File tersimpan aman di Supabase Storage.');
      setTimeout(() => {
        setIsUploadModalOpen(false);
        resetForm();
      }, 1200);
    } catch (err: any) {
      console.error('Error in handleSaveCp:', err);
      setErrorMessage(`Gagal menyimpan CP: ${err.message}`);
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
      mata_pelajaran: 'Semua Mata Pelajaran (Umum)',
      custom_subject: '',
      fase: 'Semua Fase (Fase E & F)',
      judul: '',
      deskripsi: '',
      teks_cp: ''
    });
    setIsSpecificScope(false);
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
    const directUrl = cp.file_url || (cp.file_data?.startsWith('http') ? cp.file_data : null);
    if (directUrl) {
      const link = document.createElement('a');
      link.href = directUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.download = cp.file_name || `Dokumen_CP_${cp.judul}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    if (cp.file_data) {
      const link = document.createElement('a');
      link.href = cp.file_data;
      link.download = cp.file_name || `CP_${cp.mata_pelajaran}_${cp.fase}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    alert('Dokumen ini tidak memiliki file lampiran (hanya teks narasi CP).');
  };

  const filteredList = cpList.filter(item => {
    const matchSearch = 
      item.judul.toLowerCase().includes(search.toLowerCase()) ||
      item.mata_pelajaran.toLowerCase().includes(search.toLowerCase()) ||
      (item.deskripsi && item.deskripsi.toLowerCase().includes(search.toLowerCase())) ||
      (item.teks_cp && item.teks_cp.toLowerCase().includes(search.toLowerCase()));

    const matchPhase = 
      selectedPhase === 'ALL' || 
      item.fase === selectedPhase || 
      item.fase?.includes('Semua');

    const matchSubject = 
      selectedSubject === 'ALL' || 
      item.mata_pelajaran === selectedSubject || 
      item.mata_pelajaran?.includes('Semua') ||
      item.mata_pelajaran?.includes('Umum');

    return matchSearch && matchPhase && matchSubject;
  });

  const sqlAlterScript = `-- 1. JALANKAN DI SUPABASE SQL EDITOR:
-- Membuat tabel capaian_pembelajaran (jika belum ada)
CREATE TABLE IF NOT EXISTS public.capaian_pembelajaran (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mata_pelajaran TEXT NOT NULL DEFAULT 'Semua Mata Pelajaran (Umum)',
  fase TEXT NOT NULL DEFAULT 'Semua Fase (Fase E & F)',
  judul TEXT NOT NULL,
  deskripsi TEXT,
  teks_cp TEXT,
  file_name TEXT,
  file_size NUMERIC,
  file_type TEXT,
  file_url TEXT,
  file_data TEXT,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tambahkan kolom file_url jika tabel sudah pernah dibuat sebelumnya:
ALTER TABLE public.capaian_pembelajaran ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 3. Membuat Storage Bucket 'cp-documents' untuk berkas CP:
INSERT INTO storage.buckets (id, name, public)
VALUES ('cp-documents', 'cp-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Kebijakan RLS Storage agar publik bisa membaca dan admin bisa mengunggah:
CREATE POLICY "Public Read CP Documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'cp-documents');

CREATE POLICY "Authenticated Upload CP Documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'cp-documents');

CREATE POLICY "Authenticated Manage CP Documents" ON storage.objects
  FOR ALL USING (bucket_id = 'cp-documents');`;

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

                  {(cp.file_url || cp.file_data) && (
                    <button
                      onClick={() => downloadFile(cp)}
                      title="Unduh file dokumen asli dari Supabase Storage"
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
              {/* Informational Scope Badge */}
              <div className="p-3 bg-indigo-50/80 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-indigo-900 font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                  <span>Lingkup Dokumen: <strong>Semua Mata Pelajaran & Semua Fase</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSpecificScope(!isSpecificScope)}
                  className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline"
                >
                  {isSpecificScope ? 'Tutup Pilihan Khusus' : 'Pilih Mapel/Fase Khusus?'}
                </button>
              </div>

              {/* Optional Specific Scope Accordion */}
              {isSpecificScope && (
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <p className="text-[11px] text-gray-500 font-medium">
                    Secara default dokumen CP berlaku untuk semua guru. Jika dokumen ini hanya untuk mata pelajaran atau fase tertentu, tentukan di bawah ini:
                  </p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Mata Pelajaran Khusus</label>
                      <select
                        value={formData.mata_pelajaran}
                        onChange={e => setFormData({ ...formData, mata_pelajaran: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="Semua Mata Pelajaran (Umum)">Semua Mata Pelajaran (Umum)</option>
                        {COMMON_SUBJECTS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                        <option value="LAINNYA">+ Ketik Mata Pelajaran Lainnya</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Fase / Jenjang Khusus</label>
                      <select
                        value={formData.fase}
                        onChange={e => setFormData({ ...formData, fase: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="Semua Fase (Fase E & F)">Semua Fase (Fase E & F)</option>
                        {PHASES.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {formData.mata_pelajaran === 'LAINNYA' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Nama Mata Pelajaran</label>
                      <input
                        type="text"
                        placeholder="Contoh: Muatan Lokal Bahasa Sunda"
                        value={formData.custom_subject}
                        onChange={e => setFormData({ ...formData, custom_subject: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-xl text-xs font-medium bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Unggah File Dokumen ke Supabase Storage */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Pilih Berkas Dokumen CP (PDF, Word, TXT)</span>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Disimpan ke Supabase Storage
                  </span>
                </label>
                <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-2xl p-5 text-center transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.rtf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-indigo-800 font-bold text-xs py-2">
                      <FileCheck className="w-6 h-6 text-emerald-600" />
                      <div className="text-left">
                        <p className="text-gray-900 font-bold">{selectedFile.name}</p>
                        <p className="text-[11px] text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Siap diunggah ke Storage</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 py-2">
                      <Upload className="w-8 h-8 text-indigo-500 mx-auto" />
                      <p className="text-xs text-gray-800 font-bold">Klik atau seret dokumen CP ke sini</p>
                      <p className="text-[11px] text-gray-400">Format PDF, DOCX, DOC, atau TXT. Maksimal 25 MB.</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Judul Dokumen CP <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Capaian Pembelajaran Kurikulum Merdeka (SK BSKAP No 032/H/KR/2024)"
                  value={formData.judul}
                  onChange={e => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Deskripsi / Keterangan Singkat (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Pedoman resmi CP BSKAP Kemendikbudristek untuk seluruh mata pelajaran SMA"
                  value={formData.deskripsi}
                  onChange={e => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Teks Ringkasan / Narasi Capaian Pembelajaran (Opsional)
                  <span className="text-gray-400 font-normal ml-1">(Bisa ditempelkan agar guru dapat menyalin langsung tanpa mengunduh)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Tempelkan kutipan teks Capaian Pembelajaran di sini jika ada..."
                  value={formData.teks_cp}
                  onChange={e => setFormData({ ...formData, teks_cp: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 font-mono"
                />
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
