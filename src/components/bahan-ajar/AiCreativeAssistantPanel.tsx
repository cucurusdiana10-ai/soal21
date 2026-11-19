import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  BookOpen,
  Lightbulb,
  MessageSquarePlus,
  Users,
  ClipboardCheck,
  MonitorPlay,
  ImagePlus,
  Send,
  Loader2,
  PlusCircle,
  Check,
  SlidersHorizontal
} from 'lucide-react';
import { runMaterialCreativeAssistantApi, formatAiErrorMessage } from '../../lib/aiService';
import type {
  CreativeAssistantActionId,
  CreativeAssistantResponse,
  StudentDifficultyLevel
} from '../../types/bahanAjar';

interface AiCreativeAssistantPanelProps {
  subject: string;
  grade: string;
  topic: string;
  tingkatKesulitan: StudentDifficultyLevel;
  onTingkatKesulitanChange: (level: StudentDifficultyLevel) => void;
  tujuanPembelajaran?: string[];
  currentMaterial: any;
  onInsertAddition: (addition: {
    id: string;
    jenis: string;
    judul: string;
    konten: string;
    dibuatPada: string;
  }) => void;
}

const QUICK_ACTIONS: Array<{
  id: CreativeAssistantActionId;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'kembangkan_menarik',
    label: 'Kembangkan Lebih Menarik',
    desc: 'Perkaya narasi agar memikat minat siswa',
    icon: Sparkles
  },
  {
    id: 'sederhanakan',
    label: 'Sederhanakan Bahasa',
    desc: 'Sesuaikan kedalaman dengan level siswa',
    icon: BookOpen
  },
  {
    id: 'contoh_kontekstual',
    label: 'Contoh Kontekstual',
    desc: 'Kasus nyata dekat dengan keseharian siswa',
    icon: Wand2
  },
  {
    id: 'buat_analogi',
    label: 'Buat Analogi Sederhana',
    desc: 'Perumpamaan visual agar cepat paham',
    icon: Lightbulb
  },
  {
    id: 'ilustrasi_pendukung',
    label: 'Ilustrasi Pendukung',
    desc: 'Konsep visual & skema penjelasan',
    icon: ImagePlus
  },
  {
    id: 'pertanyaan_pemantik',
    label: 'Pertanyaan Pemantik',
    desc: 'Pertanyaan kritis pembuka diskusi',
    icon: MessageSquarePlus
  },
  {
    id: 'aktivitas_kolaboratif',
    label: 'Aktivitas Kolaboratif',
    desc: 'Skema kerja kelompok aktif di kelas',
    icon: Users
  },
  {
    id: 'latihan_evaluasi',
    label: 'Latihan & Evaluasi',
    desc: 'Butir latihan formatif + kunci ringkas',
    icon: ClipboardCheck
  },
  {
    id: 'rekomendasi_media',
    label: 'Rekomendasi Media',
    desc: 'Alat peraga, simulasi, atau video rujukan',
    icon: MonitorPlay
  }
];

function buildMaterialSummary(mat: any, topic: string): string {
  if (!mat) return `Topik: ${topic}`;
  const parts: string[] = [];
  if (mat.topik) parts.push(`Topik: ${mat.topik}`);
  if (Array.isArray(mat.selectedFormats) && mat.selectedFormats.length > 0) {
    parts.push(`Format terpilih: ${mat.selectedFormats.join(', ')}`);
  }
  if (Array.isArray(mat.slideInteraktif) && mat.slideInteraktif.length > 0) {
    parts.push(
      `Slide (${mat.slideInteraktif.length}): ${mat.slideInteraktif
        .slice(0, 4)
        .map((s: any) => s.judul)
        .join('; ')}`
    );
  }
  if (mat.modulDigital?.bagianMateri) {
    parts.push(
      `Modul Digital: ${mat.modulDigital.bagianMateri.map((b: any) => b.judul).join('; ')}`
    );
  }
  if (mat.petaKonsep?.cabangMateri) {
    parts.push(
      `Peta Konsep: ${mat.petaKonsep.cabangMateri.map((c: any) => c.nama).join('; ')}`
    );
  }
  if (mat.infografis?.judul) {
    parts.push(`Infografis: ${mat.infografis.judul}`);
  }
  if (mat.simulasiPraktik?.judulSimulasi) {
    parts.push(`Simulasi: ${mat.simulasiPraktik.judulSimulasi}`);
  }
  if (mat.podcastAudio?.judulEpisode) {
    parts.push(`Podcast: ${mat.podcastAudio.judulEpisode}`);
  }
  if (Array.isArray(mat.materials) && mat.materials.length > 0) {
    parts.push(`Materi: ${mat.materials.map((m: any) => m.title).join('; ')}`);
  }
  return parts.join('\n').slice(0, 1500) || `Topik: ${topic}`;
}

function formatResponseForInsert(res: CreativeAssistantResponse): string {
  const sections: string[] = [];
  if (res.ringkasanSaran) {
    sections.push(res.ringkasanSaran);
  }
  if (res.kontenUtama) {
    sections.push(res.kontenUtama);
  }
  if (Array.isArray(res.poinImplementasi) && res.poinImplementasi.length > 0) {
    sections.push(
      'Poin Penerapan:\n' + res.poinImplementasi.map((p, idx) => `${idx + 1}. ${p}`).join('\n')
    );
  }
  if (Array.isArray(res.pertanyaanAtauSoal) && res.pertanyaanAtauSoal.length > 0) {
    const qText = res.pertanyaanAtauSoal
      .map((q, idx) => {
        const opts = Array.isArray(q.opsi) && q.opsi.length > 0 ? '\n   ' + q.opsi.join(' | ') : '';
        const ans = q.kunciAtauPanduan ? `\n   Panduan/Kunci: ${q.kunciAtauPanduan}` : '';
        return `${idx + 1}. ${q.pertanyaan}${opts}${ans}`;
      })
      .join('\n');
    sections.push('Pertanyaan / Latihan:\n' + qText);
  }
  if (Array.isArray(res.rekomendasiMedia) && res.rekomendasiMedia.length > 0) {
    const mediaText = res.rekomendasiMedia
      .map(
        (m, idx) =>
          `${idx + 1}. ${m.namaMedia} (${m.jenis}) — ${m.alasanKecocokan}. Cara pakai: ${m.caraPenggunaan}`
      )
      .join('\n');
    sections.push('Rekomendasi Media Pembelajaran:\n' + mediaText);
  }
  return sections.join('\n\n');
}

export default function AiCreativeAssistantPanel({
  subject,
  grade,
  topic,
  tingkatKesulitan,
  onTingkatKesulitanChange,
  tujuanPembelajaran,
  currentMaterial,
  onInsertAddition
}: AiCreativeAssistantPanelProps) {
  const [loadingAction, setLoadingAction] = useState<CreativeAssistantActionId | null>(null);
  const [customInstruction, setCustomInstruction] = useState('');
  const [draftResult, setDraftResult] = useState<CreativeAssistantResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [insertedSuccess, setInsertedSuccess] = useState(false);

  const handleRunAction = async (actionId: CreativeAssistantActionId) => {
    if (actionId === 'instruksi_bebas' && !customInstruction.trim()) {
      setErrorMsg('Tuliskan instruksi atau kebutuhan pengayaan Anda terlebih dahulu.');
      return;
    }

    setLoadingAction(actionId);
    setErrorMsg('');
    setInsertedSuccess(false);

    try {
      const summary = buildMaterialSummary(currentMaterial, topic);
      const response = await runMaterialCreativeAssistantApi({
        actionId,
        customInstruction: actionId === 'instruksi_bebas' ? customInstruction.trim() : undefined,
        subject: subject || 'Mata Pelajaran',
        grade: grade || 'X',
        topic: topic || 'Topik Pembelajaran',
        tingkatKesulitan,
        currentMaterialSummary: summary,
        tujuanPembelajaran
      });
      setDraftResult(response);
    } catch (err: any) {
      setErrorMsg(formatAiErrorMessage(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInsert = () => {
    if (!draftResult) return;
    const formattedContent = formatResponseForInsert(draftResult);
    onInsertAddition({
      id: `ca-${Date.now()}`,
      jenis: draftResult.jenisAksi || 'asistensi_ai',
      judul: draftResult.judulTambahan || 'Pengayaan Bahan Ajar',
      konten: formattedContent,
      dibuatPada: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    });
    setInsertedSuccess(true);
  };

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/70 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>AI Creative Assistant</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Perkaya bahan ajar sesuai kemampuan, bahasa, dan jenjang siswa Kelas {grade || '-'}.
            </p>
          </div>
        </div>

        {/* Difficulty / Adaptation Selector */}
        <div className="pt-2 border-t border-slate-200/80">
          <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            Penyesuaian Tingkat Kemampuan Siswa
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'dasar', label: 'Dasar / Mudah' },
                { id: 'reguler', label: 'Reguler' },
                { id: 'pengayaan', label: 'Pengayaan HOTS' }
              ] as const
            ).map(lvl => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => onTingkatKesulitanChange(lvl.id)}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition ${
                  tingkatKesulitan === lvl.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Capabilities Grid */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Bantuan Kreatif Instan
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5">
            {QUICK_ACTIONS.map(act => {
              const Icon = act.icon;
              const isRunning = loadingAction === act.id;
              return (
                <button
                  key={act.id}
                  type="button"
                  disabled={loadingAction !== null}
                  onClick={() => handleRunAction(act.id)}
                  className="text-left p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50/50 hover:border-blue-300 transition flex items-start gap-2.5 disabled:opacity-60"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    {isRunning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 leading-tight">{act.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{act.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Instruction */}
        <div className="pt-3 border-t border-slate-200 space-y-2">
          <label className="block text-[11px] font-semibold text-slate-700">
            Atau Minta Bantuan Spesifik Anda
          </label>
          <textarea
            rows={2}
            value={customInstruction}
            onChange={e => setCustomInstruction(e.target.value)}
            placeholder="Contoh: Buatkan skenario roleplay 10 menit atau analogi bertema olahraga untuk konsep ini..."
            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-xs text-slate-800"
          />
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={() => handleRunAction('instruksi_bebas')}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {loadingAction === 'instruksi_bebas' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Kirim ke AI Creative Assistant
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            {errorMsg}
          </div>
        )}

        {/* Draft Output Card */}
        {draftResult && (
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-blue-700 capitalize">
                  {(draftResult.jenisAksi || '').replace(/_/g, ' ')}
                </p>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                  {draftResult.judulTambahan}
                </h4>
              </div>
            </div>

            {draftResult.penyesuaianJenjang && (
              <p className="text-[11px] text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                Penyesuaian: {draftResult.penyesuaianJenjang}
              </p>
            )}

            {draftResult.ringkasanSaran && (
              <p className="text-xs font-medium text-slate-700">{draftResult.ringkasanSaran}</p>
            )}

            {draftResult.kontenUtama && (
              <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                {draftResult.kontenUtama}
              </div>
            )}

            {Array.isArray(draftResult.poinImplementasi) && draftResult.poinImplementasi.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-800">Langkah Implementasi:</p>
                <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                  {draftResult.poinImplementasi.map((pt, idx) => (
                    <li key={idx}>{pt}</li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(draftResult.pertanyaanAtauSoal) &&
              draftResult.pertanyaanAtauSoal.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-800">Butir Pertanyaan / Latihan:</p>
                  {draftResult.pertanyaanAtauSoal.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1"
                    >
                      <p className="font-semibold text-slate-900">
                        {idx + 1}. {q.pertanyaan}
                      </p>
                      {Array.isArray(q.opsi) && q.opsi.length > 0 && (
                        <p className="text-slate-600 text-[11px]">{q.opsi.join(' · ')}</p>
                      )}
                      {q.kunciAtauPanduan && (
                        <p className="text-emerald-700 text-[11px] font-medium">
                          Panduan: {q.kunciAtauPanduan}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

            {Array.isArray(draftResult.rekomendasiMedia) && draftResult.rekomendasiMedia.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-800">Rekomendasi Media:</p>
                {draftResult.rekomendasiMedia.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-0.5"
                  >
                    <p className="font-semibold text-slate-900">
                      {m.namaMedia} · <span className="text-blue-700">{m.jenis}</span>
                    </p>
                    <p className="text-slate-600 text-[11px]">{m.alasanKecocokan}</p>
                    <p className="text-slate-500 text-[11px]">Pakai: {m.caraPenggunaan}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleInsert}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                insertedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {insertedSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Berhasil Disisipkan ke Bahan Ajar
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" /> Sisipkan ke Bahan Ajar
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
