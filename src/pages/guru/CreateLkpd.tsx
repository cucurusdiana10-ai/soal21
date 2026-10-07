import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import {
  ClipboardList,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  FileDown,
  Printer,
  Save,
  Trash2,
  Eye,
  Edit3,
  CheckCircle2,
  Clock,
  RotateCcw,
  Plus,
  Loader2,
  HelpCircle,
  FolderOpen,
  ArrowRight,
  School,
  Users,
  Search,
  Filter,
  Check
} from 'lucide-react';
import { buildLkpdFromModule } from '../../lib/lkpdHelper';
import { exportLkpdToDocx, LkpdContent } from '../../lib/lkpdDocxGenerator';
import { parseKepsek, getStoredTtdKepsek, getStoredCapSekolah } from '../../lib/schoolSettings';
import OfficialSignatureStamp from '../../components/OfficialSignatureStamp';

export default function CreateLkpd() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'archive'>('create');

  // Saved Modul Ajar from Database
  const [savedModules, setSavedModules] = useState<any[]>([]);
  const [loadingModules, setLoadingModules] = useState<boolean>(true);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [moduleSearch, setModuleSearch] = useState<string>('');

  // Meeting selections
  const [selectedMeetingIndex, setSelectedMeetingIndex] = useState<string>('0');
  const [customMeetingCount, setCustomMeetingCount] = useState<number>(1);
  const [customTitle, setCustomTitle] = useState<string>('');

  // LKPD Generation & Output State
  const [generating, setGenerating] = useState<boolean>(false);
  const [savingRecord, setSavingRecord] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [exportingDocx, setExportingDocx] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [lkpdData, setLkpdData] = useState<LkpdContent | null>(null);

  // Saved LKPD records archive
  const [savedLkpds, setSavedLkpds] = useState<any[]>([]);
  const [loadingSavedLkpds, setLoadingSavedLkpds] = useState<boolean>(false);
  const [selectedSavedLkpdId, setSelectedSavedLkpdId] = useState<string | null>(null);

  // School settings
  const [schoolSettings, setSchoolSettings] = useState({
    nama_sekolah: 'SMAN 21 Garut',
    npsn: '20209194',
    alamat_sekolah: 'Jl. Raya Talegong No. 21, Kec. Talegong, Kab. Garut, Jawa Barat 44167',
    nama_kepsek: 'Agus Supriatna, S.Pd., M.Si.',
    nip_kepsek: '',
    ttd_kepsek: getStoredTtdKepsek(),
    cap_sekolah: getStoredCapSekolah()
  });

  useEffect(() => {
    fetchSchoolSettings();
    fetchSavedModules();
    fetchSavedLkpds();
  }, [user]);

  async function fetchSchoolSettings() {
    try {
      const { data } = await supabase.from('app_settings').select('*').limit(1).single();
      if (data) {
        const kepsek = parseKepsek(data.nama_kepsek);
        setSchoolSettings({
          nama_sekolah: data.nama_sekolah || 'SMAN 21 Garut',
          npsn: data.npsn || '20209194',
          alamat_sekolah: data.alamat_sekolah || 'Jl. Raya Talegong No. 21, Kec. Talegong, Kab. Garut, Jawa Barat 44167',
          nama_kepsek: kepsek.nama,
          nip_kepsek: kepsek.nip,
          ttd_kepsek: data.ttd_kepsek || getStoredTtdKepsek(),
          cap_sekolah: data.cap_sekolah || getStoredCapSekolah()
        });
      }
    } catch {}
  }

  async function fetchSavedModules() {
    if (!user) return;
    setLoadingModules(true);
    try {
      const { data } = await supabase
        .from('modul_ajar')
        .select('*')
        .eq('guru_id', user.id)
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setSavedModules(data);
        setSelectedModuleId(data[0].id);
      }
    } catch (err) {
      console.error('Gagal memuat modul tersimpan:', err);
    } finally {
      setLoadingModules(false);
    }
  }

  async function fetchSavedLkpds() {
    if (!user) return;
    setLoadingSavedLkpds(true);
    try {
      const { data } = await supabase
        .from('lkpd_records')
        .select('*')
        .eq('guru_id', user.id)
        .order('created_at', { ascending: false });
      if (data) {
        setSavedLkpds(data);
      }
    } catch (err) {
      console.error('Gagal memuat arsip LKPD:', err);
    } finally {
      setLoadingSavedLkpds(false);
    }
  }

  const selectedModule = savedModules.find(m => m.id === selectedModuleId);
  const meetingsInSelectedModule: any[] = Array.isArray(selectedModule?.content_json?.pertemuan)
    ? selectedModule.content_json.pertemuan
    : [];

  // Update title when module or meeting changes
  useEffect(() => {
    if (selectedModule) {
      const pIdx = parseInt(selectedMeetingIndex, 10);
      const pName = !isNaN(pIdx) && meetingsInSelectedModule[pIdx]?.nama ? meetingsInSelectedModule[pIdx].nama : '';
      if (selectedMeetingIndex === 'ALL') {
        setCustomTitle(`LKPD Lengkap - ${selectedModule.title}`);
      } else if (pName && !pName.toLowerCase().startsWith('pertemuan')) {
        setCustomTitle(`LKPD ${pName} - ${selectedModule.subject_name}`);
      } else {
        setCustomTitle(`LKPD Pertemuan ${pIdx + 1} - ${selectedModule.title}`);
      }
    }
  }, [selectedModuleId, selectedMeetingIndex]);

  const handleGenerateLkpd = () => {
    if (!selectedModule) {
      alert('Pilih Modul Ajar dari arsip terlebih dahulu.');
      return;
    }
    setGenerating(true);
    setIsEditing(false);
    setSaveSuccess(false);

    try {
      const result = buildLkpdFromModule(
        selectedModule,
        selectedMeetingIndex,
        customMeetingCount,
        user
      );

      if (customTitle.trim()) {
        result.identitas.judulLkpd = customTitle.trim();
      }

      setLkpdData(result);
    } catch (err: any) {
      alert('Gagal membuat LKPD: ' + (err?.message || String(err)));
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveLkpdToDb = async () => {
    if (!lkpdData || !user) return;
    setSavingRecord(true);
    try {
      const payload = {
        guru_id: user.id,
        modul_id: selectedModule?.id || null,
        title: lkpdData.identitas.judulLkpd,
        subject_name: lkpdData.identitas.mataPelajaran,
        grade: lkpdData.identitas.fase,
        pertemuan_info: lkpdData.identitas.pertemuanKe,
        content_json: lkpdData,
        updated_at: new Date().toISOString()
      };

      if (selectedSavedLkpdId) {
        const { error } = await supabase
          .from('lkpd_records')
          .update(payload)
          .eq('id', selectedSavedLkpdId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('lkpd_records')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) setSelectedSavedLkpdId(data.id);
      }

      setSaveSuccess(true);
      fetchSavedLkpds();
      setTimeout(() => setSaveSuccess(false), 3000);
      alert('✅ Sukses! Dokumen LKPD berhasil disimpan ke Arsip LKPD.');
    } catch (err: any) {
      alert('Gagal menyimpan LKPD: ' + (err?.message || String(err)));
    } finally {
      setSavingRecord(false);
    }
  };

  const handleExportDocx = async () => {
    if (!lkpdData) return;
    setExportingDocx(true);
    try {
      await exportLkpdToDocx(lkpdData);
    } catch (err: any) {
      alert('Gagal mengunduh file Word (.docx): ' + (err?.message || String(err)));
    } finally {
      setExportingDocx(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLoadArchivedLkpd = (record: any) => {
    if (record.content_json) {
      setLkpdData(record.content_json);
      setSelectedSavedLkpdId(record.id);
      setActiveTab('create');
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  };

  const handleDeleteSavedLkpd = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus arsip LKPD ini?')) return;
    try {
      const { error } = await supabase.from('lkpd_records').delete().eq('id', id);
      if (error) throw error;
      setSavedLkpds(prev => prev.filter(item => item.id !== id));
      if (selectedSavedLkpdId === id) {
        setSelectedSavedLkpdId(null);
      }
    } catch (err: any) {
      alert('Gagal menghapus arsip LKPD: ' + (err?.message || String(err)));
    }
  };

  const filteredModules = savedModules.filter(m => {
    if (!moduleSearch) return true;
    const term = moduleSearch.toLowerCase();
    return (
      (m.title && m.title.toLowerCase().includes(term)) ||
      (m.subject_name && m.subject_name.toLowerCase().includes(term)) ||
      (m.grade && m.grade.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 max-w-6xl pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden print:hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-200 border border-white/10">
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            <span>Lembar Kerja Peserta Didik (LKPD) Pembelajaran Mendalam</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            Rancang LKPD Interaktif Otentik dari Arsip Modul Ajar
          </h1>
          <p className="text-sm text-blue-100/90 leading-relaxed">
            Pilih materi dari modul ajar yang telah tersimpan di arsip, atur cakupan jumlah pertemuan belajar,
            lalu terbitkan LKPD lengkap dengan stimulus kontekstual, penyelidikan kelompok, tabel analisis data, dan rubrik penilaian.
          </p>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'create'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Buat LKPD Baru (Dari Modul)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('archive')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'archive'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          Arsip LKPD Tersimpan ({savedLkpds.length})
        </button>
      </div>

      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Module Selector & Configuration Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6 print:hidden">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                1. Pilih Modul Ajar dari Arsip
              </h2>
              <Link
                to="/dashboard/modul"
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                Buat Modul Ajar Baru →
              </Link>
            </div>

            {loadingModules ? (
              <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Memuat daftar modul tersimpan...
              </div>
            ) : savedModules.length === 0 ? (
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
                <p className="text-sm font-bold text-amber-900">Belum Ada Modul Ajar di Arsip</p>
                <p className="text-xs text-amber-700 max-w-lg mx-auto">
                  Anda belum memiliki modul ajar yang tersimpan di arsip. Silakan racik Modul Ajar terlebih dahulu di menu <strong>Modul Ajar Otomatis</strong>, lalu simpan agar dapat diturunkan menjadi LKPD.
                </p>
                <Link
                  to="/dashboard/modul"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  <Sparkles className="w-4 h-4" /> Buat Modul Ajar Sekarang
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search Filter */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={moduleSearch}
                    onChange={e => setModuleSearch(e.target.value)}
                    placeholder="Cari modul ajar berdasarkan judul materi atau mata pelajaran..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Module Cards Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                  {filteredModules.map(m => {
                    const isSelected = selectedModuleId === m.id;
                    const pCount = Array.isArray(m.content_json?.pertemuan) ? m.content_json.pertemuan.length : (m.pertemuan_count || 2);
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedModuleId(m.id)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer text-left space-y-1.5 ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                            : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 truncate">
                            {m.subject_name}
                          </span>
                          <span className="text-[10px] text-gray-500 shrink-0">
                            {pCount} Pertemuan
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-xs line-clamp-2 leading-snug">
                          {m.title}
                        </h4>
                        <p className="text-[11px] text-gray-500 truncate">
                          {m.grade} • {m.metode || 'Deep Learning'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Module Detail Banner */}
                {selectedModule && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Modul Terpilih:</p>
                      <h3 className="font-bold text-slate-900 text-sm">{selectedModule.title}</h3>
                      <p className="text-slate-600 mt-0.5">
                        Mata Pelajaran: <strong>{selectedModule.subject_name}</strong> • {selectedModule.grade} • Total: <strong>{meetingsInSelectedModule.length || selectedModule.pertemuan_count || 2} Pertemuan</strong>
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg shrink-0 self-start md:self-center">
                      Siap Diturunkan Menjadi LKPD
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 2. Pilihan Pertemuan pada LKPD */}
            {selectedModule && (
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  2. Pilihan Pertemuan pada LKPD
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Pilih Cakupan Pertemuan:
                    </label>
                    <select
                      value={selectedMeetingIndex}
                      onChange={e => setSelectedMeetingIndex(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs md:text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">
                        Semua Pertemuan (Paket Lengkap Pertemuan 1 s.d. {meetingsInSelectedModule.length || 2})
                      </option>
                      {meetingsInSelectedModule.map((p: any, idx: number) => (
                        <option key={idx} value={String(idx)}>
                          Pertemuan {idx + 1}: {p.nama || `Materi Pertemuan ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-gray-500 mt-1">
                      LKPD akan mengambil tujuan, langkah penyelidikan, dan studi kasus khusus sesuai pertemuan yang dipilih.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Judul Lembar Kerja Peserta Didik (LKPD):
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      placeholder="Contoh: LKPD Investigasi Konsep..."
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs md:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={generating}
                    onClick={handleGenerateLkpd}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
                  >
                    {generating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-amber-300" />
                    )}
                    <span>{generating ? 'Menyusun LKPD...' : 'Buat LKPD dari Modul'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* LKPD Document View Container */}
          {lkpdData && (
            <div className="space-y-4">
              {/* Document Action Bar */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold text-gray-800">
                    LKPD Siap Digunakan: <span className="text-blue-900">{lkpdData.identitas.judulLkpd}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      isEditing
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {isEditing ? 'Selesai Edit' : 'Edit Teks'}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak LKPD
                  </button>

                  <button
                    type="button"
                    disabled={exportingDocx}
                    onClick={handleExportDocx}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                  >
                    {exportingDocx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                    Download Word (.docx)
                  </button>

                  <button
                    type="button"
                    disabled={savingRecord}
                    onClick={handleSaveLkpdToDb}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                  >
                    {savingRecord ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {saveSuccess ? 'Tersimpan!' : 'Simpan ke Arsip'}
                  </button>
                </div>
              </div>

              {/* Formal Printable Document Layout */}
              <div
                id="printable-lkpd"
                className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 shadow-sm max-w-5xl mx-auto print:p-0 print:border-none print:shadow-none text-gray-900 font-serif leading-relaxed"
              >
                {/* 1. KOP SURAT RESMI */}
                <div className="text-center border-b-4 border-double border-gray-800 pb-4 mb-6">
                  <h3 className="text-xs md:text-sm font-bold tracking-wider text-gray-800 uppercase font-sans">
                    Pemerintah Daerah Provinsi Jawa Barat
                  </h3>
                  <h4 className="text-xs md:text-sm font-bold tracking-wider text-gray-800 uppercase font-sans">
                    Dinas Pendidikan • Cabang Dinas Pendidikan Wilayah XI
                  </h4>
                  <h2 className="text-xl md:text-2xl font-black tracking-wide text-blue-900 uppercase my-1 font-sans">
                    {lkpdData.identitas.namaSekolah || schoolSettings.nama_sekolah}
                  </h2>
                  <p className="text-xs text-gray-600 italic font-sans">
                    Alamat: {lkpdData.identitas.alamatSekolah || schoolSettings.alamat_sekolah} • NPSN: {lkpdData.identitas.npsn || schoolSettings.npsn}
                  </p>
                </div>

                {/* 2. JUDUL LKPD */}
                <div className="text-center mb-6">
                  <h1 className="text-lg md:text-xl font-bold uppercase text-gray-900 tracking-wide font-sans">
                    LEMBAR KERJA PESERTA DIDIK (LKPD)
                  </h1>
                  <h2 className="text-base md:text-lg font-bold text-blue-800 uppercase font-sans mt-0.5">
                    {lkpdData.identitas.judulLkpd}
                  </h2>
                  <p className="text-xs text-gray-600 font-sans mt-1">
                    Kurikulum Merdeka • Pembelajaran Mendalam (Deep Learning Framework)
                  </p>
                </div>

                {/* 3. TABEL IDENTITAS & KELOMPOK */}
                <div className="border border-gray-300 rounded-lg overflow-hidden text-xs md:text-sm font-sans mb-8">
                  <table className="w-full text-left border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="w-1/4 p-2.5 bg-gray-50 font-semibold text-gray-700 border-r border-gray-200">Mata Pelajaran</td>
                        <td className="w-1/4 p-2.5 font-bold text-gray-900 border-r border-gray-200">{lkpdData.identitas.mataPelajaran}</td>
                        <td className="w-1/4 p-2.5 bg-gray-50 font-semibold text-gray-700 border-r border-gray-200">Nama Kelompok</td>
                        <td className="w-1/4 p-2.5 font-medium text-gray-600">Kelompok: .......................................</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-2.5 bg-gray-50 font-semibold text-gray-700 border-r border-gray-200">Fase / Kelas</td>
                        <td className="p-2.5 font-medium border-r border-gray-200">{lkpdData.identitas.fase}</td>
                        <td className="p-2.5 bg-gray-50 font-semibold text-gray-700 border-r border-gray-200">Anggota 1 (Ketua)</td>
                        <td className="p-2.5 font-medium text-gray-600">1. .................................................</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-2.5 bg-gray-50 font-semibold text-gray-700 border-r border-gray-200">Alokasi Waktu</td>
                        <td className="p-2.5 font-medium border-r border-gray-200">{lkpdData.identitas.alokasiWaktu}</td>
                        <td className="p-2.5 bg-gray-50 font-semibold text-gray-700 border-r border-gray-200">Anggota 2</td>
                        <td className="p-2.5 font-medium text-gray-600">2. .................................................</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-2.5 bg-gray-50 font-semibold text-gray-700 border-r border-gray-200">Pertemuan Ke-</td>
                        <td className="p-2.5 font-bold text-blue-900 border-r border-gray-200">{lkpdData.identitas.pertemuanKe}</td>
                        <td className="p-2.5 bg-gray-50 font-semibold text-gray-700 border-r border-gray-200">Anggota 3</td>
                        <td className="p-2.5 font-medium text-gray-600">3. .................................................</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 bg-gray-50 font-semibold text-gray-700 border-r border-gray-200">Guru Pengampu</td>
                        <td className="p-2.5 font-bold text-gray-900 border-r border-gray-200">{lkpdData.identitas.namaGuru}</td>
                        <td className="p-2.5 bg-gray-50 font-semibold text-gray-700 border-r border-gray-200">Anggota 4 & 5</td>
                        <td className="p-2.5 font-medium text-gray-600">4. .................. 5. ..................</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. A. TUJUAN PEMBELAJARAN */}
                <div className="mb-6 space-y-2">
                  <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 font-sans text-gray-900">
                    A. Tujuan Pembelajaran
                  </h3>
                  <ul className="list-decimal pl-5 space-y-1 text-xs md:text-sm font-sans text-gray-800">
                    {lkpdData.tujuanPembelajaran.map((tp, idx) => (
                      <li key={idx} className="leading-relaxed">{tp}</li>
                    ))}
                  </ul>
                </div>

                {/* 5. B. PETUNJUK PENGERJAAN */}
                <div className="mb-6 space-y-2">
                  <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 font-sans text-gray-900">
                    B. Petunjuk Pengerjaan LKPD
                  </h3>
                  <ol className="list-decimal pl-5 space-y-1 text-xs md:text-sm font-sans text-gray-800">
                    {lkpdData.petunjukBelajar.map((ptk, idx) => (
                      <li key={idx} className="leading-relaxed">{ptk}</li>
                    ))}
                  </ol>
                </div>

                {/* 6. C. STIMULUS & ORIENTASI MASALAH NYATA */}
                {lkpdData.stimulusKontekstual && (
                  <div className="mb-6 space-y-2">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 font-sans text-gray-900">
                      C. Stimulus & Orientasi Masalah Nyata (Deep Learning)
                    </h3>
                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 text-xs md:text-sm font-sans space-y-2 text-gray-800">
                      <p className="font-bold text-blue-950">
                        {lkpdData.stimulusKontekstual.judul}
                      </p>
                      {isEditing ? (
                        <textarea
                          rows={4}
                          value={lkpdData.stimulusKontekstual.narasi}
                          onChange={e => setLkpdData({
                            ...lkpdData,
                            stimulusKontekstual: { ...lkpdData.stimulusKontekstual, narasi: e.target.value }
                          })}
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-sans"
                        />
                      ) : (
                        <p className="italic leading-relaxed">
                          "{lkpdData.stimulusKontekstual.narasi}"
                        </p>
                      )}
                      {lkpdData.stimulusKontekstual.pertanyaanAwal && (
                        <p className="font-semibold text-blue-900 pt-1">
                          Pertanyaan Pemantik: {lkpdData.stimulusKontekstual.pertanyaanAwal}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 7. D. LANGKAH INVESTIGASI & PENYELIDIKAN */}
                {lkpdData.langkahInvestigasi && lkpdData.langkahInvestigasi.length > 0 && (
                  <div className="mb-6 space-y-2">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 font-sans text-gray-900">
                      D. Langkah Investigasi & Penyelidikan Kolaboratif
                    </h3>
                    <div className="space-y-2 font-sans text-xs md:text-sm">
                      {lkpdData.langkahInvestigasi.map((lk, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-start gap-2.5">
                          <span className="font-bold text-blue-800 shrink-0">Langkah {lk.langkahKe}:</span>
                          <div className="flex-1">
                            {isEditing ? (
                              <textarea
                                rows={2}
                                value={lk.instruksi}
                                onChange={e => {
                                  const updated = [...lkpdData.langkahInvestigasi];
                                  updated[idx].instruksi = e.target.value;
                                  setLkpdData({ ...lkpdData, langkahInvestigasi: updated });
                                }}
                                className="w-full p-1.5 bg-white border border-gray-300 rounded text-xs"
                              />
                            ) : (
                              <p className="text-gray-800 leading-relaxed">{lk.instruksi}</p>
                            )}
                            {lk.fokusAktivitas && (
                              <span className="inline-block mt-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                Fokus: {lk.fokusAktivitas}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. E. LEMBAR PENGAMATAN & PENGUMPULAN DATA */}
                {lkpdData.tabelPengamatan && (
                  <div className="mb-6 space-y-2">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 font-sans text-gray-900">
                      E. Lembar Pengamatan & Pengumpulan Data
                    </h3>
                    <p className="text-xs font-sans text-gray-600 mb-1">
                      {lkpdData.tabelPengamatan.judulTabel}
                    </p>
                    <div className="border border-gray-300 rounded-lg overflow-hidden font-sans text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-800 text-white font-semibold">
                            {lkpdData.tabelPengamatan.kolom.map((col, cIdx) => (
                              <th key={cIdx} className="p-2.5 border-r border-slate-700 last:border-r-0">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(lkpdData.tabelPengamatan.barisContoh || [
                            ['1', 'Variabel 1', '................................', '................................', '................................'],
                            ['2', 'Variabel 2', '................................', '................................', '................................'],
                            ['3', 'Variabel 3', '................................', '................................', '................................']
                          ]).map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-gray-200 hover:bg-gray-50/50">
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="p-2.5 text-gray-800 border-r border-gray-200 last:border-r-0 align-top">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 9. F. PERTANYAAN DISKUSI & ANALISIS NALAR KRITIS */}
                {lkpdData.pertanyaanDiskusi && lkpdData.pertanyaanDiskusi.length > 0 && (
                  <div className="mb-6 space-y-2">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 font-sans text-gray-900">
                      F. Pertanyaan Diskusi & Analisis Nalar Kritis
                    </h3>
                    <div className="space-y-3 font-sans text-xs md:text-sm">
                      {lkpdData.pertanyaanDiskusi.map((q, idx) => (
                        <div key={idx} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                          <p className="font-bold text-gray-900">
                            {idx + 1}. {q}
                          </p>
                          <div className="pt-2 text-xs text-gray-400 space-y-1">
                            <p className="text-[11px] font-semibold text-gray-500">Lembar Jawaban Analisis:</p>
                            <div className="border-b border-dashed border-gray-300 h-6"></div>
                            <div className="border-b border-dashed border-gray-300 h-6"></div>
                            <div className="border-b border-dashed border-gray-300 h-6"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 10. G. KESIMPULAN & REFLEKSI MANDIRI */}
                {lkpdData.kesimpulanDanRefleksi && (
                  <div className="mb-6 space-y-2">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 font-sans text-gray-900">
                      G. Kesimpulan & Refleksi Belajar
                    </h3>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 font-sans text-xs md:text-sm space-y-3">
                      <div>
                        <p className="font-bold text-gray-900 mb-1">
                          Kesimpulan Bersama Kelompok:
                        </p>
                        <p className="text-xs text-gray-600 mb-2">
                          {lkpdData.kesimpulanDanRefleksi.panduanKesimpulan}
                        </p>
                        <div className="space-y-2">
                          <div className="border-b border-dashed border-gray-300 h-6"></div>
                          <div className="border-b border-dashed border-gray-300 h-6"></div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-200">
                        <p className="font-bold text-gray-900 mb-1">
                          Refleksi Diri (Mindful Learning):
                        </p>
                        {lkpdData.kesimpulanDanRefleksi.refleksiSiswa?.map((rf, idx) => (
                          <div key={idx} className="mb-2">
                            <p className="italic text-gray-700 text-xs mb-1">• {rf}</p>
                            <div className="border-b border-dashed border-gray-300 h-5"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 11. H. RUBRIK PENILAIAN LKPD */}
                {lkpdData.rubrikPenilaian && lkpdData.rubrikPenilaian.length > 0 && (
                  <div className="mb-8 space-y-2">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-blue-700 font-sans text-gray-900">
                      H. Rubrik Penilaian Kinerja LKPD
                    </h3>
                    <div className="border border-gray-300 rounded-lg overflow-hidden font-sans text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-800 text-white font-semibold">
                            <th className="p-2.5 w-1/4 border-r border-slate-700">Aspek Penilaian</th>
                            <th className="p-2.5 w-[18.75%] border-r border-slate-700">Sangat Baik (4)</th>
                            <th className="p-2.5 w-[18.75%] border-r border-slate-700">Baik (3)</th>
                            <th className="p-2.5 w-[18.75%] border-r border-slate-700">Cukup (2)</th>
                            <th className="p-2.5 w-[18.75%]">Perlu Bimbingan (1)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lkpdData.rubrikPenilaian.map((rb, idx) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50/50">
                              <td className="p-2.5 font-bold text-gray-900 bg-gray-50 border-r border-gray-200 align-top">
                                {rb.aspek}
                              </td>
                              <td className="p-2.5 text-gray-700 border-r border-gray-200 align-top">{rb.skor4}</td>
                              <td className="p-2.5 text-gray-700 border-r border-gray-200 align-top">{rb.skor3}</td>
                              <td className="p-2.5 text-gray-700 border-r border-gray-200 align-top">{rb.skor2}</td>
                              <td className="p-2.5 text-gray-700 align-top">{rb.skor1}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 12. KOLOM PENGESAHAN & TANDA TANGAN */}
                <div className="pt-6 font-sans text-xs md:text-sm">
                  <div className="grid grid-cols-2 gap-8 text-center">
                    <div>
                      <p className="text-gray-600 mb-1">Mengetahui / Memeriksa,</p>
                      <p className="font-bold text-gray-900">Guru Pengampu Mata Pelajaran</p>
                      <div className="h-20 flex items-center justify-center">
                        <span className="text-gray-300 text-xs italic">( Tanda Tangan Guru )</span>
                      </div>
                      <p className="font-bold underline text-gray-900">{lkpdData.identitas.namaGuru}</p>
                      <p className="text-xs text-gray-600">NIP. {lkpdData.identitas.nipGuru || '-'}</p>
                    </div>

                    <div>
                      <p className="text-gray-600 mb-1">Garut, {lkpdData.identitas.tanggal}</p>
                      <p className="font-bold text-gray-900">Ketua / Perwakilan Kelompok</p>
                      <div className="h-20 flex items-center justify-center">
                        <span className="text-gray-300 text-xs italic">( Tanda Tangan Siswa )</span>
                      </div>
                      <p className="font-bold text-gray-900">( .................................................... )</p>
                      <p className="text-xs text-gray-600">NISN: .................................................</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Arsip LKPD Tersimpan */}
      {activeTab === 'archive' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                Arsip LKPD Tersimpan
              </h2>
              <p className="text-xs text-gray-500">
                Daftar naskah LKPD yang pernah Anda buat dan simpan. Buka kembali untuk melihat, mencetak, atau mengunduh Word.
              </p>
            </div>
          </div>

          {loadingSavedLkpds ? (
            <div className="p-12 text-center text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Memuat arsip LKPD...
            </div>
          ) : savedLkpds.length === 0 ? (
            <div className="p-12 text-center text-gray-500 space-y-2">
              <ClipboardList className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold">Belum Ada LKPD Tersimpan</p>
              <p className="text-xs text-gray-400">
                Pilih modul dari tab "Buat LKPD Baru" lalu klik "Simpan ke Arsip".
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {savedLkpds.map(record => (
                <div
                  key={record.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 px-2 rounded-xl transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm">{record.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {record.subject_name || 'Mapel'}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {record.grade || 'Fase E'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {record.pertemuan_info || 'Pertemuan 1'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Disimpan pada: {new Date(record.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleLoadArchivedLkpd(record)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      title="Buka LKPD untuk dilihat atau dicetak"
                    >
                      <Eye className="w-3.5 h-3.5" /> Buka LKPD
                    </button>
                    <button
                      type="button"
                      onClick={() => exportLkpdToDocx(record.content_json)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      title="Download file Word (.docx)"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Word (.docx)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedLkpd(record.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                      title="Hapus dari arsip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
