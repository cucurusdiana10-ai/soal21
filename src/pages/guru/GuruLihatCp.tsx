import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CapaianPembelajaran } from '../../types';
import { 
  FileText, Search, Download, Copy, Check, Eye, 
  Sparkles, BookOpen, ArrowRight, X, ExternalLink 
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

export default function GuruLihatCp() {
  const navigate = useNavigate();
  const [cpList, setCpList] = useState<CapaianPembelajaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');

  const [previewCp, setPreviewCp] = useState<CapaianPembelajaran | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCpList();
  }, []);

  async function fetchCpList() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('capaian_pembelajaran')
        .select('*')
        .order('mata_pelajaran', { ascending: true });

      if (error) {
        console.warn('Mengambil CP dari cache lokal:', error.message);
        loadFromLocalStorage();
      } else if (data && data.length > 0) {
        setCpList(data);
      } else {
        loadFromLocalStorage();
      }
    } catch {
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  }

  function loadFromLocalStorage() {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      try {
        setCpList(JSON.parse(local));
      } catch {
        setCpList([]);
      }
    }
  }

  const copyTextToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadFile = (cp: CapaianPembelajaran) => {
    if (!cp.file_data) {
      alert('Dokumen ini hanya memuat teks narasi CP tanpa file lampiran terpisah.');
      return;
    }
    const link = document.createElement('a');
    link.href = cp.file_data;
    link.download = cp.file_name || `CP_${cp.mata_pelajaran}_${cp.fase}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUseInModulAjar = (cp: CapaianPembelajaran) => {
    // Navigate to Modul Ajar generator with pre-filled CP and Subject
    sessionStorage.setItem('prefill_modul_cp', cp.teks_cp || cp.judul);
    sessionStorage.setItem('prefill_modul_subject', cp.mata_pelajaran);
    sessionStorage.setItem('prefill_modul_grade', cp.fase);
    navigate('/dashboard/modul');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            Kurikulum Merdeka SMAN 21 Garut
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">
            Daftar Capaian Pembelajaran (CP)
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Repositori resmi Capaian Pembelajaran yang diunggah oleh pihak sekolah. Anda dapat membaca rincian elemen, menyalin teks CP, mengunduh file, atau langsung menerapkannya pada generator Modul Ajar Otomatis.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/modul')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition whitespace-nowrap self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          Buka Modul Ajar Otomatis
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Cari mata pelajaran, judul dokumen, atau kata kunci CP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={selectedSubject}
          onChange={e => setSelectedSubject(e.target.value)}
          className="px-3.5 py-2.5 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-semibold"
        >
          <option value="ALL">Semua Mata Pelajaran</option>
          {COMMON_SUBJECTS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={selectedPhase}
          onChange={e => setSelectedPhase(e.target.value)}
          className="px-3.5 py-2.5 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-semibold"
        >
          <option value="ALL">Semua Fase / Tingkat</option>
          {PHASES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* CP Cards */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-200">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Memuat dokumen Capaian Pembelajaran...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">Tidak ada dokumen CP yang ditemukan</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {search || selectedPhase !== 'ALL' || selectedSubject !== 'ALL'
              ? 'Silakan coba ubah kata kunci pencarian atau filter mata pelajaran.'
              : 'Admin sekolah belum mengunggah dokumen Capaian Pembelajaran (CP). Silakan hubungi admin sekolah jika memerlukan berkas kurikulum resmi.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map(cp => (
            <div
              key={cp.id}
              className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold">
                    {cp.mata_pelajaran}
                  </span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                    {cp.fase}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 text-base leading-snug mb-2">
                  {cp.judul}
                </h3>

                {cp.deskripsi && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                    {cp.deskripsi}
                  </p>
                )}

                {cp.teks_cp ? (
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-700 line-clamp-4 mb-4 font-mono leading-relaxed">
                    {cp.teks_cp}
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-400 italic mb-4">
                    Berkas lampiran tersedia untuk diunduh.
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-2.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPreviewCp(cp);
                    }}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition flex items-center justify-center"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5 text-gray-600" />
                    Baca Teks CP
                  </button>

                  {cp.file_data && (
                    <button
                      onClick={() => downloadFile(cp)}
                      title="Unduh file dokumen"
                      className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition flex items-center"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleUseInModulAjar(cp)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Gunakan untuk Modul Ajar Otomatis
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewCp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setPreviewCp(null)}
              className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold">
                {previewCp.mata_pelajaran}
              </span>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                {previewCp.fase}
              </span>
            </div>

            <h2 className="text-xl font-black text-gray-900 mb-1">{previewCp.judul}</h2>
            {previewCp.deskripsi && (
              <p className="text-xs text-gray-500 mb-4">{previewCp.deskripsi}</p>
            )}

            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">Teks Lengkap Capaian Pembelajaran:</label>
                {previewCp.teks_cp && (
                  <button
                    onClick={() => copyTextToClipboard(previewCp.teks_cp!, previewCp.id)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    {copiedId === previewCp.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Tersalin ke Clipboard!
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

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs font-mono leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap text-gray-800">
                {previewCp.teks_cp || 'Teks narasi tidak tersedia. Silakan gunakan tombol unduh di bawah untuk membaca file dokumen lengkap.'}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              {previewCp.file_data ? (
                <button
                  onClick={() => downloadFile(previewCp)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Unduh Dokumen ({previewCp.file_name || 'File'})
                </button>
              ) : <div />}

              <button
                onClick={() => {
                  setPreviewCp(null);
                  handleUseInModulAjar(previewCp);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Gunakan di Modul Ajar Otomatis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
