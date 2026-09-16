import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { searchCpApi, CpSearchResult } from '../../lib/aiService';
import {
  SavedCpItem,
  getTeacherSavedCps,
  saveTeacherCp,
  deleteTeacherCp,
  DOKUMEN_RESMI_CP_URL,
} from '../../lib/cpStorage';
import {
  FileText,
  Search,
  Download,
  Copy,
  Check,
  Eye,
  Sparkles,
  BookOpen,
  ArrowRight,
  X,
  ExternalLink,
  Bookmark,
  Trash2,
  Loader2,
  CheckCircle2,
  Layers,
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
  'Bimbingan Konseling',
];

const PHASES = [
  'Fase E (Kelas X)',
  'Fase F (Kelas XI - XII)',
  'Fase E & F (SMA)',
];

export default function GuruLihatCp() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search');

  // Search parameters
  const [selectedSubject, setSelectedSubject] = useState('Informatika');
  const [customSubject, setCustomSubject] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('Fase E (Kelas X)');
  const [keyword, setKeyword] = useState('');

  // Search results state
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<CpSearchResult | null>(null);
  const [searchError, setSearchError] = useState('');

  // Saved CP collection state
  const [savedList, setSavedList] = useState<SavedCpItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savedFilterSubject, setSavedFilterSubject] = useState('ALL');
  const [savedSearchQuery, setSavedSearchQuery] = useState('');

  // Action status indicators
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<SavedCpItem | null>(null);

  useEffect(() => {
    loadSavedCps();
  }, [user]);

  async function loadSavedCps() {
    if (!user) return;
    setLoadingSaved(true);
    try {
      const items = await getTeacherSavedCps(user.id);
      setSavedList(items);
    } catch (e) {
      console.warn('Gagal memuat CP tersimpan:', e);
    } finally {
      setLoadingSaved(false);
    }
  }

  const handleSearchCp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const mapel = selectedSubject === 'LAINNYA' ? customSubject.trim() : selectedSubject;
    if (!mapel) {
      alert('Pilih atau ketik mata pelajaran terlebih dahulu.');
      return;
    }

    setSearching(true);
    setSearchError('');

    try {
      const res = await searchCpApi({
        subject: mapel,
        fase: selectedPhase,
        keyword: keyword.trim() || undefined,
      });
      setSearchResult(res);
    } catch (err: any) {
      console.error('Error searching CP:', err);
      setSearchError(
        err.message || 'Gagal mencari Capaian Pembelajaran dari dokumen BSKAP 046/2025.'
      );
    } finally {
      setSearching(false);
    }
  };

  const handleSaveCpItem = async (
    judul: string,
    teksCp: string,
    elemenName?: string,
    materiPokok?: string[]
  ) => {
    if (!user) return;
    const mapel = searchResult?.mataPelajaran || selectedSubject;
    const fase = searchResult?.fase || selectedPhase;

    try {
      const saved = await saveTeacherCp(user.id, {
        mata_pelajaran: mapel,
        fase,
        judul,
        deskripsi: `Acuan resmi KepKa BSKAP No. 046/H/KR/2025 (${elemenName || 'Capaian Umum'})`,
        teks_cp: teksCp,
        elemen: elemenName,
        materi_pokok: materiPokok,
      });

      setSavedList((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      setSavedFeedback(judul);
      setTimeout(() => setSavedFeedback(null), 3500);
    } catch (err: any) {
      alert('Gagal menyimpan CP: ' + (err.message || 'Error'));
    }
  };

  const handleDeleteSaved = async (id: string) => {
    if (!user) return;
    if (!confirm('Hapus Capaian Pembelajaran ini dari koleksi akun Anda?')) return;
    try {
      await deleteTeacherCp(user.id, id);
      setSavedList((prev) => prev.filter((item) => item.id !== id));
      if (previewItem?.id === id) setPreviewItem(null);
    } catch (err: any) {
      alert('Gagal menghapus: ' + (err.message || 'Error'));
    }
  };

  const copyTextToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUseInModulAjar = (item: {
    mata_pelajaran: string;
    fase?: string;
    teks_cp: string;
  }) => {
    sessionStorage.setItem('prefill_modul_cp', item.teks_cp);
    sessionStorage.setItem('prefill_modul_subject', item.mata_pelajaran);
    if (item.fase) {
      sessionStorage.setItem('prefill_modul_grade', item.fase);
    }
    navigate('/dashboard/modul');
  };

  // Unique subjects in saved collection
  const uniqueSavedSubjects = Array.from(
    new Set(savedList.map((s) => s.mata_pelajaran).filter(Boolean))
  );

  const filteredSavedList = savedList.filter((item) => {
    const q = savedSearchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      item.judul.toLowerCase().includes(q) ||
      item.mata_pelajaran.toLowerCase().includes(q) ||
      item.teks_cp.toLowerCase().includes(q) ||
      (item.elemen && item.elemen.toLowerCase().includes(q));

    const matchSubject =
      savedFilterSubject === 'ALL' || item.mata_pelajaran === savedFilterSubject;

    return matchQuery && matchSubject;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner: Official BSKAP Regulation Reference */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-200 border border-blue-400/30 rounded-full text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            Dokumen Kurikulum Merdeka Resmi Kemendikbudristek
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Repositori Capaian Pembelajaran (CP)
          </h1>
          <p className="text-blue-100/90 text-xs md:text-sm leading-relaxed max-w-3xl">
            Pencarian cerdas Capaian Pembelajaran yang mengacu langsung pada dokumen induk regulasi resmi:{' '}
            <strong>Keputusan Kepala BSKAP No. 046/H/KR/2025</strong>. Guru dapat mencari CP per elemen, menyimpannya ke akun masing-masing, dan langsung menjadikannya acuan pembuatan Modul Ajar Otomatis.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <a
              href={DOKUMEN_RESMI_CP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Buka PDF Asli KepKa BSKAP 046/2025
              <ExternalLink className="w-3.5 h-3.5 opacity-75" />
            </a>

            <a
              href={DOKUMEN_RESMI_CP_URL}
              download="KepKaBSKAP-046_2025-ttg-CP.pdf"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition"
            >
              <Download className="w-4 h-4" />
              Unduh Berkas PDF Resmi
            </a>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
            activeTab === 'search'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Search className="w-4 h-4" />
          Pencarian CP BSKAP 046/2025
        </button>

        <button
          onClick={() => {
            setActiveTab('saved');
            loadSavedCps();
          }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
            activeTab === 'saved'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          Koleksi CP Tersimpan Saya
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === 'saved' ? 'bg-blue-800 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {savedList.length}
          </span>
        </button>
      </div>

      {/* Notification when item saved */}
      {savedFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-800 font-semibold shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>
              Berhasil menyimpan <strong>"{savedFeedback}"</strong> ke koleksi akun Anda!
            </span>
          </div>
          <button
            onClick={() => setActiveTab('saved')}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
          >
            Lihat Koleksi <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: PENCARIAN CP BSKAP 046/2025 */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Pencarian Capaian Pembelajaran Dokumen BSKAP 046/2025
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Pilih mata pelajaran dan fase untuk menelusuri teks Capaian Pembelajaran, rasional, dan elemen-elemen resmi.
              </p>
            </div>

            <form onSubmit={handleSearchCp} className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Mata Pelajaran */}
              <div className="md:col-span-5 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Mata Pelajaran</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {COMMON_SUBJECTS.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                  <option value="LAINNYA">+ Ketik Mata Pelajaran Lain...</option>
                </select>

                {selectedSubject === 'LAINNYA' && (
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="Masukkan nama mata pelajaran..."
                    className="w-full mt-2 p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                )}
              </div>

              {/* Fase */}
              <div className="md:col-span-3 space-y-1">
                <label className="block text-xs font-bold text-gray-700">Fase / Kelas</label>
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {PHASES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topik / Kata Kunci Khusus */}
              <div className="md:col-span-4 space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Topik / Elemen Khusus (Opsional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Contoh: Berpikir Komputasional, Aljabar..."
                    className="flex-1 p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={searching}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                  >
                    {searching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mencari...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Cari CP
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {searchError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-2">
              <p className="font-bold">Gagal memproses pencarian CP:</p>
              <p>{searchError}</p>
            </div>
          )}

          {/* Search Result Display */}
          {searchResult && (
            <div className="space-y-4">
              {/* Header result */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                        {searchResult.mataPelajaran}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {searchResult.fase}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {searchResult.dasarHukum}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-gray-900">
                      Capaian Pembelajaran: {searchResult.mataPelajaran} ({searchResult.fase})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveCpItem(
                          `CP Lengkap ${searchResult.mataPelajaran} (${searchResult.fase})`,
                          searchResult.capaianFaseUmum
                        )
                      }
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      Simpan Seluruh CP ke Akun
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUseInModulAjar({
                          mata_pelajaran: searchResult.mataPelajaran,
                          fase: searchResult.fase,
                          teks_cp: searchResult.capaianFaseUmum,
                        })
                      }
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Gunakan di Modul Ajar
                    </button>
                  </div>
                </div>

                {/* Rasional */}
                {searchResult.rasionalSingkat && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-600">
                      Rasional Mata Pelajaran
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {searchResult.rasionalSingkat}
                    </p>
                  </div>
                )}

                {/* Capaian Umum */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      Teks Capaian Pembelajaran Umum Fase:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyTextToClipboard(searchResult.capaianFaseUmum, 'capaian-umum')
                      }
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {copiedId === 'capaian-umum' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Salin Teks
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3.5 bg-blue-50/50 border border-blue-200/80 rounded-xl text-xs text-gray-800 leading-relaxed italic">
                    "{searchResult.capaianFaseUmum}"
                  </div>
                </div>
              </div>

              {/* Rincian Elemen CP */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Elemen-Elemen Capaian Pembelajaran ({searchResult.elemen.length} Elemen)
                  </h4>
                  <span className="text-xs text-gray-500">
                    Klik "Simpan Elemen Ini" untuk menyimpan fokus materi ke akun Anda
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {searchResult.elemen.map((el, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between gap-3 hover:border-blue-400 transition"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                            Elemen #{idx + 1}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {searchResult.mataPelajaran}
                          </span>
                        </div>

                        <h5 className="font-bold text-gray-900 text-sm">{el.namaElemen}</h5>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <p className="text-xs text-slate-700 leading-relaxed italic">
                            "{el.deskripsiCp}"
                          </p>
                        </div>

                        {el.materiPokok && el.materiPokok.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-gray-600">
                              Materi Pokok Terkait:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {el.materiPokok.map((mp, mIdx) => (
                                <span
                                  key={mIdx}
                                  className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[11px]"
                                >
                                  {mp}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveCpItem(
                                `${el.namaElemen} - ${searchResult.mataPelajaran}`,
                                el.deskripsiCp,
                                el.namaElemen,
                                el.materiPokok
                              )
                            }
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                            Simpan Elemen Ini
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              copyTextToClipboard(el.deskripsiCp, `el-${idx}`)
                            }
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                            title="Salin Teks Elemen"
                          >
                            {copiedId === `el-${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleUseInModulAjar({
                              mata_pelajaran: searchResult.mataPelajaran,
                              fase: searchResult.fase,
                              teks_cp: el.deskripsiCp,
                            })
                          }
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Gunakan
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KOLEKSI CP SAYA (TERSIMPAN) */}
      {activeTab === 'saved' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-blue-600" />
                  Koleksi Capaian Pembelajaran (CP) Akun Saya
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Daftar CP resmi yang telah Anda cari dan simpan. CP ini langsung dapat dipilih saat menyusun Modul Ajar Otomatis.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm self-start sm:self-auto"
              >
                <Search className="w-3.5 h-3.5" /> + Cari CP Baru
              </button>
            </div>

            {/* Filter Bar */}
            {savedList.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="sm:col-span-8 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={savedSearchQuery}
                    onChange={(e) => setSavedSearchQuery(e.target.value)}
                    placeholder="Cari CP tersimpan berdasarkan topik, kata kunci, elemen..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {savedSearchQuery && (
                    <button
                      onClick={() => setSavedSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="sm:col-span-4">
                  <select
                    value={savedFilterSubject}
                    onChange={(e) => setSavedFilterSubject(e.target.value)}
                    className="w-full py-2 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="ALL">Semua Mata Pelajaran</option>
                    {uniqueSavedSubjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* List saved */}
            {loadingSaved ? (
              <div className="py-12 text-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-xs">Memuat koleksi CP tersimpan...</p>
              </div>
            ) : savedList.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <Bookmark className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-700 font-bold text-sm">Belum ada CP yang disimpan.</p>
                <p className="text-gray-500 text-xs mt-1 max-w-md mx-auto">
                  Gunakan tab "Pencarian CP BSKAP 046/2025" untuk mencari Capaian Pembelajaran resmi sesuai mata pelajaran Anda lalu klik tombol "Simpan ke Akun".
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                >
                  Cari CP Sekarang
                </button>
              </div>
            ) : filteredSavedList.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500">
                Tidak ada CP tersimpan yang cocok dengan filter pencarian Anda.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredSavedList.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between gap-3 hover:border-blue-400 hover:shadow-md transition"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                            {item.mata_pelajaran}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.fase}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {new Date(item.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>

                      <h4 className="font-bold text-gray-900 text-sm">{item.judul}</h4>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed italic">
                          "{item.teks_cp}"
                        </p>
                      </div>

                      {item.elemen && (
                        <div className="text-[11px] text-indigo-700 font-semibold">
                          📌 Elemen: {item.elemen}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUseInModulAjar(item)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Gunakan di Modul
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail
                        </button>
                        <button
                          type="button"
                          onClick={() => copyTextToClipboard(item.teks_cp, item.id)}
                          className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                          title="Salin Teks"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSaved(item.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                        title="Hapus dari Koleksi"
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

      {/* Preview Modal for Saved CP */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-900">
                    {previewItem.mata_pelajaran}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                    {previewItem.fase}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900">{previewItem.judul}</h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">Teks Capaian Pembelajaran:</label>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                {previewItem.teks_cp}
              </div>
            </div>

            {previewItem.elemen && (
              <div className="text-xs text-gray-600">
                <strong>Elemen:</strong> {previewItem.elemen}
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => copyTextToClipboard(previewItem.teks_cp, 'modal-preview')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition"
              >
                {copiedId === 'modal-preview' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Salin Teks
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleUseInModulAjar(previewItem);
                    setPreviewItem(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Sparkles className="w-4 h-4" /> Gunakan di Modul Ajar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
