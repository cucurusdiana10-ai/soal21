import { getCuratedCpDataset } from './cpDatabase';
import { resolveRelevantYoutubeVideo } from './youtubeLibrary';
import type {
  BahanAjarFormatId,
  CreativeAssistantActionId,
  CreativeAssistantResponse,
  ModulAnalysisResult,
  StudentDifficultyLevel
} from '../types/bahanAjar';

export function parseJsonSafely(text: string) {
  if (!text) throw new Error('Respon AI kosong');
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```.*$/s, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');

    if (firstBrace !== -1 && lastBrace > firstBrace && (firstBracket === -1 || firstBrace < firstBracket)) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    } else if (firstBracket !== -1 && lastBracket > firstBracket) {
      const candidate = cleaned.slice(firstBracket, lastBracket + 1);
      return JSON.parse(candidate);
    }
    throw new Error('Gagal mengurai format respon AI.');
  }
}

export function formatAiErrorMessage(err: any): string {
  if (!err) return 'Terjadi kendala saat memproses permintaan AI.';
  let msg = typeof err === 'string' ? err : err.message || '';
  try {
    const parsed = JSON.parse(msg);
    if (parsed.error?.message) {
      msg = parsed.error.message;
    }
  } catch {}

  if (msg.includes('AbortError') || msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('aborted')) {
    return 'Permintaan ke server AI melebihi batas waktu. Silakan coba klik ulang atau kurangi jumlah format/soal sekaligus.';
  }
  if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
    return 'Layanan AI Google Gemini sedang mengalami lonjakan beban sesaat. Silakan klik tombol buat/racik kembali.';
  }
  if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('resource_exhausted')) {
    return 'Kuota permintaan AI telah mencapai batas sesaat. Mohon tunggu beberapa saat sebelum mencoba kembali.';
  }
  return msg || 'Gagal memproses AI.';
}

async function postApiWithFallback(endpoints: string[], payload: any, timeoutMs: number = 60000) {
  let lastErrorMsg = '';

  for (const url of endpoints) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.log('[AI API] Mengirim POST ke server:', url);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const contentType = res.headers.get('content-type') || '';
      const rawText = await res.text();

      console.log('[AI API] Status respon:', url, res.status);

      if (res.ok) {
        if (contentType.includes('application/json')) {
          return JSON.parse(rawText);
        }
        return parseJsonSafely(rawText);
      }

      if (res.status === 405 || res.status === 404) {
        console.warn(`[AI API] Endpoint ${url} merespons ${res.status}. Mencoba endpoint alternatif...`);
        lastErrorMsg = `Endpoint server ${url} tidak tersedia (${res.status})`;
        continue;
      }

      if (contentType.includes('application/json')) {
        try {
          const errJson = JSON.parse(rawText);
          lastErrorMsg = errJson.error || `Server error (${res.status})`;
        } catch {
          lastErrorMsg = `Server error (${res.status})`;
        }
      } else {
        lastErrorMsg = `Server error (${res.status})`;
      }
      break;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        lastErrorMsg = 'Permintaan ke server AI melebihi batas waktu (timeout). Silakan coba kembali.';
        break;
      }
      console.warn('[AI API] Gagal terhubung ke endpoint:', url, err?.message);
      lastErrorMsg = err?.message || 'Koneksi ke server backend gagal.';
    } finally {
      window.clearTimeout(timer);
    }
  }

  if (!lastErrorMsg || lastErrorMsg.includes('405') || lastErrorMsg.includes('404')) {
    lastErrorMsg =
      'Gagal memproses AI melalui server backend. Pastikan server berjalan dan variabel GEMINI_API_KEY telah dikonfigurasi di environment server.';
  }

  throw new Error(formatAiErrorMessage(lastErrorMsg));
}

export interface GenerateMaterialPayload {
  subject: string;
  grade: string;
  topic: string;
  description?: string;
  pertemuanList?: any[];
  pertemuanCount?: number;
  selectedMeetingIndex?: string;
  selectedFormats?: BahanAjarFormatId[];
  tingkatKesulitan?: StudentDifficultyLevel;
  videoDurationMinutes?: number;
  enableLeaderboard?: boolean;
  customFormatPrompt?: string;
  analysis?: Partial<ModulAnalysisResult> | null;
  jumlahLatihanSoal?: number;
  jenisLatihanSoal?: 'pg' | 'essay' | 'campuran';
  customVideoUrl?: string;
  includeVideoSupport?: boolean;
}

export interface YoutubeSearchItem {
  id: string;
  url: string;
  title: string;
  channel: string;
  duration?: string;
  thumbnail?: string;
}

export async function searchYoutubeVideosApi(
  subject: string,
  topic: string
): Promise<YoutubeSearchItem[]> {
  try {
    const qs = new URLSearchParams({ subject: subject || '', topic: topic || '' });
    const res = await fetch(`/api/search-youtube?${qs.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.videos) && data.videos.length > 0) {
        return data.videos;
      }
    }
  } catch {
    // Fallback below
  }
  const fallback = resolveRelevantYoutubeVideo(subject, topic);
  return [
    {
      id: '',
      url: fallback.videoUrl,
      title: fallback.videoTitle,
      channel: fallback.videoChannel,
      duration: ''
    },
    ...fallback.alternativeVideos.map(v => ({
      id: v.id,
      url: v.url,
      title: v.title,
      channel: v.channel,
      duration: '',
      thumbnail: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`
    }))
  ];
}

export async function analyzeModulAjarApi(payload: {
  modulTitle?: string;
  subjectName?: string;
  grade?: string;
  cp?: string;
  metode?: string;
  alokasiWaktu?: string;
  contentJson?: any;
  rawText?: string;
}): Promise<ModulAnalysisResult> {
  return postApiWithFallback(['/api/analyze-modul'], payload);
}

export async function runMaterialCreativeAssistantApi(payload: {
  actionId: CreativeAssistantActionId;
  customInstruction?: string;
  subject: string;
  grade: string;
  topic: string;
  tingkatKesulitan: StudentDifficultyLevel;
  currentMaterialSummary: string;
  tujuanPembelajaran?: string[];
}): Promise<CreativeAssistantResponse> {
  return postApiWithFallback(['/api/material-assistant'], payload);
}

export async function generateMaterialApi(payload: GenerateMaterialPayload) {
  const isV2 = Array.isArray(payload.selectedFormats) && payload.selectedFormats.length > 0;
  const result = await postApiWithFallback(
    ['/api/generate-material', '/api/material', '/api/ai/material'],
    payload,
    70000
  );

  if (result && typeof result === 'object') {
    if (
      !result.videoUrl &&
      (!isV2 ||
        payload.includeVideoSupport !== false ||
        payload.selectedFormats?.includes('video_pembelajaran') ||
        payload.selectedFormats?.includes('web_pembelajaran'))
    ) {
      const resolved = resolveRelevantYoutubeVideo(
        payload.subject,
        payload.topic,
        payload.customVideoUrl || result.videoUrl
      );
      result.videoUrl = resolved.videoUrl;
      if (!result.videoTitle) result.videoTitle = resolved.videoTitle;
      if (!result.videoChannel) result.videoChannel = resolved.videoChannel;
    }
    if (!isV2 && !result.mediaType) {
      result.mediaType = 'both';
    }
  }
  return result;
}

export interface DifficultyTierConfig {
  count: number;
  points: number;
}

export interface DifficultyBreakdown {
  mudah: DifficultyTierConfig;
  sedang: DifficultyTierConfig;
  sukar: DifficultyTierConfig;
}

export async function generateQuestionsApi(payload: {
  topic: string;
  type: string;
  count: number;
  optionCount?: number;
  difficultyBreakdown?: DifficultyBreakdown;
}) {
  return postApiWithFallback(
    ['/api/generate-questions', '/api/questions', '/api/ai/questions'],
    payload,
    65000
  );
}

export async function gradeEssayApi(payload: { question: string; answerKey: string; studentAnswer: string }) {
  return postApiWithFallback(
    ['/api/grade-essay', '/api/grade', '/api/ai/grade-essay'],
    payload,
    45000
  );
}

export interface ModulAjarPayload {
  subject: string;
  cp: string;
  grade?: string;
  metode: string;
  pertemuanMetode?: string[];
  pertemuanCount: number;
  alokasiWaktu?: string;
  tanggalCetak?: string;
  namaGuru?: string;
  nipGuru?: string;
  namaSekolah?: string;
  npsn?: string;
  alamatSekolah?: string;
  tahunPelajaran?: string;
  semester?: string;
  namaKepsek?: string;
  nipKepsek?: string;
  customTujuanPembelajaran?: string;
}

export async function generateModulAjarApi(payload: ModulAjarPayload) {
  return postApiWithFallback(
    ['/api/generate-modul', '/api/modul', '/api/ai/modul'],
    payload,
    90000
  );
}

export interface CpSearchPayload {
  subject: string;
  fase?: string;
  keyword?: string;
  jenjang?: string;
}

export interface CpElementItem {
  namaElemen: string;
  deskripsiCp: string;
  materiPokok?: string[];
}

export interface CpPhaseItem {
  fase: string;
  kelas: string;
  judul: string;
  teksCp: string;
  fokusKompetensi?: string;
}

export interface CpSearchResult {
  mataPelajaran: string;
  jenjang?: string;
  fase?: string;
  dasarHukum: string;
  dokumenRujukanUrl?: string;
  capaianFaseUmum?: string;
  rasionalSingkat?: string;
  elemen?: CpElementItem[];
  capaianPerFase?: CpPhaseItem[];
}

export async function searchCpApi(payload: CpSearchPayload): Promise<CpSearchResult> {
  try {
    return await postApiWithFallback(
      ['/api/cp/search', '/api/search-cp'],
      payload,
      35000
    );
  } catch (err) {
    console.warn('[Search CP API] Gagal terhubung ke server, menggunakan basis data kurikulum BSKAP 046/2025:', err);
    return getCuratedCpDataset(payload.subject, payload.fase, payload.jenjang, payload.keyword);
  }
}
