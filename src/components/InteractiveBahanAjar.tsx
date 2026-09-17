import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Compass,
  Trophy,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  ArrowRight,
  Flame,
  Award,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Target,
  Zap,
} from 'lucide-react';

interface CabangKonsep {
  id?: string;
  nama: string;
  deskripsi?: string;
  kataKunci?: string[];
  warna?: string;
}

interface PetaKonsepData {
  topikUtama?: string;
  ringkasan?: string;
  cabang?: CabangKonsep[];
}

interface TantanganItem {
  level?: number;
  judul: string;
  instruksi?: string;
  tekaTeki?: string;
  aksiSiswa?: string;
  xp?: number;
}

interface GamifikasiData {
  judulMisi?: string;
  skenario?: string;
  totalXp?: number;
  badgeReward?: {
    nama: string;
    icon?: string;
    deskripsi?: string;
  };
  tantanganAktif?: TantanganItem[];
  skenarioDebatKelas?: string;
}

interface InteractiveBahanAjarProps {
  petaKonsep?: PetaKonsepData;
  gamifikasi?: GamifikasiData;
  mindMapFallback?: string[];
  topicTitle: string;
  pertemuanMateri?: any[];
  isTeacherView?: boolean;
}

export default function InteractiveBahanAjar({
  petaKonsep,
  gamifikasi,
  mindMapFallback = [],
  topicTitle,
  pertemuanMateri = [],
  isTeacherView = false,
}: InteractiveBahanAjarProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'peta' | 'gamifikasi' | 'debat'>('all');
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);

  // Student XP & Completed Missions State
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [studentDebateStance, setStudentDebateStance] = useState<'A' | 'B' | null>(null);
  const [debateVotes, setDebateVotes] = useState({ A: 14, B: 18 });

  // Normalize Peta Konsep
  const effectivePetaKonsep: PetaKonsepData = React.useMemo(() => {
    if (petaKonsep && Array.isArray(petaKonsep.cabang) && petaKonsep.cabang.length > 0) {
      return petaKonsep;
    }
    // Auto-generate branches from fallback array if not present
    const sourceArr =
      mindMapFallback.length > 0
        ? mindMapFallback
        : [
            'Konsep Dasar & Definisi',
            'Prinsip Kerja & Mekanisme',
            'Penerapan Nyata & Masa Depan',
          ];

    const colors = ['blue', 'emerald', 'purple', 'amber', 'rose'];
    const generatedCabang: CabangKonsep[] = sourceArr.map((item, idx) => ({
      id: `cabang-${idx}`,
      nama: item,
      deskripsi: `Eksplorasi dan pemahaman mendalam tentang konsep ${item} untuk membangun fondasi berpikir kritis.`,
      kataKunci: [item, 'Pemahaman Inti', 'Aplikasi Kontekstual'],
      warna: colors[idx % colors.length],
    }));

    return {
      topikUtama: topicTitle,
      ringkasan: `Peta konsep terstruktur materi ${topicTitle} yang menghubungkan prinsip dasar, implementasi, dan analisis kritis.`,
      cabang: generatedCabang,
    };
  }, [petaKonsep, mindMapFallback, topicTitle]);

  // Normalize Gamifikasi Data
  const effectiveGamifikasi: GamifikasiData = React.useMemo(() => {
    if (gamifikasi && Array.isArray(gamifikasi.tantanganAktif) && gamifikasi.tantanganAktif.length > 0) {
      return gamifikasi;
    }

    // Check if there is gamifikasi in pertemuanMateri
    const firstP = pertemuanMateri?.[0]?.gamifikasi;
    if (firstP) {
      return {
        judulMisi: firstP.misiSiswa || `Misi Detektif Eksplorasi: ${topicTitle}`,
        skenario:
          firstP.instruksiMisi ||
          `Selamat datang di petualangan pembelajaran aktif! Hari ini kalian adalah tim peneliti khusus yang bertugas memecahkan studi kasus ${topicTitle}.`,
        totalXp: 150,
        badgeReward: {
          nama: firstP.badgeName || 'Master Penjelajah Konsep',
          icon: firstP.badgeIcon || '🎯',
          deskripsi: 'Penghargaan atas keaktifan eksplorasi, kolaborasi, dan ketuntasan misi.',
        },
        tantanganAktif: [
          {
            level: 1,
            judul: 'Tantangan 1: Observasi Detektif',
            instruksi: firstP.instruksiMisi || 'Amati fenomena kunci dan temukan fakta tersembunyi.',
            tekaTeki: firstP.tantanganAktif || 'Apa hubungan fenomena ini dengan kehidupan sehari-hari siswa?',
            aksiSiswa: 'Diskusikan 3 bukti nyata dalam kelompok kecil selama 3 menit.',
            xp: 50,
          },
          {
            level: 2,
            judul: 'Tantangan 2: Pecahkan Studi Kasus',
            instruksi: 'Analisis sebab-akibat dan rumuskan argumen logis.',
            tekaTeki: 'Jika terjadi perubahan variabel utama, apa dampak langsung yang timbul?',
            aksiSiswa: 'Tuliskan hipotesis solusi terbaik di papan kerja tim.',
            xp: 50,
          },
          {
            level: 3,
            judul: 'Tantangan 3: Kreasi Solusi Cepat',
            instruksi: 'Presentasikan hasil ide kreatif dalam bentuk analogi menarik.',
            tekaTeki: 'Bagaimana menjelaskan konsep ini kepada orang awam dalam 60 detik?',
            aksiSiswa: 'Presentasi kilat 1 menit perwakilan tim di depan kelas.',
            xp: 50,
          },
        ],
        skenarioDebatKelas:
          pertemuanMateri?.[0]?.skenarioDiskusi ||
          `Apakah penerapan konsep ${topicTitle} lebih menguntungkan dilakukan secara individual atau kolaboratif dalam menghadapi era digital?`,
      };
    }

    // Default rich fallback
    return {
      judulMisi: `Misi Petualangan Siswa: Misteri ${topicTitle}`,
      skenario: `Kalian adalah agen penyelidik sains dan teknologi SMAN 21 Garut yang ditugaskan mengungkap rahasia di balik ${topicTitle}.`,
      totalXp: 150,
      badgeReward: {
        nama: 'Gelar Master Penjelajah',
        icon: '🏆',
        deskripsi: 'Diberikan kepada siswa yang berhasil menuntaskan seluruh tantangan eksplorasi aktif.',
      },
      tantanganAktif: [
        {
          level: 1,
          judul: 'Tantangan 1: Observasi Detektif',
          instruksi: 'Telusuri fenomena awal dan temukan minimal 2 petunjuk penting.',
          tekaTeki: 'Mengapa konsep ini menjadi sangat penting dalam kehidupan modern?',
          aksiSiswa: 'Catat 2 contoh konkret di sekitar lingkungan sekolah atau rumah.',
          xp: 50,
        },
        {
          level: 2,
          judul: 'Tantangan 2: Uji Eksperimen & Logika',
          instruksi: 'Uji pemahamanmu dengan menghubungkan sebab dan akibat.',
          tekaTeki: 'Tantangan apa yang paling sering dihadapi saat menerapkan prinsip ini?',
          aksiSiswa: 'Rancang 1 solusi inovatif untuk mengatasi hambatan tersebut bersama kelompok.',
          xp: 50,
        },
        {
          level: 3,
          judul: 'Tantangan 3: Kreasi Solusi Cerdas',
          instruksi: 'Simpulkan intisari materi dengan bahasa kreatifmu sendiri.',
          tekaTeki: 'Bagaimana konsep ini akan berkembang dalam 5 tahun ke depan?',
          aksiSiswa: 'Sampaikan 1 kesimpulan berani di forum diskusi kelas.',
          xp: 50,
        },
      ],
      skenarioDebatKelas: `Menurut kelompok Anda, manakah yang lebih penting dalam menguasai ${topicTitle}: Pemahaman teoretis yang sangat mendalam atau Keberanian mencoba langsung lewat uji coba nyata?`,
    };
  }, [gamifikasi, pertemuanMateri, topicTitle]);

  const totalPossibleXp =
    effectiveGamifikasi.tantanganAktif?.reduce((acc, curr) => acc + (curr.xp || 50), 0) || 150;

  const currentEarnedXp = completedLevels.reduce((acc, lvlIdx) => {
    const item = effectiveGamifikasi.tantanganAktif?.[lvlIdx];
    return acc + (item?.xp || 50);
  }, 0);

  const isAllQuestsCompleted =
    effectiveGamifikasi.tantanganAktif &&
    effectiveGamifikasi.tantanganAktif.length > 0 &&
    completedLevels.length === effectiveGamifikasi.tantanganAktif.length;

  const toggleLevelComplete = (idx: number) => {
    setCompletedLevels((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleVoteDebate = (stance: 'A' | 'B') => {
    if (studentDebateStance === stance) return;
    setDebateVotes((prev) => {
      const next = { ...prev };
      if (studentDebateStance) next[studentDebateStance] = Math.max(0, next[studentDebateStance] - 1);
      next[stance] += 1;
      return next;
    });
    setStudentDebateStance(stance);
  };

  const totalDebateVotes = debateVotes.A + debateVotes.B;
  const pctA = Math.round((debateVotes.A / totalDebateVotes) * 100);
  const pctB = 100 - pctA;

  return (
    <div className="space-y-6">
      {/* Interactive Navigation Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-100 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-white text-indigo-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Semua Fitur Interaktif
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('peta')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'peta'
                ? 'bg-white text-indigo-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            🗺️ Peta Konsep Interaktif
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gamifikasi')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'gamifikasi'
                ? 'bg-white text-indigo-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            🎮 Arena Gamifikasi & Misi Siswa
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('debat')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'debat'
                ? 'bg-white text-indigo-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            💬 Arena Debat & Diskusi Vokal
          </button>
        </div>

        {/* Live Student XP Counter Badge */}
        <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl text-xs font-extrabold text-amber-900">
          <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
          <span>
            XP Siswa: <strong className="text-orange-600">{currentEarnedXp}</strong> / {totalPossibleXp}
          </span>
          {isAllQuestsCompleted && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[10px] font-black">
              LENGKAP!
            </span>
          )}
        </div>
      </div>

      {/* SECTION 1: PETA KONSEP VISUAL INTERAKTIF */}
      {(activeTab === 'all' || activeTab === 'peta') && (
        <div className="bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-100/80">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                <Layers className="w-3 h-3 text-blue-600" />
                Struktur Pemikiran & Peta Konsep
              </div>
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                Peta Konsep Visual Interaktif: {effectivePetaKonsep.topikUtama || topicTitle}
              </h3>
              <p className="text-xs text-gray-600 max-w-2xl leading-relaxed">
                {effectivePetaKonsep.ringkasan}
              </p>
            </div>

            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200 self-start sm:self-auto">
              Klik cabang konsep untuk eksplorasi detail
            </span>
          </div>

          {/* Central Topic Node */}
          <div className="flex flex-col items-center justify-center pt-2">
            <div className="relative group p-4 bg-white border-2 border-indigo-500 rounded-2xl shadow-md text-center max-w-md w-full transition transform hover:-translate-y-0.5">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-black tracking-wider uppercase shadow-sm">
                Konsep Inti Sentral
              </div>
              <h4 className="text-base font-black text-indigo-950 mt-1">
                {effectivePetaKonsep.topikUtama || topicTitle}
              </h4>
              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                Pusat integrasi pemahaman materi. Cabang di bawah memperdalam alur konsep secara holistik.
              </p>
            </div>
            {/* Visual connecting branch stem */}
            <div className="w-0.5 h-6 bg-indigo-300"></div>
          </div>

          {/* Branch Concept Cards (Visual Tree / Bento) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {effectivePetaKonsep.cabang?.map((cabang, cIdx) => {
              const isSelected = selectedBranch === cIdx;
              const colorSchemes: Record<string, { bg: string; border: string; text: string; badge: string; accent: string }> = {
                blue: { bg: 'bg-blue-50/60 hover:bg-blue-50', border: 'border-blue-200', text: 'text-blue-950', badge: 'bg-blue-100 text-blue-800', accent: 'text-blue-600' },
                emerald: { bg: 'bg-emerald-50/60 hover:bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-950', badge: 'bg-emerald-100 text-emerald-800', accent: 'text-emerald-600' },
                purple: { bg: 'bg-purple-50/60 hover:bg-purple-50', border: 'border-purple-200', text: 'text-purple-950', badge: 'bg-purple-100 text-purple-800', accent: 'text-purple-600' },
                amber: { bg: 'bg-amber-50/60 hover:bg-amber-50', border: 'border-amber-200', text: 'text-amber-950', badge: 'bg-amber-100 text-amber-800', accent: 'text-amber-600' },
                rose: { bg: 'bg-rose-50/60 hover:bg-rose-50', border: 'border-rose-200', text: 'text-rose-950', badge: 'bg-rose-100 text-rose-800', accent: 'text-rose-600' },
              };

              const theme = colorSchemes[cabang.warna || 'blue'] || colorSchemes.blue;

              return (
                <div
                  key={cIdx}
                  onClick={() => setSelectedBranch(isSelected ? null : cIdx)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected ? 'ring-2 ring-indigo-500 shadow-md bg-white border-indigo-400' : `${theme.bg} ${theme.border}`
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${theme.badge}`}>
                        Cabang {cIdx + 1}
                      </span>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 transition"
                      >
                        {isSelected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    <h4 className={`text-sm font-bold ${theme.text} leading-snug`}>
                      {cabang.nama}
                    </h4>

                    {cabang.deskripsi && (
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {cabang.deskripsi}
                      </p>
                    )}
                  </div>

                  {/* Keywords Tag Chips */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Kata Kunci Konsep:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cabang.kataKunci?.map((kw, kIdx) => (
                        <span
                          key={kIdx}
                          className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-[11px] font-semibold text-gray-700 shadow-2xs"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: ARENA GAMIFIKASI & MISI AKTIF SISWA */}
      {(activeTab === 'all' || activeTab === 'gamifikasi') && (
        <div className="bg-gradient-to-br from-amber-50/50 via-white to-orange-50/40 p-6 rounded-3xl border border-amber-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-200/80">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                <Trophy className="w-3 h-3 text-amber-600" />
                Gamifikasi Edukatif & Pembelajaran Aktif
              </div>
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                🎮 {effectiveGamifikasi.judulMisi || 'Misi Eksplorasi Siswa Aktif'}
              </h3>
              <p className="text-xs text-gray-600 max-w-2xl leading-relaxed">
                {effectiveGamifikasi.skenario}
              </p>
            </div>

            {/* Badge Trophy Preview */}
            {effectiveGamifikasi.badgeReward && (
              <div
                className={`p-3 rounded-2xl border flex items-center gap-3 self-start sm:self-auto transition-all ${
                  isAllQuestsCompleted
                    ? 'bg-amber-100 border-amber-300 shadow-sm scale-105'
                    : 'bg-white border-amber-200'
                }`}
              >
                <span className="text-3xl filter drop-shadow">
                  {effectiveGamifikasi.badgeReward.icon || '🏆'}
                </span>
                <div>
                  <div className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                    {isAllQuestsCompleted ? '🎉 Badge Terbuka!' : 'Target Badge Reward'}
                  </div>
                  <div className="text-xs font-black text-gray-900">
                    {effectiveGamifikasi.badgeReward.nama}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {isAllQuestsCompleted ? 'Selamat! Seluruh misi tuntas.' : effectiveGamifikasi.badgeReward.deskripsi}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* XP Progress Bar */}
          <div className="p-4 bg-white rounded-2xl border border-amber-200 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-gray-800">
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-amber-500" />
                Progres Petualangan Siswa
              </span>
              <span className="text-amber-900">
                {completedLevels.length} dari {effectiveGamifikasi.tantanganAktif?.length || 3} Tantangan Diselesaikan ({Math.round((currentEarnedXp / totalPossibleXp) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
              <div
                className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((currentEarnedXp / totalPossibleXp) * 100))}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Interactive Quest Challenges */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-orange-600" />
              Rangkaian Tantangan & Misi Aktif Siswa:
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {effectiveGamifikasi.tantanganAktif?.map((quest, qIdx) => {
                const isCompleted = completedLevels.includes(qIdx);

                return (
                  <div
                    key={qIdx}
                    className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-4 ${
                      isCompleted
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
                        : 'bg-white border-amber-200 hover:border-amber-300 text-gray-900 shadow-2xs'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                            isCompleted
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          Level {qIdx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-orange-100 text-orange-800 flex items-center gap-0.5">
                          +{quest.xp || 50} XP
                        </span>
                      </div>

                      <h5 className="text-sm font-bold leading-snug">
                        {quest.judul}
                      </h5>

                      {quest.instruksi && (
                        <p className="text-xs text-gray-600 leading-relaxed">
                          <strong>Petunjuk:</strong> {quest.instruksi}
                        </p>
                      )}

                      {quest.tekaTeki && (
                        <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs text-amber-950 space-y-1">
                          <span className="font-bold flex items-center gap-1 text-[11px] text-amber-800">
                            <HelpCircle className="w-3.5 h-3.5" /> Teka-Teki Pemantik:
                          </span>
                          <p className="italic">{quest.tekaTeki}</p>
                        </div>
                      )}

                      {quest.aksiSiswa && (
                        <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200/80 text-xs text-indigo-950 space-y-1">
                          <span className="font-bold flex items-center gap-1 text-[11px] text-indigo-800">
                            <Zap className="w-3.5 h-3.5 text-indigo-600" /> Aksi Siswa (Aktif):
                          </span>
                          <p className="font-medium">{quest.aksiSiswa}</p>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleLevelComplete(qIdx)}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isCompleted
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Misi Selesai (+{quest.xp || 50} XP Diraih)
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" /> Tandai Selesai & Klaim XP
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: ARENA DEBAT & DISKUSI VOKAL KELAS */}
      {(activeTab === 'all' || activeTab === 'debat') && effectiveGamifikasi.skenarioDebatKelas && (
        <div className="bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/50 p-6 rounded-3xl border border-emerald-200 shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
              <MessageSquare className="w-3 h-3 text-emerald-600" />
              Skenario Debat & Diskusi Pemantik Kelas
            </div>
            <h3 className="text-base font-black text-gray-900">
              💬 Dilema Interaktif: Memantik Suara & Partisipasi Aktif Siswa
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Gunakan topik dilema ini untuk membagi kelas menjadi dua kubu diskusi aktif agar semua siswa terdorong berbicara dan menyampaikan argumen kritisnya.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border-2 border-emerald-200 shadow-xs space-y-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-bold leading-relaxed">
              "{effectiveGamifikasi.skenarioDebatKelas}"
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-700 flex justify-between items-center">
                <span>Polling Stance / Pilihan Posisi Siswa:</span>
                <span className="text-[11px] text-gray-500">Total {totalDebateVotes} suara di kelas</span>
              </div>

              {/* Vote percentage bar */}
              <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex border border-slate-200">
                <div
                  className="bg-blue-600 text-[10px] font-bold text-white flex items-center justify-center transition-all duration-300"
                  style={{ width: `${pctA}%` }}
                >
                  {pctA}%
                </div>
                <div
                  className="bg-emerald-600 text-[10px] font-bold text-white flex items-center justify-center transition-all duration-300"
                  style={{ width: `${pctB}%` }}
                >
                  {pctB}%
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleVoteDebate('A')}
                  className={`p-3 rounded-xl border-2 text-xs text-left transition flex items-center justify-between ${
                    studentDebateStance === 'A'
                      ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold ring-2 ring-blue-300'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <span className="font-extrabold text-blue-700">Kubu A (Stance 1)</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">Mendukung perspektif pertama / fokus prinsip dasar</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-900 rounded-lg text-xs font-bold">
                    {debateVotes.A} Suara
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleVoteDebate('B')}
                  className={`p-3 rounded-xl border-2 text-xs text-left transition flex items-center justify-between ${
                    studentDebateStance === 'B'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-300'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <span className="font-extrabold text-emerald-700">Kubu B (Stance 2)</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">Mendukung perspektif kedua / eksperimen aplikatif</p>
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold">
                    {debateVotes.B} Suara
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
