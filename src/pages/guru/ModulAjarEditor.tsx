import React from 'react';
import {
  Save,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
  BookOpen,
  Sparkles,
  HelpCircle,
  FileText,
  RotateCcw
} from 'lucide-react';
import { getDetailedPendahuluan, getDetailedPenutup } from '../../lib/schoolSettings';

export const DELAPAN_DIMENSI_LULUSAN = [
  'Keimanan dan Ketakwaan terhadap Tuhan Yang Maha Esa: Mengamalkan nilai spiritual dan integritas dalam proses belajar',
  'Kewargaan: Memiliki kepedulian sosial, kebangsaan, dan kelestarian lingkungan',
  'Penalaran Kritis: Memproses informasi secara logis, analitis, dan memecahkan persoalan nyata',
  'Kreativitas: Menghasilkan gagasan inovatif dan solusi orisinal',
  'Kolaborasi: Bekerja sama secara sinergis, gotong royong, dan berbagi peran',
  'Kemandirian: Bertanggung jawab atas proses dan hasil belajar secara mandiri',
  'Kesehatan: Menjaga kebugaran jasmani dan kesejahteraan mental (well-being)',
  'Komunikasi: Mengartikulasikan pemikiran secara santun, terstruktur, dan dialogis'
];

interface ModulAjarEditorProps {
  result: any;
  onChange: (newResult: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function ModulAjarEditor({
  result,
  onChange,
  onSave,
  onCancel,
  isSaving
}: ModulAjarEditorProps) {
  if (!result) return null;

  // Helper deep update
  const updateField = (path: (string | number)[], value: any) => {
    const updated = JSON.parse(JSON.stringify(result));
    let current = updated;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!current[key]) current[key] = typeof path[i + 1] === 'number' ? [] : {};
      current = current[key];
    }
    current[path[path.length - 1]] = value;
    onChange(updated);
  };

  // Helper for arrays
  const updateArrayItem = (path: (string | number)[], index: number, value: any) => {
    const updated = JSON.parse(JSON.stringify(result));
    let current = updated;
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      if (!current[key]) current[key] = [];
      current = current[key];
    }
    current[index] = value;
    onChange(updated);
  };

  const addArrayItem = (path: (string | number)[], newItem: any) => {
    const updated = JSON.parse(JSON.stringify(result));
    let current = updated;
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      if (!current[key]) current[key] = [];
      current = current[key];
    }
    current.push(newItem);
    onChange(updated);
  };

  const removeArrayItem = (path: (string | number)[], index: number) => {
    const updated = JSON.parse(JSON.stringify(result));
    let current = updated;
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      if (!current[key]) return;
      current = current[key];
    }
    current.splice(index, 1);
    onChange(updated);
  };

  // Ensure 8 dimensions list exists
  const currentDimensi: string[] = (result.dimensiProfilLulusan && Array.isArray(result.dimensiProfilLulusan) && result.dimensiProfilLulusan.length > 0)
    ? result.dimensiProfilLulusan
    : (result.dimensiProfilPelajarPancasila && Array.isArray(result.dimensiProfilPelajarPancasila) && result.dimensiProfilPelajarPancasila.length > 0)
    ? result.dimensiProfilPelajarPancasila
    : DELAPAN_DIMENSI_LULUSAN;

  return (
    <div className="bg-white rounded-2xl border-2 border-amber-400 shadow-lg overflow-hidden">
      {/* Sticky Editor Header */}
      <div className="sticky top-0 z-20 bg-amber-500 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">
            ✎
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">Mode Edit Teks Modul Ajar Aktif</h3>
            <p className="text-xs text-amber-100">
              Ubah teks langsung pada kolom-kolom di bawah ini. Semua data tersinkronisasi otomatis.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Batal
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-5 py-2 bg-white hover:bg-amber-50 text-amber-900 rounded-xl text-xs font-black shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-amber-600" />
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan & Selesai'}
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8 text-gray-800">
        {/* 1. INFORMASI UMUM & IDENTITAS MODUL */}
        <section className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
          <h4 className="text-sm font-bold uppercase tracking-wider text-blue-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-700" />
            I. Informasi Umum & Identitas Modul
          </h4>
          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nama Satuan Pendidikan</label>
              <input
                type="text"
                value={result.identitas?.namaSekolah || ''}
                onChange={e => updateField(['identitas', 'namaSekolah'], e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">NPSN & Alamat Sekolah</label>
              <input
                type="text"
                value={result.identitas?.alamatSekolah || ''}
                onChange={e => updateField(['identitas', 'alamatSekolah'], e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nama Guru Pengampu</label>
              <input
                type="text"
                value={result.identitas?.namaGuru || ''}
                onChange={e => updateField(['identitas', 'namaGuru'], e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">NIP / ID Guru</label>
              <input
                type="text"
                value={result.identitas?.nipGuru || ''}
                onChange={e => updateField(['identitas', 'nipGuru'], e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Mata Pelajaran</label>
              <input
                type="text"
                value={result.identitas?.mataPelajaran || ''}
                onChange={e => updateField(['identitas', 'mataPelajaran'], e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Jenjang / Fase / Kelas</label>
              <input
                type="text"
                value={result.identitas?.fase || ''}
                onChange={e => updateField(['identitas', 'fase'], e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Alokasi Waktu</label>
              <input
                type="text"
                value={result.identitas?.alokasiWaktu || ''}
                onChange={e => updateField(['identitas', 'alokasiWaktu'], e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Model / Metode Pembelajaran</label>
              <input
                type="text"
                value={result.modelMetode?.nama || result.identitas?.metodeGabungan || ''}
                onChange={e => {
                  updateField(['modelMetode', 'nama'], e.target.value);
                  updateField(['identitas', 'metodeGabungan'], e.target.value);
                }}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* 2. CP & TP */}
        <section className="p-5 rounded-2xl border border-gray-200 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-700" />
            II. Capaian Pembelajaran & Tujuan Pembelajaran
          </h4>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">A. Capaian Pembelajaran (CP)</label>
            <textarea
              rows={4}
              value={result.capaianPembelajaran || ''}
              onChange={e => updateField(['capaianPembelajaran'], e.target.value)}
              className="w-full p-3 text-xs md:text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">B. Elemen / Domain Konten CP</label>
            <input
              type="text"
              value={result.elemenCp || ''}
              onChange={e => updateField(['elemenCp'], e.target.value)}
              className="w-full p-2.5 text-xs md:text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-800">
                C. Tujuan Pembelajaran (TP) Operasional
              </label>
              <button
                type="button"
                onClick={() => addArrayItem(['tujuanPembelajaran'], 'Peserta didik mampu ')}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah TP
              </button>
            </div>
            <div className="space-y-2">
              {(result.tujuanPembelajaran || []).map((tp: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-xs font-bold text-blue-800 mt-2.5 w-6 text-right flex-shrink-0">
                    {idx + 1}.
                  </span>
                  <textarea
                    rows={2}
                    value={tp}
                    onChange={e => updateArrayItem(['tujuanPembelajaran'], idx, e.target.value)}
                    className="flex-1 p-2 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem(['tujuanPembelajaran'], idx)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg mt-1"
                    title="Hapus TP"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. TIGA PILAR DEEP LEARNING */}
        <section className="p-5 rounded-2xl border border-gray-200 bg-purple-50/20 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-700" />
            D. Prinsip Pembelajaran Mendalam (Deep Learning Framework)
          </h4>
          <div className="grid md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
              <label className="font-bold text-purple-900 block mb-1">1. Mindful (Berkesadaran)</label>
              <textarea
                rows={4}
                value={result.prinsipPembelajaranMendalam?.mindful || ''}
                onChange={e => updateField(['prinsipPembelajaranMendalam', 'mindful'], e.target.value)}
                className="w-full p-2 bg-white border border-purple-300 rounded-lg outline-none text-xs"
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <label className="font-bold text-blue-900 block mb-1">2. Meaningful (Bermakna)</label>
              <textarea
                rows={4}
                value={result.prinsipPembelajaranMendalam?.meaningful || ''}
                onChange={e => updateField(['prinsipPembelajaranMendalam', 'meaningful'], e.target.value)}
                className="w-full p-2 bg-white border border-blue-300 rounded-lg outline-none text-xs"
              />
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <label className="font-bold text-amber-900 block mb-1">3. Joyful (Menyenangkan)</label>
              <textarea
                rows={4}
                value={result.prinsipPembelajaranMendalam?.joyful || ''}
                onChange={e => updateField(['prinsipPembelajaranMendalam', 'joyful'], e.target.value)}
                className="w-full p-2 bg-white border border-amber-300 rounded-lg outline-none text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">E. Pemahaman Bermakna (Enduring Understanding)</label>
            <textarea
              rows={2}
              value={result.pemahamanBermakna || ''}
              onChange={e => updateField(['pemahamanBermakna'], e.target.value)}
              className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-800">
                F. Pertanyaan Pemantik (Driving Questions)
              </label>
              <button
                type="button"
                onClick={() => addArrayItem(['pertanyaanPemantik'], 'Bagaimana kita dapat...?')}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Pertanyaan
              </button>
            </div>
            <div className="space-y-2">
              {(result.pertanyaanPemantik || []).map((q: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-5 text-right flex-shrink-0">•</span>
                  <input
                    type="text"
                    value={q}
                    onChange={e => updateArrayItem(['pertanyaanPemantik'], idx, e.target.value)}
                    className="flex-1 p-2 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem(['pertanyaanPemantik'], idx)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. DIMENSI PROFIL LULUSAN (8 DIMENSI) */}
        <section className="p-5 rounded-2xl border border-gray-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-blue-900">
                G. Dimensi Profil Lulusan (8 Dimensi Lulusan)
              </h4>
              <p className="text-xs text-gray-500">
                8 dimensi kelulusan peserta didik yang terintegrasi dalam modul ajar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateField(['dimensiProfilLulusan'], DELAPAN_DIMENSI_LULUSAN)}
              className="px-2.5 py-1 text-xs bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-semibold flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset ke 8 Standar
            </button>
          </div>

          <div className="space-y-2">
            {currentDimensi.map((dim: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-900 w-6 text-right flex-shrink-0">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  value={dim}
                  onChange={e => {
                    const next = [...currentDimensi];
                    next[idx] = e.target.value;
                    updateField(['dimensiProfilLulusan'], next);
                  }}
                  className="flex-1 p-2 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}
          </div>
        </section>

        {/* 5. RINCIAN KEGIATAN PER PERTEMUAN */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-blue-900">
                III. Rincian Kegiatan Pembelajaran per Pertemuan
              </h4>
              <p className="text-xs text-gray-500">
                Edit topik, alokasi waktu, sintaks inti pembelajaran aktif mendalam, dan penutup.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextNum = (result.pertemuan?.length || 0) + 1;
                addArrayItem(['pertemuan'], {
                  nomor: nextNum,
                  topik: `Materi Pertemuan ${nextNum}`,
                  alokasiWaktu: '2 x 45 Menit',
                  tujuanPertemuan: 'Pencapaian Indikator Kompetensi',
                  metode: result.modelMetode?.nama || 'Problem-Based Learning (PBL)',
                  kegiatanPendahuluan: {
                    durasi: '15 Menit',
                    langkah: [
                      'Apersepsi dan orientasi tujuan belajar',
                      'Pertanyaan pemantik dan ice breaking mindful'
                    ]
                  },
                  kegiatanInti: {
                    durasi: '60 Menit',
                    sintaks: [
                      {
                        tahap: 'Orientasi Masalah Kontekstual',
                        aktivitasGuru: 'Guru menyajikan masalah otentik terkait materi',
                        aktivitasSiswa: 'Peserta didik mengamati dan mengidentifikasi rumusan masalah',
                        fokusMendalam: 'Meaningful Learning'
                      }
                    ]
                  },
                  kegiatanPenutup: {
                    durasi: '15 Menit',
                    langkah: [
                      'Refleksi pembelajaran bersama peserta didik',
                      'Doa dan penyampaian rencana pertemuan berikutnya'
                    ]
                  }
                });
              }}
              className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Pertemuan
            </button>
          </div>

          {(result.pertemuan || []).map((ptm: any, pIdx: number) => (
            <div key={pIdx} className="border-2 border-blue-200 rounded-2xl p-5 bg-white shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-200">
                <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-lg text-xs font-black">
                  Pertemuan Ke-{ptm.nomor || pIdx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeArrayItem(['pertemuan'], pIdx)}
                  className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Pertemuan Ini
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Topik Pertemuan</label>
                  <input
                    type="text"
                    value={ptm.topik || ''}
                    onChange={e => updateField(['pertemuan', pIdx, 'topik'], e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Alokasi Waktu</label>
                  <input
                    type="text"
                    value={ptm.alokasiWaktu || ''}
                    onChange={e => updateField(['pertemuan', pIdx, 'alokasiWaktu'], e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Metode Pertemuan Ini</label>
                  <input
                    type="text"
                    value={ptm.metode || ''}
                    onChange={e => updateField(['pertemuan', pIdx, 'metode'], e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-xl text-blue-800 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 text-xs mb-1">Target / Tujuan Khusus Pertemuan</label>
                <input
                  type="text"
                  value={ptm.tujuanPertemuan || ''}
                  onChange={e => updateField(['pertemuan', pIdx, 'tujuanPertemuan'], e.target.value)}
                  className="w-full p-2 text-xs bg-white border border-gray-300 rounded-xl"
                />
              </div>

              {/* Pendahuluan */}
              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">
                    1. Kegiatan Pendahuluan (Durasi: {ptm.kegiatanPendahuluan?.durasi || '15 Menit'})
                  </span>
                  <button
                    type="button"
                    onClick={() => addArrayItem(['pertemuan', pIdx, 'kegiatanPendahuluan', 'langkah'], 'Guru memfasilitasi...')}
                    className="text-xs text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Langkah
                  </button>
                </div>
                {getDetailedPendahuluan(ptm.kegiatanPendahuluan?.langkah).map((step: string, sIdx: number) => (
                  <div key={sIdx} className="flex items-center gap-2">
                    <span className="text-xs text-amber-700 font-bold">•</span>
                    <input
                      type="text"
                      value={step}
                      onChange={e => updateArrayItem(['pertemuan', pIdx, 'kegiatanPendahuluan', 'langkah'], sIdx, e.target.value)}
                      className="flex-1 p-1.5 text-xs bg-white border border-amber-300 rounded-lg outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem(['pertemuan', pIdx, 'kegiatanPendahuluan', 'langkah'], sIdx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Kegiatan Inti (Tabel Sintaks) */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">
                    2. Kegiatan Inti Sintaks ({ptm.kegiatanInti?.durasi || '60 Menit'}) — {ptm.metode || 'Metode Pembelajaran'}
                  </span>
                  <button
                    type="button"
                    onClick={() => addArrayItem(['pertemuan', pIdx, 'kegiatanInti', 'sintaks'], {
                      tahap: 'Tahap Sintaks',
                      aktivitasGuru: 'Aktivitas fasilitasi guru',
                      aktivitasSiswa: 'Aktivitas eksplorasi aktif peserta didik',
                      fokusMendalam: 'Deep Learning'
                    })}
                    className="px-2.5 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Baris Sintaks
                  </button>
                </div>

                <div className="space-y-3">
                  {(ptm.kegiatanInti?.sintaks || []).map((stx: any, stxIdx: number) => (
                    <div key={stxIdx} className="p-3 bg-white border border-blue-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="font-bold text-blue-900 w-16 flex-shrink-0">Tahap {stxIdx + 1}:</span>
                          <input
                            type="text"
                            value={stx.tahap || ''}
                            onChange={e => updateField(['pertemuan', pIdx, 'kegiatanInti', 'sintaks', stxIdx, 'tahap'], e.target.value)}
                            className="flex-1 p-1.5 border border-blue-300 rounded-lg font-bold text-blue-900"
                            placeholder="Nama Tahap Sintaks"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeArrayItem(['pertemuan', pIdx, 'kegiatanInti', 'sintaks'], stxIdx)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Hapus baris ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Aktivitas Guru</label>
                          <textarea
                            rows={3}
                            value={stx.aktivitasGuru || ''}
                            onChange={e => updateField(['pertemuan', pIdx, 'kegiatanInti', 'sintaks', stxIdx, 'aktivitasGuru'], e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Aktivitas Siswa</label>
                          <textarea
                            rows={3}
                            value={stx.aktivitasSiswa || ''}
                            onChange={e => updateField(['pertemuan', pIdx, 'kegiatanInti', 'sintaks', stxIdx, 'aktivitasSiswa'], e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Fokus Pembelajaran Mendalam</label>
                        <input
                          type="text"
                          value={stx.fokusMendalam || ''}
                          onChange={e => updateField(['pertemuan', pIdx, 'kegiatanInti', 'sintaks', stxIdx, 'fokusMendalam'], e.target.value)}
                          className="w-full p-1.5 border border-gray-300 rounded-lg text-xs text-indigo-800 font-medium"
                          placeholder="Contoh: Mindful Reflection / Meaningful Inquiry"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Penutup */}
              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">
                    3. Kegiatan Penutup (Durasi: {ptm.kegiatanPenutup?.durasi || '15 Menit'})
                  </span>
                  <button
                    type="button"
                    onClick={() => addArrayItem(['pertemuan', pIdx, 'kegiatanPenutup', 'langkah'], 'Guru dan siswa...')}
                    className="text-xs text-emerald-800 hover:text-emerald-900 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Langkah
                  </button>
                </div>
                {getDetailedPenutup(ptm.kegiatanPenutup?.langkah).map((step: string, sIdx: number) => (
                  <div key={sIdx} className="flex items-center gap-2">
                    <span className="text-xs text-emerald-700 font-bold">•</span>
                    <input
                      type="text"
                      value={step}
                      onChange={e => updateArrayItem(['pertemuan', pIdx, 'kegiatanPenutup', 'langkah'], sIdx, e.target.value)}
                      className="flex-1 p-1.5 text-xs bg-white border border-emerald-300 rounded-lg outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem(['pertemuan', pIdx, 'kegiatanPenutup', 'langkah'], sIdx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* 6. ASESMEN & RUBRIK PENILAIAN */}
        <section className="p-5 rounded-2xl border border-gray-200 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-blue-900">
            IV. Asesmen & Rubrik Penilaian
          </h4>

          <div className="grid md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <span className="font-bold text-gray-900 block">1. Asesmen Diagnostik</span>
              <div>
                <label className="text-[11px] text-gray-500">Teknik:</label>
                <input
                  type="text"
                  value={result.asesmen?.diagnostik?.teknik || ''}
                  onChange={e => updateField(['asesmen', 'diagnostik', 'teknik'], e.target.value)}
                  className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500">Instrumen:</label>
                <input
                  type="text"
                  value={result.asesmen?.diagnostik?.instrumen || ''}
                  onChange={e => updateField(['asesmen', 'diagnostik', 'instrumen'], e.target.value)}
                  className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <span className="font-bold text-gray-900 block">2. Asesmen Formatif</span>
              <div>
                <label className="text-[11px] text-gray-500">Teknik:</label>
                <input
                  type="text"
                  value={result.asesmen?.formatif?.teknik || ''}
                  onChange={e => updateField(['asesmen', 'formatif', 'teknik'], e.target.value)}
                  className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500">Instrumen:</label>
                <input
                  type="text"
                  value={result.asesmen?.formatif?.instrumen || ''}
                  onChange={e => updateField(['asesmen', 'formatif', 'instrumen'], e.target.value)}
                  className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <span className="font-bold text-gray-900 block">3. Asesmen Sumatif</span>
              <div>
                <label className="text-[11px] text-gray-500">Teknik:</label>
                <input
                  type="text"
                  value={result.asesmen?.sumatif?.teknik || ''}
                  onChange={e => updateField(['asesmen', 'sumatif', 'teknik'], e.target.value)}
                  className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500">Instrumen:</label>
                <input
                  type="text"
                  value={result.asesmen?.sumatif?.instrumen || ''}
                  onChange={e => updateField(['asesmen', 'sumatif', 'instrumen'], e.target.value)}
                  className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Rubrik Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-800">
                Tabel Rubrik Penilaian Ketercapaian
              </label>
              <button
                type="button"
                onClick={() => addArrayItem(['asesmen', 'rubrik'], {
                  aspek: 'Aspek Baru',
                  sangatMahir: 'Deskripsi kriteria sangat mahir',
                  mahir: 'Deskripsi kriteria mahir',
                  berkembang: 'Deskripsi kriteria berkembang',
                  perluBimbingan: 'Deskripsi kriteria perlu bimbingan'
                })}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Aspek Rubrik
              </button>
            </div>

            <div className="space-y-3">
              {(result.asesmen?.rubrik || []).map((rb: any, rIdx: number) => (
                <div key={rIdx} className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">Aspek {rIdx + 1}:</span>
                    <input
                      type="text"
                      value={rb.aspek || ''}
                      onChange={e => updateField(['asesmen', 'rubrik', rIdx, 'aspek'], e.target.value)}
                      className="flex-1 p-1.5 font-bold border border-slate-300 rounded-lg bg-white"
                      placeholder="Nama Aspek"
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem(['asesmen', 'rubrik'], rIdx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-emerald-700">Sangat Mahir (86-100)</label>
                      <textarea
                        rows={2}
                        value={rb.sangatMahir || ''}
                        onChange={e => updateField(['asesmen', 'rubrik', rIdx, 'sangatMahir'], e.target.value)}
                        className="w-full p-1.5 border border-gray-300 rounded bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-blue-700">Mahir (71-85)</label>
                      <textarea
                        rows={2}
                        value={rb.mahir || ''}
                        onChange={e => updateField(['asesmen', 'rubrik', rIdx, 'mahir'], e.target.value)}
                        className="w-full p-1.5 border border-gray-300 rounded bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-amber-700">Berkembang (56-70)</label>
                      <textarea
                        rows={2}
                        value={rb.berkembang || ''}
                        onChange={e => updateField(['asesmen', 'rubrik', rIdx, 'berkembang'], e.target.value)}
                        className="w-full p-1.5 border border-gray-300 rounded bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-rose-700">Perlu Bimbingan (&lt;56)</label>
                      <textarea
                        rows={2}
                        value={rb.perluBimbingan || ''}
                        onChange={e => updateField(['asesmen', 'rubrik', rIdx, 'perluBimbingan'], e.target.value)}
                        className="w-full p-1.5 border border-gray-300 rounded bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. PENGAYAAN, REMEDIAL, REFLEKSI */}
        <section className="p-5 rounded-2xl border border-gray-200 grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-gray-800 mb-1">V. Pengayaan</label>
            <textarea
              rows={3}
              value={result.pengayaanRemedial?.pengayaan || ''}
              onChange={e => updateField(['pengayaanRemedial', 'pengayaan'], e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-800 mb-1">V. Remedial</label>
            <textarea
              rows={3}
              value={result.pengayaanRemedial?.remedial || ''}
              onChange={e => updateField(['pengayaanRemedial', 'remedial'], e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-xl"
            />
          </div>
        </section>

        {/* 8. LEMBAR PENGESAHAN & TITIMANGSA */}
        <section className="p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/30 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-700" />
            Titimangsa & Lembar Pengesahan Modul Ajar
          </h4>
          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-800 mb-1">
                Titimangsa Tanda Tangan Guru (Disesuaikan dengan Tanggal Cetak)
              </label>
              <input
                type="text"
                value={result.titimangsa || ''}
                onChange={e => updateField(['titimangsa'], e.target.value)}
                placeholder="Contoh: Garut, 15 Juli 2026"
                className="w-full p-2.5 bg-white border border-indigo-300 rounded-xl font-bold text-indigo-950"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Teks ini akan dicetak tepat di atas 'Guru Mata Pelajaran,' pada akhir dokumen modul.
              </p>
            </div>
            <div>
              <label className="block font-bold text-gray-800 mb-1">Nama Kepala Sekolah</label>
              <input
                type="text"
                value={result.identitas?.namaKepsek || ''}
                onChange={e => updateField(['identitas', 'namaKepsek'], e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-800 mb-1">NIP Kepala Sekolah</label>
              <input
                type="text"
                value={result.identitas?.nipKepsek || ''}
                onChange={e => updateField(['identitas', 'nipKepsek'], e.target.value)}
                placeholder="Contoh: 19700101 199501 1 001"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono text-sm"
              />
            </div>
          </div>
        </section>

        {/* Bottom Action Buttons */}
        <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Menyimpan ke Database...' : 'Simpan & Selesai Edit Teks'}
          </button>
        </div>
      </div>
    </div>
  );
}
