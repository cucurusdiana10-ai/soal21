import React, { useState, useEffect, useRef } from 'react';
import {
  Presentation,
  Film,
  Trophy,
  Network,
  BarChart3,
  BookOpen,
  FlaskConical,
  Globe,
  Headphones,
  Wand2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Sparkles,
  Play,
  Pause,
  Square,
  Volume2,
  HelpCircle,
  Zap,
  Award,
  Layers,
  Clock,
  Sliders,
  Compass,
  Lightbulb,
  Check,
  AlertTriangle,
  RotateCcw,
  Eye
} from 'lucide-react';
import {
  BAHAN_AJAR_FORMATS,
  BahanAjarFormatId,
  MultiFormatBahanAjarContent
} from '../../types/bahanAjar';
import MediaViewer from '../MediaViewer';
import InteractiveBahanAjar from '../InteractiveBahanAjar';

interface BahanAjarViewerProps {
  content: any;
  title?: string;
  subject?: string;
  isTeacherView?: boolean;
  isFullscreen?: boolean;
  onVideoUrlChange?: (url: string) => void;
}

const FORMAT_ICON_MAP: Record<BahanAjarFormatId, React.ComponentType<{ className?: string }>> = {
  slide_interaktif: Presentation,
  video_pembelajaran: Film,
  gamifikasi: Trophy,
  peta_konsep: Network,
  infografis: BarChart3,
  modul_digital: BookOpen,
  simulasi_praktik: FlaskConical,
  web_pembelajaran: Globe,
  podcast_audio: Headphones,
  custom_format: Wand2
};

export default function BahanAjarViewer({
  content,
  title = 'Bahan Ajar',
  subject = '',
  isTeacherView = false,
  isFullscreen = false,
  onVideoUrlChange
}: BahanAjarViewerProps) {
  // Determine if this is v2 multi-format content
  const isV2 = Boolean(
    content &&
      (content.version === 2 ||
        content.slideInteraktif ||
        content.videoPembelajaran ||
        content.infografis ||
        content.modulDigital ||
        content.simulasiPraktik ||
        content.webPembelajaran ||
        content.podcastAudio ||
        content.customFormat ||
        content.petaKonsep?.cabangMateri ||
        content.gamifikasi?.tantanganBerlevel)
  );

  // Determine available formats in this content
  const availableFormats: BahanAjarFormatId[] = React.useMemo(() => {
    if (!content) return [];
    if (Array.isArray(content.selectedFormats) && content.selectedFormats.length > 0) {
      return content.selectedFormats;
    }
    const detected: BahanAjarFormatId[] = [];
    if (content.slideInteraktif) detected.push('slide_interaktif');
    if (content.videoPembelajaran) detected.push('video_pembelajaran');
    if (content.gamifikasi) detected.push('gamifikasi');
    if (content.petaKonsep) detected.push('peta_konsep');
    if (content.infografis) detected.push('infografis');
    if (content.modulDigital) detected.push('modul_digital');
    if (content.simulasiPraktik) detected.push('simulasi_praktik');
    if (content.webPembelajaran) detected.push('web_pembelajaran');
    if (content.podcastAudio) detected.push('podcast_audio');
    if (content.customFormat) detected.push('custom_format');
    return detected;
  }, [content]);

  const [activeFormat, setActiveFormat] = useState<BahanAjarFormatId | 'ALL'>(() =>
    availableFormats.length === 1 ? availableFormats[0] : 'ALL'
  );

  useEffect(() => {
    if (availableFormats.length === 1) {
      setActiveFormat(availableFormats[0]);
    } else if (availableFormats.length > 1) {
      setActiveFormat('ALL');
    }
  }, [availableFormats.join(',')]);

  // Legacy Quiz state
  const [legacyQuizAnswers, setLegacyQuizAnswers] = useState<Record<number, string>>({});

  if (!content) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm bg-slate-50 rounded-xl border border-slate-200">
        Konten bahan ajar tidak tersedia.
      </div>
    );
  }

  // Fallback for legacy v1 materials
  if (!isV2) {
    return (
      <div className="space-y-6">
        <MediaViewer
          imageUrl={content.imageUrl}
          videoUrl={content.videoUrl}
          mediaType={content.mediaType || 'both'}
          title={title}
          subject={subject}
        />

        <InteractiveBahanAjar
          petaKonsep={content.petaKonsep}
          gamifikasi={content.gamifikasi}
          mindMapFallback={content.mindMap}
          topicTitle={title}
          pertemuanMateri={content.pertemuanMateri}
          isTeacherView={isTeacherView}
        />

        {content.funFact && (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-amber-900 text-sm">Tahukah Kamu?</h5>
              <p className="text-amber-800 text-xs mt-1 leading-relaxed">{content.funFact}</p>
            </div>
          </div>
        )}

        {content.realWorldApplication && (
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-3">
            <Compass className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-emerald-900 text-sm">Penerapan di Dunia Nyata</h5>
              <p className="text-emerald-800 text-xs mt-1 leading-relaxed">{content.realWorldApplication}</p>
            </div>
          </div>
        )}

        {Array.isArray(content.materials) && content.materials.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2 text-sm">Pembahasan Materi</h4>
            {content.materials.map((m: any, idx: number) => (
              <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h5 className="font-bold text-slate-900 mb-2">{m.title}</h5>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{m.content}</p>
              </div>
            ))}
          </div>
        )}

        {Array.isArray(content.interactiveQuestions) && content.interactiveQuestions.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2 text-sm flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" /> Kuis Pemantik
            </h4>
            {content.interactiveQuestions.map((q: any, idx: number) => {
              const answered = legacyQuizAnswers[idx];
              const isCorrect = answered && (answered === q.answer || answered === q.answer?.[0]);
              return (
                <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                  <p className="font-semibold text-slate-900 text-sm">{idx + 1}. {q.question}</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {q.options?.map((opt: string, oIdx: number) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      const isSelected = answered === letter || answered === opt;
                      const isOptionCorrect = letter === q.answer || opt === q.answer;
                      let btnStyle = 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50';
                      if (answered) {
                        if (isSelected && isOptionCorrect) btnStyle = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold';
                        else if (isSelected && !isOptionCorrect) btnStyle = 'bg-red-100 border-red-400 text-red-900 font-bold';
                        else if (isOptionCorrect) btnStyle = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold';
                      }
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => setLegacyQuizAnswers(prev => ({ ...prev, [idx]: letter }))}
                          className={`p-3 border rounded-xl text-xs font-medium text-left transition flex items-center justify-between ${btnStyle}`}
                        >
                          <span><strong>{letter}.</strong> {opt}</span>
                          {answered && isOptionCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  {answered && q.explanation && (
                    <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                      <strong>{isCorrect ? 'Tepat:' : `Kunci (${q.answer}):`}</strong> {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const v2 = content as MultiFormatBahanAjarContent;
  const shouldShow = (fmt: BahanAjarFormatId) => activeFormat === 'ALL' || activeFormat === fmt;

  return (
    <div className="space-y-6">
      {/* Header Metadata Strip (Zero-pill clean editorial typography) */}
      <div className={`pb-4 border-b ${isFullscreen ? 'border-slate-700 text-slate-200' : 'border-slate-200 text-slate-600'} space-y-2`}>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
          <span className={`font-semibold ${isFullscreen ? 'text-sky-300' : 'text-blue-700'}`}>
            {v2.mataPelajaran || subject || 'Mata Pelajaran'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{v2.jenjangKelas || 'SMA'}</span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">Level {v2.tingkatKesulitan || 'reguler'}</span>
          {v2.sumberModulJudul && (
            <>
              <span aria-hidden="true">·</span>
              <span>Acuan: {v2.sumberModulJudul}</span>
            </>
          )}
        </div>

        {Array.isArray(v2.tujuanPembelajaran) && v2.tujuanPembelajaran.length > 0 && (
          <div className={`p-3.5 rounded-xl border text-xs ${isFullscreen ? 'bg-slate-900/70 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            <p className={`font-semibold mb-1.5 ${isFullscreen ? 'text-white' : 'text-slate-900'}`}>
              Tujuan Pembelajaran Acuan Modul Ajar:
            </p>
            <ul className="space-y-1 list-decimal list-inside">
              {v2.tujuanPembelajaran.map((tp, idx) => (
                <li key={idx} className="leading-relaxed">{tp}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Format Switcher Tabs (Only when teacher chose 2+ formats) */}
      {availableFormats.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveFormat('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
              activeFormat === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tampilkan Semua ({availableFormats.length} Format)
          </button>
          {availableFormats.map(fmtId => {
            const meta = BAHAN_AJAR_FORMATS.find(f => f.id === fmtId);
            const Icon = FORMAT_ICON_MAP[fmtId] || BookOpen;
            return (
              <button
                key={fmtId}
                type="button"
                onClick={() => setActiveFormat(fmtId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeFormat === fmtId
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {meta?.label || fmtId}
              </button>
            );
          })}
        </div>
      )}

      {/* VIDEO PEMBELAJARAN PENDUKUNG (Ketika format video/web tidak dipilih secara khusus) */}
      {!availableFormats.includes('video_pembelajaran') &&
        !availableFormats.includes('web_pembelajaran') &&
        (v2.videoUrl || (Array.isArray(v2.suggestedVideos) && v2.suggestedVideos.length > 0)) && (
          <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
                <Film className="w-4 h-4" />
                <span>Video Pembelajaran Pendukung Materi</span>
              </div>
              <span className="text-xs text-slate-300 truncate max-w-md">
                {v2.videoTitle || v2.topik || title}
              </span>
            </div>
            <div className="p-5">
              <MediaViewer
                videoUrl={v2.videoUrl}
                videoTitle={v2.videoTitle}
                videoChannel={v2.videoChannel}
                suggestedVideos={v2.suggestedVideos}
                mediaType="video"
                title={v2.topik || title}
                subject={v2.mataPelajaran || subject}
                onVideoUrlChange={onVideoUrlChange}
              />
            </div>
          </section>
        )}

      {/* 1. SLIDE INTERAKTIF */}
      {shouldShow('slide_interaktif') && Array.isArray(v2.slideInteraktif) && v2.slideInteraktif.length > 0 && (
        <SlideInteraktifRenderer slides={v2.slideInteraktif} topic={v2.topik || title} />
      )}

      {/* 2. VIDEO PEMBELAJARAN */}
      {shouldShow('video_pembelajaran') && v2.videoPembelajaran && (
        <VideoPembelajaranRenderer
          videoData={v2.videoPembelajaran}
          videoUrl={v2.videoUrl}
          videoTitle={v2.videoTitle}
          videoChannel={v2.videoChannel}
          suggestedVideos={v2.suggestedVideos}
          subject={v2.mataPelajaran || subject}
          topic={v2.topik || title}
          onVideoUrlChange={onVideoUrlChange}
        />
      )}

      {/* 3. GAMIFIKASI */}
      {shouldShow('gamifikasi') && v2.gamifikasi && (
        <GamifikasiRenderer data={v2.gamifikasi} isTeacherView={isTeacherView} />
      )}

      {/* 4. PETA KONSEP */}
      {shouldShow('peta_konsep') && v2.petaKonsep && (
        <PetaKonsepRenderer data={v2.petaKonsep} topic={v2.topik || title} />
      )}

      {/* 5. INFOGRAFIS */}
      {shouldShow('infografis') && v2.infografis && (
        <InfografisRenderer data={v2.infografis} />
      )}

      {/* 6. MODUL DIGITAL */}
      {shouldShow('modul_digital') && v2.modulDigital && (
        <ModulDigitalRenderer data={v2.modulDigital} />
      )}

      {/* 7. SIMULASI & PRAKTIK INTERAKTIF */}
      {shouldShow('simulasi_praktik') && v2.simulasiPraktik && (
        <SimulasiPraktikRenderer data={v2.simulasiPraktik} />
      )}

      {/* 8. WEB PEMBELAJARAN INTERAKTIF */}
      {shouldShow('web_pembelajaran') && v2.webPembelajaran && (
        <WebPembelajaranRenderer
          data={v2.webPembelajaran}
          videoUrl={v2.videoUrl}
          videoTitle={v2.videoTitle}
          videoChannel={v2.videoChannel}
          suggestedVideos={v2.suggestedVideos}
          imageUrl={v2.imageUrl}
          topic={v2.topik || title}
          subject={v2.mataPelajaran || subject}
          onVideoUrlChange={onVideoUrlChange}
        />
      )}

      {/* 9. PODCAST & AUDIO PEMBELAJARAN */}
      {shouldShow('podcast_audio') && v2.podcastAudio && (
        <PodcastAudioRenderer data={v2.podcastAudio} />
      )}

      {/* 10. FORMAT BEBAS (CUSTOM) */}
      {shouldShow('custom_format') && v2.customFormat && (
        <CustomFormatRenderer data={v2.customFormat} />
      )}

      {/* LATIHAN SOAL MANDIRI TAMBAHAN (Bila dipilih guru di luar Modul Digital) */}
      {Array.isArray(v2.latihanSoalTambahan) && v2.latihanSoalTambahan.length > 0 && (
        <LatihanSoalMandiriSection exercises={v2.latihanSoalTambahan} />
      )}

      {/* CREATIVE ASSISTANT ADDITIONS */}
      {Array.isArray(v2.creativeAdditions) && v2.creativeAdditions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Pengayaan & Asistensi Tambahan Guru ({v2.creativeAdditions.length})
          </h4>
          <div className="grid gap-4">
            {v2.creativeAdditions.map(add => (
              <div key={add.id} className="p-5 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-blue-700 capitalize">{add.jenis.replace(/_/g, ' ')}</span>
                  <span>{add.dibuatPada}</span>
                </div>
                <h5 className="font-bold text-slate-900 text-sm">{add.judul}</h5>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{add.konten}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 1. SLIDE INTERAKTIF RENDERER
 * ============================================================================ */
function SlideInteraktifRenderer({ slides, topic }: { slides: any[]; topic: string }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const slide = slides[currentIdx] || slides[0];
  if (!slide) return null;

  const goTo = (idx: number) => {
    const safe = Math.max(0, Math.min(slides.length - 1, idx));
    setPopupOpen(false);
    setCurrentIdx(safe);
    setAnimKey(k => k + 1);
  };

  const transitionClass =
    slide.transisi === 'zoom'
      ? 'transition-transform duration-200'
      : slide.transisi === 'slide'
      ? 'transition-all duration-200'
      : 'transition-opacity duration-200';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* Header Toolbar */}
      <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Presentation className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-300">Slide Interaktif</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-xs font-bold truncate max-w-xs">{topic}</span>
        </div>

        <div className="flex items-center gap-3 text-xs tabular-nums">
          <span className="text-slate-400">
            Slide <strong className="text-white">{currentIdx + 1}</strong> / {slides.length}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-sky-300 capitalize">Transisi: {slide.transisi || 'fade'}</span>
        </div>
      </div>

      {/* Main Slide Stage */}
      <div key={animKey} className={`p-6 md:p-10 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 min-h-[340px] flex flex-col justify-between ${transitionClass}`}>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-blue-700">
              Slide {slide.nomor || currentIdx + 1} · {slide.layout || 'Presentasi'}
            </p>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
              {slide.judul}
            </h3>
            {slide.subjudul && (
              <p className="text-sm text-slate-600 max-w-2xl">{slide.subjudul}</p>
            )}
          </div>

          <div className={`grid gap-6 ${slide.ilustrasiDeskripsi || (slide.infografisMini && slide.infografisMini.length > 0) ? 'lg:grid-cols-12' : ''}`}>
            <div className={slide.ilustrasiDeskripsi || (slide.infografisMini && slide.infografisMini.length > 0) ? 'lg:col-span-7 space-y-4' : 'space-y-4'}>
              {Array.isArray(slide.poinUtama) && slide.poinUtama.length > 0 && (
                <ul className="space-y-2.5">
                  {slide.poinUtama.map((poin: string, pIdx: number) => (
                    <li key={pIdx} className="flex items-start gap-3 text-sm text-slate-800 bg-white p-3.5 rounded-xl border border-slate-200">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {pIdx + 1}
                      </span>
                      <span className="leading-relaxed">{poin}</span>
                    </li>
                  ))}
                </ul>
              )}

              {slide.narasiRingkas && (
                <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  <span className="font-semibold text-slate-900 block mb-1">Catatan Narasi Penyaji:</span>
                  {slide.narasiRingkas}
                </div>
              )}
            </div>

            {(slide.ilustrasiDeskripsi || (slide.infografisMini && slide.infografisMini.length > 0)) && (
              <div className="lg:col-span-5 space-y-4">
                {Array.isArray(slide.infografisMini) && slide.infografisMini.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                    {slide.infografisMini.map((info: any, iIdx: number) => (
                      <div key={iIdx} className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
                        <p className="text-xs text-slate-500 font-medium">{info.label}</p>
                        <p className="text-lg font-bold text-blue-700 tabular-nums">{info.nilai}</p>
                        {info.keterangan && <p className="text-xs text-slate-600">{info.keterangan}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {slide.ilustrasiDeskripsi && (
                  <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
                      <Layers className="w-4 h-4" /> Konsep Visual & Ilustrasi Slide
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{slide.ilustrasiDeskripsi}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Button inside Slide */}
          {slide.tombolInteraktif && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setPopupOpen(!popupOpen)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 shadow-xs"
              >
                <Zap className="w-4 h-4" />
                {slide.tombolInteraktif.labelTombol || 'Eksplorasi Interaktif'}
              </button>

              {popupOpen && (
                <div className="mt-3 p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-sm font-bold text-blue-950">{slide.tombolInteraktif.judulRespon}</h5>
                    <button
                      type="button"
                      onClick={() => setPopupOpen(false)}
                      className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      Tutup
                    </button>
                  </div>
                  <p className="text-xs text-blue-900 leading-relaxed whitespace-pre-line">
                    {slide.tombolInteraktif.isiRespon}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => goTo(currentIdx - 1)}
            disabled={currentIdx === 0}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-40 transition flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" /> Sebelumnya
          </button>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {slides.map((_, sIdx) => (
              <button
                key={sIdx}
                type="button"
                onClick={() => goTo(sIdx)}
                className={`w-7 h-7 rounded-lg text-xs font-bold tabular-nums transition ${
                  sIdx === currentIdx
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sIdx + 1}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(currentIdx + 1)}
            disabled={currentIdx === slides.length - 1}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-40 transition flex items-center gap-1.5"
          >
            Berikutnya <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * 2. VIDEO PEMBELAJARAN (SCRIPT, STORYBOARD, NARASI, SUBTITLE & DURASI)
 * ============================================================================ */
function VideoPembelajaranRenderer({
  videoData,
  videoUrl,
  videoTitle,
  videoChannel,
  suggestedVideos,
  subject,
  topic,
  onVideoUrlChange
}: {
  videoData: any;
  videoUrl?: string;
  videoTitle?: string;
  videoChannel?: string;
  suggestedVideos?: Array<{ id: string; url: string; title: string; channel: string; duration?: string }>;
  subject: string;
  topic: string;
  onVideoUrlChange?: (url: string) => void;
}) {
  const scenes = Array.isArray(videoData.adegan) ? videoData.adegan : [];
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakNarration = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'id-ID';
    utter.rate = 1.0;
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const currentScene = scenes[activeSceneIdx];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs space-y-0">
      <div className="px-5 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-rose-300 font-semibold">
            <Film className="w-4 h-4" />
            <span>Naskah & Storyboard Video Pembelajaran</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">Target Durasi: {videoData.durasiMenit || 5} Menit</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-0.5">{videoData.judulVideo || topic}</h3>
        </div>
        <span className="text-xs text-slate-300 tabular-nums">{scenes.length} Adegan Terstruktur</span>
      </div>

      <div className="p-6 space-y-6">
        <MediaViewer
          videoUrl={videoUrl || ''}
          videoTitle={videoTitle}
          videoChannel={videoChannel}
          suggestedVideos={suggestedVideos}
          mediaType="video"
          title={videoData.judulVideo || topic}
          subject={subject}
          onVideoUrlChange={onVideoUrlChange}
        />

        {/* Key Points & Production Notes */}
        <div className="grid md:grid-cols-2 gap-4">
          {Array.isArray(videoData.poinPentingKeseluruhan) && videoData.poinPentingKeseluruhan.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-900">Poin Penting Video</h4>
              <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                {videoData.poinPentingKeseluruhan.map((p: string, idx: number) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {videoData.catatanProduksi && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-900">Arahan Produksi & Tempo</h4>
              <p className="text-xs text-slate-700 leading-relaxed">{videoData.catatanProduksi}</p>
            </div>
          )}
        </div>

        {/* Interactive Storyboard Timeline */}
        {scenes.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {scenes.map((sc: any, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                      setIsSpeaking(false);
                    }
                    setActiveSceneIdx(idx);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left ${
                    activeSceneIdx === idx
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-bold">Adegan {sc.nomor || idx + 1}</span>
                  <span className={`text-[11px] tabular-nums ${activeSceneIdx === idx ? 'text-slate-300' : 'text-slate-500'}`}>
                    {sc.rentangWaktu || `${sc.durasiDetik || 45}d`}
                  </span>
                </button>
              ))}
            </div>

            {currentScene && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500 font-medium tabular-nums">
                      Adegan {currentScene.nomor || activeSceneIdx + 1} · {currentScene.rentangWaktu} ({currentScene.durasiDetik} detik)
                    </p>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">{currentScene.judulAdegan}</h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakNarration(currentScene.narasiGuru || '')}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5"
                  >
                    {isSpeaking ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    {isSpeaking ? 'Hentikan Audio Narasi' : 'Dengarkan Narasi Guru'}
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Visual Storyboard Preview */}
                  <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col justify-between min-h-[190px] space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-sky-300">Visual Pendukung Layar</p>
                      <p className="text-xs text-slate-200 leading-relaxed">{currentScene.visualPendukung}</p>
                    </div>

                    {Array.isArray(currentScene.poinPentingLayar) && currentScene.poinPentingLayar.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-slate-800">
                        <p className="text-[11px] font-semibold text-slate-400">Teks Grafis Layar:</p>
                        <ul className="text-xs text-emerald-300 space-y-0.5">
                          {currentScene.poinPentingLayar.map((pt: string, pIdx: number) => (
                            <li key={pIdx}>• {pt}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Subtitle Strip */}
                    <div className="bg-black/70 px-3 py-2 rounded-lg text-center text-xs font-medium text-amber-200 border border-slate-700">
                      [Subtitle] {currentScene.subtitle}
                    </div>
                  </div>

                  {/* Teacher Script */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-2">
                    <h5 className="text-xs font-bold text-slate-900">Naskah Narasi Guru (Voiceover / Kamera)</h5>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      "{currentScene.narasiGuru}"
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================================
 * 3. GAMIFIKASI RENDERER (LEVEL, KUIS, MATCHING GAME, XP, BADGE, LEADERBOARD)
 * ============================================================================ */
function GamifikasiRenderer({ data, isTeacherView }: { data: any; isTeacherView: boolean }) {
  const levels = Array.isArray(data.tantanganBerlevel) ? data.tantanganBerlevel : [];
  const pairs = Array.isArray(data.permainanEdukatif?.pasangan) ? data.permainanEdukatif.pasangan : [];
  const quizzes = Array.isArray(data.kuisInteraktif) ? data.kuisInteraktif : [];

  const [levelAnswers, setLevelAnswers] = useState<Record<number, string>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});

  // Matching Game State
  const [shuffledRight, setShuffledRight] = useState<Array<{ origIdx: number; text: string }>>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<number, number>>({});
  const [wrongMatchFlash, setWrongMatchFlash] = useState<boolean>(false);

  useEffect(() => {
    if (pairs.length > 0) {
      const items = pairs.map((p: any, idx: number) => ({ origIdx: idx, text: p.kanan }));
      // Deterministic yet mixed order
      const rotated = [...items].sort((a, b) => a.text.localeCompare(b.text));
      setShuffledRight(rotated);
      setMatchedPairs({});
      setSelectedLeft(null);
    }
  }, [JSON.stringify(pairs)]);

  const handleRightClick = (origIdx: number) => {
    if (selectedLeft === null) return;
    if (selectedLeft === origIdx) {
      setMatchedPairs(prev => ({ ...prev, [selectedLeft]: origIdx }));
      setSelectedLeft(null);
    } else {
      setWrongMatchFlash(true);
      setTimeout(() => setWrongMatchFlash(false), 500);
      setSelectedLeft(null);
    }
  };

  // Compute live XP score
  let earnedXp = 0;
  levels.forEach((lvl: any, idx: number) => {
    const chosen = levelAnswers[idx];
    if (chosen && (!lvl.kunciJawaban || chosen === lvl.kunciJawaban || chosen.startsWith(lvl.kunciJawaban))) {
      earnedXp += Number(lvl.xp) || 100;
    }
  });
  quizzes.forEach((q: any, idx: number) => {
    const chosen = quizAnswers[idx];
    if (chosen && (chosen === q.answer || chosen === q.answer?.[0])) {
      earnedXp += Number(q.poin) || 50;
    }
  });
  earnedXp += Object.keys(matchedPairs).length * 25;

  const maxPossibleXp =
    levels.reduce((sum: number, l: any) => sum + (Number(l.xp) || 100), 0) +
    quizzes.reduce((sum: number, q: any) => sum + (Number(q.poin) || 50), 0) +
    pairs.length * 25;

  const pctProgress = maxPossibleXp > 0 ? Math.min(100, Math.round((earnedXp / maxPossibleXp) * 100)) : 0;

  return (
    <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30 p-6 space-y-6">
      {/* Header & Badge Reward */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-amber-200/70">
        <div className="space-y-1">
          <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-600" />
            <span>Misi & Tantangan Gamifikasi</span>
          </p>
          <h3 className="text-xl font-bold text-slate-900">{data.judulMisi}</h3>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">{data.skenario}</p>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-amber-200 shrink-0">
          <span className="text-3xl">{data.badgeReward?.icon || '🏆'}</span>
          <div>
            <p className="text-[11px] font-bold text-amber-700">
              {pctProgress >= 80 ? 'Badge Berhasil Diraih!' : 'Target Badge Penghargaan'}
            </p>
            <p className="text-xs font-bold text-slate-900">{data.badgeReward?.nama || 'Master Eksplorasi'}</p>
            <p className="text-[11px] text-slate-500 max-w-[200px]">{data.badgeReward?.deskripsi}</p>
          </div>
        </div>
      </div>

      {/* Live XP Meter */}
      <div className="p-4 rounded-xl bg-white border border-amber-200 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800 tabular-nums">
          <span>Perolehan Poin & Skor XP</span>
          <span className="text-amber-700">{earnedXp} / {maxPossibleXp} XP ({pctProgress}%)</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${pctProgress}%` }}
          />
        </div>
      </div>

      {/* Tantangan Berlevel */}
      {levels.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-900">Tantangan Berlevel</h4>
          <div className="grid md:grid-cols-3 gap-4">
            {levels.map((lvl: any, idx: number) => {
              const selected = levelAnswers[idx];
              const isCorrect = selected && (!lvl.kunciJawaban || selected === lvl.kunciJawaban);
              return (
                <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold tabular-nums">
                      <span className="text-amber-700">Level {lvl.level || idx + 1}</span>
                      <span className="text-slate-500">+{lvl.xp || 100} XP</span>
                    </div>
                    <h5 className="font-bold text-sm text-slate-900">{lvl.judul}</h5>
                    <p className="text-xs text-slate-600">{lvl.instruksi}</p>
                    <p className="text-xs font-semibold text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      {lvl.tantanganSoal}
                    </p>

                    {Array.isArray(lvl.opsiJawaban) && lvl.opsiJawaban.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {lvl.opsiJawaban.map((opt: string, oIdx: number) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const isOptSelected = selected === letter;
                          const isKey = letter === lvl.kunciJawaban;
                          let cls = 'bg-white border-slate-200 text-slate-700 hover:bg-amber-50';
                          if (selected) {
                            if (isOptSelected && isKey) cls = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
                            else if (isOptSelected && !isKey) cls = 'bg-red-50 border-red-400 text-red-900 font-bold';
                            else if (isKey) cls = 'bg-emerald-50/60 border-emerald-300 text-emerald-800';
                          }
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => setLevelAnswers(prev => ({ ...prev, [idx]: letter }))}
                              className={`w-full text-left p-2.5 rounded-lg border text-xs transition ${cls}`}
                            >
                              <strong>{letter}.</strong> {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selected && (
                    <div className={`p-3 rounded-lg text-xs border ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                      <p className="font-bold">{isCorrect ? 'Level Selesai!' : `Jawaban Tepat: ${lvl.kunciJawaban}`}</p>
                      {lvl.penjelasan && <p className="mt-1">{lvl.penjelasan}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Permainan Edukatif (Match Pairs) */}
      {pairs.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Permainan Edukatif: {data.permainanEdukatif?.judulPermainan || 'Cocokkan Konsep'}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">{data.permainanEdukatif?.instruksi}</p>
            </div>
            <div className="flex items-center gap-3 text-xs tabular-nums">
              <span className="font-semibold text-emerald-700">
                Cocok: {Object.keys(matchedPairs).length} / {pairs.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMatchedPairs({});
                  setSelectedLeft(null);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Ulangi
              </button>
            </div>
          </div>

          {wrongMatchFlash && (
            <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              Pasangan belum cocok, silakan pilih kembali konsep dan penjelasan yang sesuai.
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500">1. Pilih Konsep</p>
              {pairs.map((p: any, idx: number) => {
                const isMatched = matchedPairs[idx] !== undefined;
                const isSelected = selectedLeft === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isMatched}
                    onClick={() => setSelectedLeft(idx)}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition flex items-center justify-between ${
                      isMatched
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-blue-400'
                    }`}
                  >
                    <span>{p.kiri}</span>
                    {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500">2. Pasangkan dengan Penjelasan</p>
              {shuffledRight.map((item, rIdx) => {
                const isMatched = Object.values(matchedPairs).includes(item.origIdx);
                return (
                  <button
                    key={rIdx}
                    type="button"
                    disabled={isMatched || selectedLeft === null}
                    onClick={() => handleRightClick(item.origIdx)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                      isMatched
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                        : selectedLeft !== null
                        ? 'bg-white border-blue-300 text-slate-800 hover:bg-blue-50 cursor-pointer'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {item.text}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Kuis Interaktif */}
      {quizzes.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-900">Kuis Interaktif</h4>
          <div className="grid gap-3">
            {quizzes.map((q: any, idx: number) => {
              const ans = quizAnswers[idx];
              const isCorrect = ans && (ans === q.answer || ans === q.answer?.[0]);
              return (
                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-900">{idx + 1}. {q.question}</span>
                    <span className="text-amber-700 font-bold shrink-0 tabular-nums">+{q.poin || 50} XP</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {q.options?.map((opt: string, oIdx: number) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      const isSel = ans === letter;
                      const isKey = letter === q.answer;
                      let cls = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50';
                      if (ans) {
                        if (isSel && isKey) cls = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
                        else if (isSel && !isKey) cls = 'bg-red-50 border-red-400 text-red-900 font-bold';
                        else if (isKey) cls = 'bg-emerald-50/50 border-emerald-300 text-emerald-800';
                      }
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => setQuizAnswers(prev => ({ ...prev, [idx]: letter }))}
                          className={`p-2.5 rounded-lg border text-xs text-left transition ${cls}`}
                        >
                          <strong>{letter}.</strong> {opt}
                        </button>
                      );
                    })}
                  </div>
                  {ans && q.explanation && (
                    <p className="text-xs text-slate-600 pt-1">
                      <strong>{isCorrect ? 'Benar:' : `Kunci (${q.answer}):`}</strong> {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional Leaderboard (Only if teacher enabled it!) */}
      {data.aktifkanLeaderboard && (
        <div className="bg-white p-5 rounded-xl border border-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              Papan Peringkat (Leaderboard Aktif)
            </h4>
            {isTeacherView && (
              <span className="text-xs text-slate-500">Diaktifkan oleh Guru</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Peringkat</th>
                  <th className="py-2 px-3">Peserta</th>
                  <th className="py-2 px-3 text-right">Perolehan XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-amber-50/50 font-bold text-slate-900">
                  <td className="py-2 px-3">#1</td>
                  <td className="py-2 px-3">Skor Sesi Anda Saat Ini</td>
                  <td className="py-2 px-3 text-right text-amber-700">{earnedXp} XP</td>
                </tr>
                {(data.leaderboardContoh || [
                  { nama: 'Target Nilai Tuntas Kelas', poin: Math.round(maxPossibleXp * 0.8), badge: '🎯' },
                  { nama: 'Target Nilai Dasar', poin: Math.round(maxPossibleXp * 0.5), badge: '⭐' }
                ]).map((row: any, rIdx: number) => (
                  <tr key={rIdx} className="text-slate-600">
                    <td className="py-2 px-3">#{rIdx + 2}</td>
                    <td className="py-2 px-3">{row.badge} {row.nama}</td>
                    <td className="py-2 px-3 text-right">{row.poin} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

/* ============================================================================
 * 4. PETA KONSEP (MIND MAPPING) INTERAKTIF
 * ============================================================================ */
function PetaKonsepRenderer({ data, topic }: { data: any; topic: string }) {
  const branches = Array.isArray(data.cabangMateri)
    ? data.cabangMateri
    : Array.isArray(data.cabang)
    ? data.cabang
    : [];
  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    branches.forEach((_: any, i: number) => {
      initial[i] = true;
    });
    return initial;
  });

  const toggleAll = (open: boolean) => {
    const next: Record<number, boolean> = {};
    branches.forEach((_: any, i: number) => {
      next[i] = open;
    });
    setExpandedMap(next);
  };

  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-indigo-100">
        <div>
          <p className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
            <Network className="w-4 h-4" />
            <span>Peta Konsep & Hierarki Materi Interaktif</span>
          </p>
          <h3 className="text-lg font-bold text-slate-900 mt-0.5">{data.konsepUtama || data.topikUtama || topic}</h3>
          {data.ringkasan && <p className="text-xs text-slate-600 mt-1 max-w-2xl">{data.ringkasan}</p>}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => toggleAll(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700"
          >
            Buka Semua Cabang
          </button>
          <button
            type="button"
            onClick={() => toggleAll(false)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700"
          >
            Ringkas
          </button>
        </div>
      </div>

      {/* Central Node + Visual Tree Connectors */}
      <div className="flex flex-col items-center">
        <div className="px-6 py-4 rounded-2xl bg-slate-900 text-white text-center max-w-md w-full shadow-sm">
          <p className="text-[11px] font-semibold text-sky-300">Konsep Utama</p>
          <h4 className="text-base font-bold mt-0.5">{data.konsepUtama || data.topikUtama || topic}</h4>
        </div>
        <div className="w-px h-6 bg-indigo-300" />
        <div className="w-3/4 h-px bg-indigo-200 hidden md:block" />
      </div>

      {/* Branches Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((br: any, bIdx: number) => {
          const isOpen = expandedMap[bIdx] !== false;
          const subConcepts = Array.isArray(br.subKonsep)
            ? br.subKonsep
            : Array.isArray(br.kataKunci)
            ? br.kataKunci.map((kw: string) => ({ nama: kw, penjelasanSingkat: '' }))
            : [];

          return (
            <div key={bIdx} className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
              <button
                type="button"
                onClick={() => setExpandedMap(prev => ({ ...prev, [bIdx]: !isOpen }))}
                className="p-4 text-left hover:bg-slate-50 transition flex items-start justify-between gap-2 border-b border-slate-100"
              >
                <div className="space-y-1">
                  {br.hubunganDariUtama && (
                    <p className="text-[11px] font-semibold text-indigo-600">
                      ↳ {br.hubunganDariUtama}
                    </p>
                  )}
                  <h5 className="text-sm font-bold text-slate-900">{br.nama}</h5>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />}
              </button>

              {isOpen && (
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {br.deskripsi && <p className="text-xs text-slate-600 leading-relaxed">{br.deskripsi}</p>}
                    {subConcepts.length > 0 && (
                      <div className="space-y-2 pl-3 border-l border-indigo-200">
                        {subConcepts.map((sc: any, sIdx: number) => (
                          <div key={sIdx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <p className="text-xs font-bold text-slate-900">{sc.nama}</p>
                            {sc.penjelasanSingkat && (
                              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{sc.penjelasanSingkat}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {br.hubunganAntarCabang && (
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-indigo-800">
                      <strong>Keterkaitan Antarkonsep:</strong> {br.hubunganAntarCabang}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================================
 * 5. INFOGRAFIS RENDERER
 * ============================================================================ */
function InfografisRenderer({ data }: { data: any }) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-white overflow-hidden shadow-xs">
      <div className="p-6 bg-slate-900 text-white space-y-1.5">
        <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4" /> Infografis Visual Materi
        </p>
        <h3 className="text-xl font-bold text-white">{data.judul}</h3>
        {data.subjudul && <p className="text-xs text-slate-300">{data.subjudul}</p>}
      </div>

      <div className="p-6 space-y-6">
        {data.ringkasanVisual && (
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
            {data.ringkasanVisual}
          </p>
        )}

        {/* Highlights Grid */}
        {Array.isArray(data.sorotanFakta) && data.sorotanFakta.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-4">
            {data.sorotanFakta.map((item: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-emerald-50/40 space-y-1">
                <p className="text-xs font-semibold text-emerald-800">{item.label}</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums">{item.angkaAtauHighlight}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{item.penjelasan}</p>
              </div>
            ))}
          </div>
        )}

        {/* Flow Diagram */}
        {Array.isArray(data.diagramAlur) && data.diagramAlur.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Diagram Alur Konsep</h4>
            <div className="grid md:grid-cols-4 gap-3">
              {data.diagramAlur.map((step: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold tabular-nums">
                    {step.langkah || idx + 1}
                  </span>
                  <h5 className="text-xs font-bold text-slate-900">{step.judul}</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.deskripsi}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comparison Table */}
        {data.perbandinganKonsep && Array.isArray(data.perbandinganKonsep.aspek) && (
          <div className="space-y-2.5">
            <h4 className="text-sm font-bold text-slate-900">{data.perbandinganKonsep.judulPerbandingan}</h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Aspek Pembanding</th>
                    <th className="py-2.5 px-4 text-blue-800">{data.perbandinganKonsep.konsepA}</th>
                    <th className="py-2.5 px-4 text-emerald-800">{data.perbandinganKonsep.konsepB}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.perbandinganKonsep.aspek.map((row: any, rIdx: number) => (
                    <tr key={rIdx}>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{row.kriteria}</td>
                      <td className="py-2.5 px-4 text-slate-700">{row.nilaiA}</td>
                      <td className="py-2.5 px-4 text-slate-700">{row.nilaiB}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Important Info & Illustration Blueprint */}
        <div className="grid md:grid-cols-2 gap-4">
          {Array.isArray(data.informasiPenting) && data.informasiPenting.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
              <h5 className="text-xs font-bold text-amber-950">Informasi Penting</h5>
              <ul className="space-y-1 text-xs text-amber-900 list-disc list-inside">
                {data.informasiPenting.map((inf: string, idx: number) => (
                  <li key={idx}>{inf}</li>
                ))}
              </ul>
            </div>
          )}

          {data.deskripsiIlustrasi && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <h5 className="text-xs font-bold text-slate-900">Panduan Ilustrasi Grafis</h5>
              <p className="text-xs text-slate-600 leading-relaxed">{data.deskripsiIlustrasi}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * 6. MODUL DIGITAL RENDERER
 * ============================================================================ */
function ModulDigitalRenderer({ data }: { data: any }) {
  const [activeBabIdx, setActiveBabIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showEssayKey, setShowEssayKey] = useState<Record<number, boolean>>({});

  const parts = Array.isArray(data.bagianMateri) ? data.bagianMateri : [];
  const exercises = Array.isArray(data.latihanSoal) ? data.latihanSoal : [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <div className="p-6 bg-slate-50 border-b border-slate-200 space-y-2">
        <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" /> Modul Digital Terstruktur
        </p>
        <h3 className="text-xl font-bold text-slate-900">{data.judul}</h3>
        {data.kataPengantar && <p className="text-xs text-slate-600 leading-relaxed">{data.kataPengantar}</p>}
      </div>

      <div className="grid lg:grid-cols-12">
        {/* Daftar Isi Sidebar */}
        <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50 p-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Daftar Isi Modul</h4>
          <div className="space-y-1.5">
            {parts.map((bab: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveBabIdx(idx)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between gap-2 ${
                  activeBabIdx === idx
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">{bab.kode || `${idx + 1}.`} {bab.judul}</span>
                {data.daftarIsi?.[idx]?.estimasiMenit && (
                  <span className={`text-[10px] shrink-0 tabular-nums ${activeBabIdx === idx ? 'text-blue-100' : 'text-slate-400'}`}>
                    {data.daftarIsi[idx].estimasiMenit} mnt
                  </span>
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setActiveBabIdx(-1)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeBabIdx === -1
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Rangkuman & Latihan Soal ({exercises.length})
            </button>
          </div>
        </aside>

        {/* Active Chapter Body */}
        <div className="lg:col-span-8 p-6 space-y-6">
          {activeBabIdx >= 0 && parts[activeBabIdx] ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-blue-700">Bagian {parts[activeBabIdx].kode || activeBabIdx + 1}</p>
                <h4 className="text-lg font-bold text-slate-900 mt-0.5">{parts[activeBabIdx].judul}</h4>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-900">Penjelasan Konsep</h5>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {parts[activeBabIdx].penjelasanKonsep}
                </p>
              </div>

              {parts[activeBabIdx].contohPenerapan && (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <h5 className="text-xs font-bold text-emerald-950">Contoh Penerapan</h5>
                  <p className="text-xs text-emerald-900 leading-relaxed whitespace-pre-line">
                    {parts[activeBabIdx].contohPenerapan}
                  </p>
                </div>
              )}

              {Array.isArray(parts[activeBabIdx].poinKunci) && parts[activeBabIdx].poinKunci.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h5 className="text-xs font-bold text-slate-900">Poin Kunci</h5>
                  <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                    {parts[activeBabIdx].poinKunci.map((pk: string, pIdx: number) => (
                      <li key={pIdx}>{pk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Array.isArray(data.rangkuman) && data.rangkuman.length > 0 && (
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="text-sm font-bold text-slate-900">Rangkuman Materi</h4>
                  <ul className="space-y-1.5 text-xs text-slate-700 list-decimal list-inside">
                    {data.rangkuman.map((rk: string, rIdx: number) => (
                      <li key={rIdx} className="leading-relaxed">{rk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {exercises.length > 0 && (() => {
                const pgExercises = exercises.filter(
                  (ex: any) => ex.tipe === 'pg' || (Array.isArray(ex.opsi) && ex.opsi.length > 0)
                );
                const correctPgCount = exercises.reduce((acc: number, ex: any, idx: number) => {
                  const isPg = ex.tipe === 'pg' || (Array.isArray(ex.opsi) && ex.opsi.length > 0);
                  if (isPg && answers[idx] && answers[idx] === ex.kunci) return acc + 1;
                  return acc;
                }, 0);

                return (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      Latihan Soal Mandiri ({exercises.length} Soal)
                    </h4>
                    {pgExercises.length > 0 && (
                      <span className="text-xs font-semibold text-blue-700 tabular-nums">
                        Skor Sementara: {correctPgCount} / {pgExercises.length} Benar
                      </span>
                    )}
                  </div>
                  {exercises.map((ex: any, eIdx: number) => {
                    const ans = answers[eIdx];
                    const isPg = ex.tipe === 'pg' || (Array.isArray(ex.opsi) && ex.opsi.length > 0);
                    return (
                      <div key={eIdx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                        <p className="text-xs font-bold text-slate-900">
                          {eIdx + 1}. {ex.pertanyaan}
                        </p>
                        {isPg && Array.isArray(ex.opsi) ? (
                          <div className="grid sm:grid-cols-2 gap-2">
                            {ex.opsi.map((opt: string, oIdx: number) => {
                              const letter = String.fromCharCode(65 + oIdx);
                              const isSel = ans === letter;
                              const isKey = letter === ex.kunci;
                              let cls = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50';
                              if (ans) {
                                if (isSel && isKey) cls = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
                                else if (isSel && !isKey) cls = 'bg-red-50 border-red-400 text-red-900 font-bold';
                                else if (isKey) cls = 'bg-emerald-50/50 border-emerald-300 text-emerald-800';
                              }
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => setAnswers(prev => ({ ...prev, [eIdx]: letter }))}
                                  className={`p-2.5 rounded-lg border text-xs text-left transition ${cls}`}
                                >
                                  <strong>{letter}.</strong> {opt}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => setShowEssayKey(prev => ({ ...prev, [eIdx]: !prev[eIdx] }))}
                              className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100"
                            >
                              {showEssayKey[eIdx] ? 'Sembunyikan Panduan Jawaban' : 'Lihat Kunci & Pembahasan'}
                            </button>
                            {showEssayKey[eIdx] && (
                              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                                <p><strong>Kunci:</strong> {ex.kunci}</p>
                                {ex.pembahasan && <p><strong>Pembahasan:</strong> {ex.pembahasan}</p>}
                              </div>
                            )}
                          </div>
                        )}
                        {isPg && ans && ex.pembahasan && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <strong>Pembahasan (Kunci {ex.kunci}):</strong> {ex.pembahasan}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * 7. SIMULASI & PRAKTIK INTERAKTIF RENDERER
 * ============================================================================ */
function SimulasiPraktikRenderer({ data }: { data: any }) {
  const params = Array.isArray(data.parameterInteraktif) ? data.parameterInteraktif : [];
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    params.forEach((p: any) => {
      init[p.id || p.namaParameter] = Number(p.defaultVal ?? 50);
    });
    return init;
  });

  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [scenarioChoices, setScenarioChoices] = useState<Record<number, number>>({});

  return (
    <section className="rounded-2xl border border-cyan-200 bg-white overflow-hidden shadow-xs">
      <div className="p-5 bg-slate-900 text-white space-y-1">
        <p className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
          <FlaskConical className="w-4 h-4" /> Simulasi Konsep & Eksperimen Virtual
        </p>
        <h3 className="text-lg font-bold text-white">{data.judulSimulasi}</h3>
        <p className="text-xs text-slate-300">{data.deskripsiSingkat}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Interactive Concept Simulation Sandbox */}
        {params.length > 0 && (
          <div className="grid lg:grid-cols-12 gap-5 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div className="lg:col-span-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-700" /> Kontrol Parameter Simulasi
              </h4>
              {params.map((p: any, idx: number) => {
                const key = p.id || p.namaParameter;
                const min = Number(p.min ?? 0);
                const max = Number(p.max ?? 100);
                const val = paramValues[key] ?? Number(p.defaultVal ?? 50);

                return (
                  <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800">{p.namaParameter}</span>
                      <span className="font-mono text-cyan-700 tabular-nums font-bold">
                        {val} {p.satuan || ''}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={val}
                      onChange={e => setParamValues(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="w-full accent-cyan-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
                      <span>{min} {p.satuan}</span>
                      <span>{max} {p.satuan}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-7 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Hasil Pengamatan Simulasi Real-Time</h4>
              <div className="space-y-3">
                {params.map((p: any, idx: number) => {
                  const key = p.id || p.namaParameter;
                  const min = Number(p.min ?? 0);
                  const max = Number(p.max ?? 100);
                  const val = paramValues[key] ?? Number(p.defaultVal ?? 50);
                  const ratio = max > min ? (val - min) / (max - min) : 0.5;
                  const levelLabel = ratio < 0.35 ? 'Rendah' : ratio <= 0.7 ? 'Optimal / Sedang' : 'Tinggi / Ekstrem';
                  const statusTone =
                    ratio < 0.35
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : ratio <= 0.7
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900';
                  const outcome = ratio < 0.35 ? p.dampakRendah : ratio <= 0.7 ? p.dampakSedang : p.dampakTinggi;

                  return (
                    <div key={idx} className={`p-4 rounded-xl border ${statusTone} space-y-1.5`}>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>{p.namaParameter}</span>
                        <span className="tabular-nums">Status: {levelLabel} ({val} {p.satuan})</span>
                      </div>
                      <p className="text-xs leading-relaxed">{outcome}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Eksperimen Virtual */}
        {data.eksperimenVirtual && (
          <div className="p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900">
                Praktik Langkah demi Langkah: {data.eksperimenVirtual.judulEksperimen}
              </h4>
              {Array.isArray(data.eksperimenVirtual.alatBahanVirtual) && (
                <span className="text-xs text-slate-500">
                  Alat/Komponen: {data.eksperimenVirtual.alatBahanVirtual.join(', ')}
                </span>
              )}
            </div>
            <div className="space-y-2.5">
              {(data.eksperimenVirtual.langkahPraktik || []).map((step: any, sIdx: number) => {
                const done = Boolean(checkedSteps[sIdx]);
                return (
                  <div
                    key={sIdx}
                    className={`p-3.5 rounded-xl border transition ${
                      done ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => setCheckedSteps(prev => ({ ...prev, [sIdx]: !done }))}
                        className="mt-1 rounded text-emerald-600"
                      />
                      <div className="space-y-1 flex-1">
                        <p className="text-xs font-bold text-slate-900">
                          Langkah {step.langkahKe || sIdx + 1}: {step.instruksi}
                        </p>
                        {done && step.hasilPengamatan && (
                          <p className="text-xs text-emerald-800 bg-white p-2.5 rounded-lg border border-emerald-200">
                            <strong>Hasil Pengamatan:</strong> {step.hasilPengamatan}
                          </p>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Studi Kasus & Skenario Pemecahan Masalah */}
        {data.studiKasus && (
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Studi Kasus: {data.studiKasus.judulKasus}</h4>
              <p className="text-xs text-slate-700 leading-relaxed">{data.studiKasus.narasiKasus}</p>
            </div>

            {(data.studiKasus.skenarioPemecahanMasalah || []).map((sk: any, kIdx: number) => {
              const picked = scenarioChoices[kIdx];
              const pickedChoice = picked !== undefined ? sk.pilihanAksi?.[picked] : null;
              return (
                <div key={kIdx} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <p className="text-xs font-bold text-slate-900">
                    Keputusan {kIdx + 1}: {sk.pertanyaanKeputusan}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {(sk.pilihanAksi || []).map((opt: any, oIdx: number) => (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => setScenarioChoices(prev => ({ ...prev, [kIdx]: oIdx }))}
                        className={`p-3 rounded-lg border text-xs text-left transition ${
                          picked === oIdx
                            ? opt.tepat
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                              : 'bg-red-50 border-red-400 text-red-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {pickedChoice && (
                    <p className={`text-xs p-3 rounded-lg border ${pickedChoice.tepat ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                      <strong>{pickedChoice.tepat ? 'Keputusan Tepat:' : 'Perlu Evaluasi:'}</strong> {pickedChoice.umpanBalik}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================================
 * 8. WEB PEMBELAJARAN INTERAKTIF RENDERER
 * ============================================================================ */
function WebPembelajaranRenderer({
  data,
  videoUrl,
  videoTitle,
  videoChannel,
  suggestedVideos,
  imageUrl,
  topic,
  subject,
  onVideoUrlChange
}: {
  data: any;
  videoUrl?: string;
  videoTitle?: string;
  videoChannel?: string;
  suggestedVideos?: Array<{ id: string; url: string; title: string; channel: string; duration?: string }>;
  imageUrl?: string;
  topic: string;
  subject: string;
  onVideoUrlChange?: (url: string) => void;
}) {
  const tabs = Array.isArray(data.tabMateri) ? data.tabMateri : [];
  const accordions = Array.isArray(data.accordionKonsep) ? data.accordionKonsep : [];
  const exploreBtns = Array.isArray(data.tombolEksplorasi) ? data.tombolEksplorasi : [];

  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [openAcc, setOpenAcc] = useState<number | null>(0);
  const [activeExploreIdx, setActiveExploreIdx] = useState<number | null>(null);

  return (
    <section className="rounded-2xl border border-teal-200 bg-white overflow-hidden shadow-xs">
      <div className="p-6 bg-gradient-to-r from-teal-900 to-slate-900 text-white space-y-1.5">
        <p className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
          <Globe className="w-4 h-4" /> Web Pembelajaran Interaktif
        </p>
        <h3 className="text-xl font-bold text-white">{data.judulHalaman || topic}</h3>
        {data.tagline && <p className="text-xs text-slate-300">{data.tagline}</p>}
      </div>

      <div className="p-6 space-y-6">
        {(videoUrl || imageUrl || (suggestedVideos && suggestedVideos.length > 0)) && (
          <MediaViewer
            imageUrl={imageUrl}
            videoUrl={videoUrl}
            videoTitle={videoTitle}
            videoChannel={videoChannel}
            suggestedVideos={suggestedVideos}
            mediaType={videoUrl && imageUrl ? 'both' : videoUrl || suggestedVideos?.length ? 'video' : 'image'}
            title={data.judulHalaman || topic}
            subject={subject}
            onVideoUrlChange={onVideoUrlChange}
          />
        )}

        {/* Tab Materi */}
        {tabs.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              {tabs.map((tab: any, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveTabIdx(idx)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    activeTabIdx === idx ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.labelTab}
                </button>
              ))}
            </div>

            {tabs[activeTabIdx] && (
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-base font-bold text-slate-900">{tabs[activeTabIdx].judulKonten}</h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {tabs[activeTabIdx].isiKonten}
                </p>
                {Array.isArray(tabs[activeTabIdx].poinHighlight) && tabs[activeTabIdx].poinHighlight.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    {tabs[activeTabIdx].poinHighlight.map((ph: string, pIdx: number) => (
                      <p key={pIdx} className="text-xs font-semibold text-teal-800">• {ph}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tombol Eksplorasi */}
        {exploreBtns.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900">Tombol Eksplorasi Mandiri</h4>
            <div className="flex flex-wrap gap-2">
              {exploreBtns.map((btn: any, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveExploreIdx(activeExploreIdx === idx ? null : idx)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    activeExploreIdx === idx
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {btn.labelTombol}
                </button>
              ))}
            </div>

            {activeExploreIdx !== null && exploreBtns[activeExploreIdx] && (
              <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1.5">
                <h5 className="text-sm font-bold text-teal-950">{exploreBtns[activeExploreIdx].judulPopup}</h5>
                <p className="text-xs text-teal-900 leading-relaxed whitespace-pre-line">
                  {exploreBtns[activeExploreIdx].kontenEksplorasi}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Accordion */}
        {accordions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900">Pendalaman Konsep (Accordion)</h4>
            {accordions.map((acc: any, idx: number) => {
              const isOpen = openAcc === idx;
              return (
                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenAcc(isOpen ? null : idx)}
                    className="w-full p-3.5 text-left text-xs font-bold text-slate-900 flex items-center justify-between gap-2 hover:bg-slate-50"
                  >
                    <span>{acc.judul}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-700 leading-relaxed border-t border-slate-100 whitespace-pre-line">
                      {acc.jawabanAtauUraian}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================================
 * 9. PODCAST & AUDIO PEMBELAJARAN RENDERER (WITH WEB SPEECH API PLAYER)
 * ============================================================================ */
function PodcastAudioRenderer({ data }: { data: any }) {
  const dialogs = Array.isArray(data.dialogInteraktif) ? data.dialogInteraktif : [];
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTurnIdx, setActiveTurnIdx] = useState<number | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechError, setSpeechError] = useState<string>('');
  const playingRef = useRef(false);

  const stopAudio = () => {
    playingRef.current = false;
    setIsPlaying(false);
    setActiveTurnIdx(null);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    return () => stopAudio();
  }, []);

  const playFromIndex = (startIdx: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechError('Peramban Anda tidak mendukung pemutar suara bawaan (SpeechSynthesis). Silakan baca naskah percakapan di bawah.');
      return;
    }
    setSpeechError('');
    window.speechSynthesis.cancel();
    playingRef.current = true;
    setIsPlaying(true);

    const speakNext = (idx: number) => {
      if (!playingRef.current || idx >= dialogs.length) {
        stopAudio();
        return;
      }
      setActiveTurnIdx(idx);
      const turn = dialogs[idx];
      const utter = new SpeechSynthesisUtterance(turn.teks);
      utter.lang = 'id-ID';
      utter.rate = speechRate;
      utter.pitch = turn.peran === 'host' ? 1.08 : 0.94;
      utter.onend = () => {
        if (playingRef.current) speakNext(idx + 1);
      };
      utter.onerror = () => {
        stopAudio();
      };
      window.speechSynthesis.speak(utter);
    };

    speakNext(startIdx);
  };

  return (
    <section className="rounded-2xl border border-violet-200 bg-white overflow-hidden shadow-xs">
      <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-violet-300 font-semibold">
            <Headphones className="w-4 h-4" />
            <span>Podcast & Audio Pembelajaran</span>
            <span aria-hidden="true">·</span>
            <span>Estimasi {data.durasiEstimasi || '5 Menit'}</span>
          </div>
          <h3 className="text-lg font-bold text-white">{data.judulEpisode}</h3>
          <p className="text-xs text-slate-400">
            Pembawa Acara: {data.pembawaAcara || 'Host'} · Narasumber: {data.narasumber || 'Guru'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={speechRate}
            onChange={e => setSpeechRate(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-2 font-semibold"
            aria-label="Kecepatan Audio"
          >
            <option value={0.85}>0.85x</option>
            <option value={1}>1.0x</option>
            <option value={1.15}>1.15x</option>
          </select>

          {!isPlaying ? (
            <button
              type="button"
              onClick={() => playFromIndex(0)}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Play className="w-4 h-4" /> Putar Podcast
            </button>
          ) : (
            <button
              type="button"
              onClick={stopAudio}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Square className="w-4 h-4" /> Berhenti
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {speechError && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            {speechError}
          </div>
        )}
        {data.narasiPembuka && (
          <div className="p-4 rounded-xl bg-violet-50/70 border border-violet-200 text-xs text-violet-950 leading-relaxed">
            <strong>Narasi Pembuka:</strong> {data.narasiPembuka}
          </div>
        )}

        {/* Dialogue Script */}
        <div className="space-y-3">
          {dialogs.map((turn: any, idx: number) => {
            const isActive = activeTurnIdx === idx;
            const isHost = turn.peran === 'host';
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition ${
                  isActive
                    ? 'bg-violet-50 border-violet-400 ring-1 ring-violet-300'
                    : isHost
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-xs font-bold ${isHost ? 'text-blue-700' : 'text-violet-800'}`}>
                    {turn.pembicara}
                  </span>
                  <button
                    type="button"
                    onClick={() => playFromIndex(idx)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-violet-700 flex items-center gap-1"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Putar dari sini
                  </button>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed">{turn.teks}</p>
                {turn.penekananPoin && (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Poin Penekanan: <strong>{turn.penekananPoin}</strong>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {Array.isArray(data.ringkasanAudio) && data.ringkasanAudio.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-900">Ringkasan Audio Pembelajaran</h4>
            <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
              {data.ringkasanAudio.map((r: string, idx: number) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================================
 * 10. FORMAT BEBAS (CUSTOM) RENDERER
 * ============================================================================ */
function CustomFormatRenderer({ data }: { data: any }) {
  const blocks = Array.isArray(data.bagianKustom) ? data.bagianKustom : [];
  const [revealedBlocks, setRevealedBlocks] = useState<Record<number, boolean>>({});

  return (
    <section className="rounded-2xl border border-orange-200 bg-white overflow-hidden shadow-xs">
      <div className="p-6 bg-slate-900 text-white space-y-1.5">
        <p className="text-xs font-semibold text-orange-300 flex items-center gap-1.5">
          <Wand2 className="w-4 h-4" /> Format Bebas (Custom Design Guru)
        </p>
        <h3 className="text-xl font-bold text-white">{data.namaFormat}</h3>
        {data.ringkasanDesainPembelajaran && (
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">{data.ringkasanDesainPembelajaran}</p>
        )}
      </div>

      <div className="p-6 space-y-4">
        {blocks.map((blk: any, idx: number) => (
          <div key={idx} className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900">{blk.judulBagian}</h4>
              <span className="text-[11px] font-semibold text-slate-500 capitalize">
                {(blk.jenisBlok || 'teks').replace(/_/g, ' ')}
              </span>
            </div>

            {blk.jenisBlok === 'interaktif' ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setRevealedBlocks(prev => ({ ...prev, [idx]: !prev[idx] }))}
                  className="px-3.5 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition"
                >
                  {revealedBlocks[idx] ? 'Sembunyikan Konten Interaktif' : 'Buka Eksplorasi Interaktif'}
                </button>
                {revealedBlocks[idx] && (
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-white p-4 rounded-lg border border-slate-200">
                    {blk.isi}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{blk.isi}</p>
            )}

            {Array.isArray(blk.poinAtauItem) && blk.poinAtauItem.length > 0 && (
              <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside pt-1">
                {blk.poinAtauItem.map((it: string, iIdx: number) => (
                  <li key={iIdx}>{it}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
 * 11. LATIHAN SOAL MANDIRI TAMBAHAN (BILA DIPILIH GURU DI LUAR MODUL DIGITAL)
 * ============================================================================ */
function LatihanSoalMandiriSection({ exercises }: { exercises: any[] }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showEssayKey, setShowEssayKey] = useState<Record<number, boolean>>({});

  const pgExercises = exercises.filter(
    (ex: any) => ex.tipe === 'pg' || (Array.isArray(ex.opsi) && ex.opsi.length > 0)
  );
  const correctPgCount = exercises.reduce((acc: number, ex: any, idx: number) => {
    const isPg = ex.tipe === 'pg' || (Array.isArray(ex.opsi) && ex.opsi.length > 0);
    if (isPg && answers[idx] && answers[idx] === ex.kunci) return acc + 1;
    return acc;
  }, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <div className="px-5 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold">Latihan Soal Mandiri ({exercises.length} Soal)</span>
        </div>
        <div className="flex items-center gap-3 text-xs tabular-nums">
          {pgExercises.length > 0 && (
            <span className="text-emerald-300 font-semibold">
              Skor Pilihan Ganda: {correctPgCount} / {pgExercises.length} Benar
            </span>
          )}
          {Object.keys(answers).length > 0 && (
            <button
              type="button"
              onClick={() => setAnswers({})}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Ulangi
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {exercises.map((ex: any, eIdx: number) => {
          const ans = answers[eIdx];
          const isPg = ex.tipe === 'pg' || (Array.isArray(ex.opsi) && ex.opsi.length > 0);
          return (
            <div key={eIdx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                  {eIdx + 1}. {ex.pertanyaan}
                </p>
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                  {isPg ? 'Pilihan Ganda' : 'Uraian / Esai'}
                </span>
              </div>

              {isPg && Array.isArray(ex.opsi) ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  {ex.opsi.map((opt: string, oIdx: number) => {
                    const letter = String.fromCharCode(65 + oIdx);
                    const isSel = ans === letter;
                    const isKey = letter === ex.kunci;
                    let cls = 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50';
                    if (ans) {
                      if (isSel && isKey) cls = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
                      else if (isSel && !isKey) cls = 'bg-red-50 border-red-400 text-red-900 font-bold';
                      else if (isKey) cls = 'bg-emerald-50/60 border-emerald-300 text-emerald-800';
                    }
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => setAnswers(prev => ({ ...prev, [eIdx]: letter }))}
                        className={`p-3 rounded-xl border text-xs text-left transition flex items-center justify-between gap-2 ${cls}`}
                      >
                        <span>
                          <strong>{letter}.</strong> {opt}
                        </span>
                        {ans && isKey && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {ans && isSel && !isKey && <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowEssayKey(prev => ({ ...prev, [eIdx]: !prev[eIdx] }))}
                    className="px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition"
                  >
                    {showEssayKey[eIdx] ? 'Sembunyikan Kunci & Pembahasan' : 'Lihat Kunci & Pembahasan'}
                  </button>
                  {showEssayKey[eIdx] && (
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-1.5">
                      <p>
                        <strong>Kunci Jawaban:</strong> {ex.kunci}
                      </p>
                      {ex.pembahasan && (
                        <p>
                          <strong>Pembahasan:</strong> {ex.pembahasan}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isPg && ans && ex.pembahasan && (
                <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                  <strong>Pembahasan (Kunci {ex.kunci}):</strong> {ex.pembahasan}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

