import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { getCuratedCpDataset } from '../src/lib/cpDatabase';
import { resolveRelevantYoutubeVideo } from '../src/lib/youtubeLibrary';
import {
  buildAnalyzeModulPrompt,
  buildMultiFormatMaterialPrompt,
  buildCreativeAssistantPrompt
} from '../src/lib/bahanAjarPrompts';

export interface LiveYoutubeItem {
  id: string;
  url: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
}

export async function searchLiveYoutubeVideos(subject: string, topic: string): Promise<LiveYoutubeItem[]> {
  const cleanTopic = (topic || '').replace(/^Modul Ajar:\s*/i, '').trim();
  const cleanSubject = (subject || '').trim();
  const queries = [
    `${cleanTopic} ${cleanSubject} SMA pembelajaran`.trim(),
    `${cleanTopic} pembelajaran`.trim()
  ].filter(Boolean);

  for (let qi = 0; qi < queries.length; qi++) {
    const q = queries[qi];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), qi === 0 ? 2800 : 2000);
      const resp = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8'
          },
          signal: controller.signal
        }
      );
      clearTimeout(timer);
      if (!resp.ok) continue;
      const html = await resp.text();
      const match = html.match(/var ytInitialData = (\{.+?\});<\/script>/);
      if (!match) continue;

      const data = JSON.parse(match[1]);
      const sections =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
          ?.contents || [];
      const found: LiveYoutubeItem[] = [];
      const seen = new Set<string>();

      for (const sec of sections) {
        const items = sec?.itemSectionRenderer?.contents || [];
        for (const it of items) {
          const vr = it?.videoRenderer;
          if (!vr || !vr.videoId || seen.has(vr.videoId)) continue;
          const titleText =
            vr.title?.runs?.map((r: any) => r.text).join('') || vr.title?.simpleText || '';
          const channelText =
            vr.ownerText?.runs?.map((r: any) => r.text).join('') || 'YouTube Edukasi';
          const durationText = vr.lengthText?.simpleText || '';
          if (!titleText) continue;
          seen.add(vr.videoId);
          found.push({
            id: vr.videoId,
            url: `https://www.youtube.com/watch?v=${vr.videoId}`,
            title: titleText,
            channel: channelText,
            duration: durationText,
            thumbnail: `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`
          });
          if (found.length >= 6) break;
        }
        if (found.length >= 6) break;
      }

      if (found.length > 0) return found;
    } catch {
      // Try next query
    }
  }
  return [];
}

function isValidCustomVideoUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (!clean || clean.includes('dQw4w9WgXcQ') || clean.includes('search_query')) return false;
  const ytMatch = clean.match(
    /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return Boolean(
    (ytMatch && ytMatch[1]) ||
      clean.endsWith('.mp4') ||
      clean.endsWith('.webm') ||
      clean.startsWith('data:video/')
  );
}

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
    throw new Error('Gagal mengurai respon AI ke format JSON.');
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Timeout (${Math.round(timeoutMs / 1000)}d) pada ${label}`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function generateContentWithFallback(
  ai: GoogleGenAI,
  prompt: string,
  preferredThinking: ThinkingLevel = ThinkingLevel.LOW
) {
  const models = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  const attemptTimeoutMs = preferredThinking === ThinkingLevel.MEDIUM ? 45000 : 28000;
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const config: Record<string, any> = {
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingLevel: model === 'gemini-4-hydrogen' ? preferredThinking : ThinkingLevel.LOW
          }
        };
        const response = await withTimeout(
          ai.models.generateContent({
            model,
            contents: prompt,
            config
          }),
          attemptTimeoutMs,
          `${model} attempt ${attempt + 1}`
        );

        const text = response.text;
        if (text) {
          return parseJsonSafely(text);
        }
      } catch (err: any) {
        console.warn(`Model ${model} attempt ${attempt + 1} gagal atau sibuk:`, err?.message);
        lastError = err;
        const msgLower = String(err?.message || '').toLowerCase();
        const isUnavailable = err?.status === 503 || msgLower.includes('503') || msgLower.includes('unavailable') || msgLower.includes('high demand');
        const isNotFound = err?.status === 404 || msgLower.includes('404') || msgLower.includes('not found');
        const isQuotaOrRateLimit = err?.status === 429 || msgLower.includes('429') || msgLower.includes('quota') || msgLower.includes('resource_exhausted');
        const isTimeout = msgLower.includes('timeout');

        if (isNotFound || isQuotaOrRateLimit || isTimeout) {
          break;
        }
        if (isUnavailable && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('Gagal memproses permintaan ke AI Gemini.');
}

export async function handleMaterialGeneration(body: any, apiKey: string) {
  const {
    subject,
    grade,
    topic,
    description,
    selectedMeetingIndex,
    selectedFormats,
    tingkatKesulitan,
    videoDurationMinutes,
    enableLeaderboard,
    customFormatPrompt,
    analysis,
    jumlahLatihanSoal,
    jenisLatihanSoal,
    customVideoUrl,
    includeVideoSupport
  } = body || {};
  if (!subject || !grade || !topic) {
    throw new Error('Missing required fields: subject, grade, topic');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  const shouldResolveVideo =
    isValidCustomVideoUrl(customVideoUrl) ||
    includeVideoSupport !== false ||
    (Array.isArray(selectedFormats) &&
      (selectedFormats.includes('video_pembelajaran') ||
        selectedFormats.includes('web_pembelajaran')));

  if (Array.isArray(selectedFormats) && selectedFormats.length > 0) {
    const v2Prompt = buildMultiFormatMaterialPrompt({
      subject,
      grade,
      topic,
      description,
      selectedFormats,
      tingkatKesulitan: tingkatKesulitan || 'reguler',
      videoDurationMinutes,
      enableLeaderboard,
      customFormatPrompt,
      analysis,
      selectedMeetingIndex,
      jumlahLatihanSoal,
      jenisLatihanSoal
    });

    const [parsedData, liveVideos] = await Promise.all([
      generateContentWithFallback(ai, v2Prompt, ThinkingLevel.LOW),
      shouldResolveVideo && !isValidCustomVideoUrl(customVideoUrl)
        ? Promise.race([
            searchLiveYoutubeVideos(subject, topic),
            new Promise<LiveYoutubeItem[]>(resolve => setTimeout(() => resolve([]), 3500))
          ])
        : Promise.resolve([])
    ]);

    if (parsedData && typeof parsedData === 'object') {
      parsedData.version = 2;
      parsedData.selectedFormats = selectedFormats;
      if (typeof jumlahLatihanSoal === 'number') {
        parsedData.jumlahLatihanSoal = jumlahLatihanSoal;
      }
      if (jenisLatihanSoal) {
        parsedData.jenisLatihanSoal = jenisLatihanSoal;
      }

      if (isValidCustomVideoUrl(customVideoUrl)) {
        parsedData.videoUrl = customVideoUrl.trim();
        parsedData.videoTitle = parsedData.videoTitle || `Video Pembelajaran: ${topic}`;
        parsedData.videoChannel = 'Video Pilihan Guru';
        if (liveVideos.length > 0) parsedData.suggestedVideos = liveVideos;
      } else if (liveVideos.length > 0) {
        parsedData.videoUrl = liveVideos[0].url;
        parsedData.videoTitle = liveVideos[0].title;
        parsedData.videoChannel = liveVideos[0].channel;
        parsedData.suggestedVideos = liveVideos;
      } else if (
        selectedFormats.includes('video_pembelajaran') ||
        selectedFormats.includes('web_pembelajaran') ||
        includeVideoSupport
      ) {
        const resolved = resolveRelevantYoutubeVideo(subject, topic, parsedData.videoUrl);
        parsedData.videoUrl = resolved.videoUrl;
        if (!parsedData.videoTitle) parsedData.videoTitle = resolved.videoTitle;
        if (!parsedData.videoChannel) parsedData.videoChannel = resolved.videoChannel;
      }
    }
    return parsedData;
  }

  const fullTopic = topic + (description ? ` - Petunjuk Khusus Guru: ${description}` : '');

  const prompt = `Sebagai asisten guru ahli pembelajaran digital interaktif, menyenangkan (joyful, mindful, meaningful), dan gamifikasi edukatif untuk siswa SMA di SMAN 21 Garut:
Mata Pelajaran: ${subject}
Kelas/Tingkat: ${grade}
Capaian Pembelajaran / Topik: "${fullTopic}"

PERSYARATAN INTERAKTIVITAS & GAMIFIKASI:
Hasil bahan ajar HARUS sangat menarik dan mengajak siswa AKTIF, memuat elemen gamifikasi nyata (misi tantangan, XP, badge reward), peta konsep interaktif terstruktur, kuis pemantik, dan media visual.

Kembalikan respon DALAM FORMAT JSON MURNI yang valid dengan struktur persis berikut:
{
  "imageUrl": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80",
  "videoUrl": "URL video YouTube edukasi yang relevan",
  "mediaType": "both",
  "mindMap": ["Konsep Inti 1", "Konsep Inti 2", "Konsep Inti 3", "Aplikasi Nyata"],
  "funFact": "1 fakta mengejutkan / unik yang memicu rasa penasaran siswa SMA tentang topik ini.",
  "realWorldApplication": "Studi kasus / penerapan seru topik ini di kehidupan sehari-hari.",
  "materials": [
    { "title": "1. Pengantar Konsep & Analogi", "content": "Pembuka materi yang akrab dan mudah dipahami." },
    { "title": "2. Pembahasan Inti & Konsep Kunci", "content": "Penjelasan mendalam dengan poin-poin terstruktur." },
    { "title": "3. Tips Cepat Paham & Rangkuman", "content": "Ringkasan intisari materi." }
  ],
  "interactiveQuestions": [
    { "question": "Pertanyaan kuis 1?", "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"], "answer": "A", "explanation": "Penjelasan singkat." }
  ]
}`;

  const [parsed, liveVideos] = await Promise.all([
    generateContentWithFallback(ai, prompt, ThinkingLevel.LOW),
    Promise.race([
      searchLiveYoutubeVideos(subject, topic),
      new Promise<LiveYoutubeItem[]>(resolve => setTimeout(() => resolve([]), 3500))
    ])
  ]);
  if (parsed && typeof parsed === 'object') {
    if (liveVideos.length > 0) {
      parsed.videoUrl = liveVideos[0].url;
      parsed.videoTitle = liveVideos[0].title;
      parsed.videoChannel = liveVideos[0].channel;
      parsed.suggestedVideos = liveVideos;
    } else {
      const resolved = resolveRelevantYoutubeVideo(subject, topic, parsed.videoUrl);
      parsed.videoUrl = resolved.videoUrl;
      if (!parsed.videoTitle) parsed.videoTitle = resolved.videoTitle;
      if (!parsed.videoChannel) parsed.videoChannel = resolved.videoChannel;
    }
  }
  return parsed;
}

export async function handleAnalyzeModulGeneration(body: any, apiKey: string) {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
  const prompt = buildAnalyzeModulPrompt(body || {});
  return await generateContentWithFallback(ai, prompt, ThinkingLevel.LOW);
}

export async function handleMaterialAssistantGeneration(body: any, apiKey: string) {
  const {
    actionId,
    customInstruction,
    subject,
    grade,
    topic,
    tingkatKesulitan,
    currentMaterialSummary,
    tujuanPembelajaran
  } = body || {};
  if (!actionId || !subject || !topic) {
    throw new Error('Data konteks materi atau aksi asisten AI tidak lengkap.');
  }
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
  const prompt = buildCreativeAssistantPrompt({
    actionId,
    customInstruction,
    subject,
    grade: grade || 'X',
    topic,
    tingkatKesulitan: tingkatKesulitan || 'reguler',
    currentMaterialSummary: currentMaterialSummary || topic,
    tujuanPembelajaran: Array.isArray(tujuanPembelajaran) ? tujuanPembelajaran : []
  });
  return await generateContentWithFallback(ai, prompt, ThinkingLevel.LOW);
}

export async function handleQuestionsGeneration(body: any, apiKey: string) {
  const { topic, type, count, optionCount, difficultyBreakdown } = body || {};
  const mudahCount = Math.max(0, Number(difficultyBreakdown?.mudah?.count) || 0);
  const sedangCount = Math.max(0, Number(difficultyBreakdown?.sedang?.count) || 0);
  const sukarCount = Math.max(0, Number(difficultyBreakdown?.sukar?.count) || 0);
  const mudahPts = Math.max(1, Number(difficultyBreakdown?.mudah?.points) || 10);
  const sedangPts = Math.max(1, Number(difficultyBreakdown?.sedang?.points) || 20);
  const sukarPts = Math.max(1, Number(difficultyBreakdown?.sukar?.points) || 30);
  const breakdownTotal = mudahCount + sedangCount + sukarCount;
  const effectiveCount = breakdownTotal > 0 ? breakdownTotal : Number(count);

  if (!topic || !type || !effectiveCount) {
    throw new Error('Missing required fields: topic, type, count');
  }

  const numOptions = Math.min(5, Math.max(3, Number(optionCount) || 4));
  const optionLabels = Array.from({ length: numOptions }, (_, i) => String.fromCharCode(65 + i));
  const optionLabelsText = optionLabels.join(', ');
  const sampleOptionsJson = JSON.stringify(optionLabels.map(l => `Teks pilihan ${l}`));

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  const difficultyRules =
    breakdownTotal > 0
      ? `DISTRIBUSI TINGKAT KESUKARAN & POIN SOAL (WAJIB DIPATUHI TEPAT):
- Soal Tingkat "mudah" (Level Kognitif C1-C2 Mengingat/Memahami): TEPAT ${mudahCount} butir soal, masing-masing bernilai "points": ${mudahPts}
- Soal Tingkat "sedang" (Level Kognitif C3-C4 Mengaplikasi/Menganalisis): TEPAT ${sedangCount} butir soal, masing-masing bernilai "points": ${sedangPts}
- Soal Tingkat "sukar" (Level Kognitif C5-C6 Mengevaluasi/HOTS): TEPAT ${sukarCount} butir soal, masing-masing bernilai "points": ${sukarPts}
Susun berurutan dari Mudah -> Sedang -> Sukar dan pastikan jumlah totalnya TEPAT ${effectiveCount} butir soal.\n`
      : `Sertakan atribut "difficulty" ("mudah" | "sedang" | "sukar") dan "points" (angka poin proporsional) pada setiap butir soal.\n`;

  let prompt = `Sebagai asisten guru SMAN 21 Garut, buatkan paket soal evaluasi/ujian berkualitas tinggi, mendidik, dan jelas tentang materi: "${topic}".\n`;
  prompt += `Jumlah butir soal yang dibuat: Tepat ${effectiveCount} butir soal.\n`;
  prompt += `Jenis soal: ${type === 'pg' ? `Semua Pilihan Ganda (PG) dengan TEPAT ${numOptions} opsi jawaban (${optionLabelsText})` : type === 'essay' ? 'Semua Esai / Uraian Terbuka' : `Kombinasi Campuran (Pilihan Ganda dengan TEPAT ${numOptions} opsi jawaban (${optionLabelsText}) & Esai)`}.\n`;
  prompt += difficultyRules;
  prompt += `PENTING: Untuk setiap soal bertipe "pg", array "options" WAJIB berisi TEPAT ${numOptions} pilihan jawaban (${optionLabelsText}) tanpa awalan huruf di dalam teksnya.\n`;
  prompt += `Berikan respons DALAM FORMAT JSON ARRAY murni dengan struktur tiap item:\n`;
  prompt += `[\n`;
  prompt += `  {\n`;
  prompt += `    "type": "pg",\n`;
  prompt += `    "difficulty": "mudah",\n`;
  prompt += `    "points": ${mudahPts},\n`;
  prompt += `    "question": "Kalimat pertanyaan pilihan ganda yang jelas?",\n`;
  prompt += `    "options": ${sampleOptionsJson},\n`;
  prompt += `    "answer": "A",\n`;
  prompt += `    "explanation": "Penjelasan singkat jawaban yang tepat."\n`;
  prompt += `  },\n`;
  prompt += `  {\n`;
  prompt += `    "type": "essay",\n`;
  prompt += `    "difficulty": "sukar",\n`;
  prompt += `    "points": ${sukarPts},\n`;
  prompt += `    "question": "Kalimat pertanyaan esai pemahaman konsep?",\n`;
  prompt += `    "answerKey": "Kunci jawaban dan poin kriteria penilaian guru."\n`;
  prompt += `  }\n`;
  prompt += `]`;

  return await generateContentWithFallback(ai, prompt, ThinkingLevel.LOW);
}

export async function handleGradeEssayGeneration(body: any, apiKey: string) {
  const { question, answerKey, studentAnswer } = body || {};

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  const prompt = `Sebagai guru penilai ahli SMAN 21 Garut, nilai jawaban esai siswa berikut secara objektif dan mendidik.
Pertanyaan: "${question}"
Kunci Jawaban / Kriteria Guru: "${answerKey}"
Jawaban Siswa: "${studentAnswer || '(Tidak menjawab)'}"

Berikan penilaian dalam FORMAT JSON murni berikut:
{
  "score": (nilai angka bulat skala 0-100),
  "feedback": "Umpan balik konstruktif, apresiasi terhadap pemahaman siswa, dan poin mana yang perlu disempurnakan."
}`;

  return await generateContentWithFallback(ai, prompt);
}

export async function handleModulGeneration(body: any, apiKey: string) {
  const {
    subject,
    cp,
    grade,
    metode,
    pertemuanMetode,
    pertemuanCount,
    alokasiWaktu,
    tanggalCetak,
    namaGuru,
    nipGuru,
    namaSekolah,
    npsn,
    alamatSekolah,
    tahunPelajaran,
    semester,
    namaKepsek,
    nipKepsek
  } = body || {};

  if (!subject || !cp) {
    throw new Error('Mata pelajaran dan Capaian Pembelajaran wajib diisi.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  const schoolName = namaSekolah || 'SMAN 21 Garut';
  const schoolNpsn = npsn || '20209194';
  const schoolAddress = alamatSekolah || 'Jl. Raya Talegong No. 21, Kec. Talegong, Kab. Garut, Jawa Barat 44167';
  const teacherName = namaGuru || 'Guru Pengampu';
  const teacherNip = nipGuru || '-';
  const totalMeetings = Number(pertemuanCount) || 2;
  const timeAllocation = alokasiWaktu || '2 x 45 Menit (2 JP)';
  const methodChosen = metode || 'Problem-Based Learning (PBL)';
  const targetGrade = grade || 'Fase E (Kelas X)';
  const academicYear = tahunPelajaran || '2026/2027';
  const currentSemester = semester || 'Ganjil';
  const headmaster = namaKepsek || 'Agus Supriatna, S.Pd., M.Si.';
  const headmasterNip = nipKepsek || '';

  const meetingMethods: string[] = Array.isArray(pertemuanMetode) && pertemuanMetode.length > 0
    ? pertemuanMetode.slice(0, totalMeetings)
    : Array(totalMeetings).fill(methodChosen);

  while (meetingMethods.length < totalMeetings) {
    meetingMethods.push(methodChosen);
  }

  const meetingMethodsDesc = meetingMethods
    .map((m, idx) => `Pertemuan ${idx + 1}: ${m}`)
    .join('; ');

  const is5JP = (timeAllocation || '').includes('5 JP') || (timeAllocation || '').includes('5 jp') || (timeAllocation || '').includes('5 x 45');

  const prompt = `Anda adalah seorang ahli pengembang kurikulum nasional dan pakar Pembelajaran Mendalam (Deep Learning) serta Kurikulum Merdeka untuk jenjang SMA di ${schoolName}.
Tugas Anda adalah merancang "MODUL AJAR PEMBELAJARAN MENDALAM (DEEP LEARNING)" yang sangat komprehensif, operasional, berbobot tinggi, dan siap pakai.

DATA MASUKAN:
- Nama Satuan Pendidikan: ${schoolName}
- NPSN: ${schoolNpsn}
- Alamat Sekolah: ${schoolAddress}
- Nama Penyusun (Guru): ${teacherName}
- NIP/ID Guru: ${teacherNip}
- Kepala Sekolah: ${headmaster} ${headmasterNip ? `(NIP. ${headmasterNip})` : ''}
- Tahun Pelajaran: ${academicYear}
- Semester: ${currentSemester}
- Mata Pelajaran: ${subject}
- Fase / Kelas: ${targetGrade}
- Capaian Pembelajaran (CP): "${cp}"
- Jumlah Pertemuan: Tepat ${totalMeetings} Pertemuan
- Alokasi Waktu: ${timeAllocation}
- Metode Pembelajaran Tiap Pertemuan (Bisa Berbeda Tiap Pertemuan):
${meetingMethods.map((m, idx) => `  * Pertemuan ${idx + 1}: ${m}`).join('\n')}
${tanggalCetak ? `- Tanggal Cetak Modul / Titimangsa: ${tanggalCetak}` : ''}

ATURAN KHUSUS ALOKASI WAKTU:
${is5JP ? `CATATAN KHUSUS ALOKASI 5 JP (5 x 45 Menit):
Pada RINCIAN KEGIATAN PEMBELAJARAN:
- Pertemuan 1: alokasiWaktu adalah '2 JP (2 x 45 Menit = 90 Menit)' (Kegiatan Pendahuluan 15 Menit, Kegiatan Inti 60 Menit, Kegiatan Penutup 15 Menit).
- Pertemuan 2: alokasiWaktu adalah '3 JP (3 x 45 Menit = 135 Menit)' (Kegiatan Pendahuluan 15 Menit, Kegiatan Inti 105 Menit, Kegiatan Penutup 15 Menit).
(Jika ada pertemuan berikutnya, distribusikan secara proporsional).` : `Setiap pertemuan memiliki alokasi waktu ${timeAllocation}.`}

ATURAN KHUSUS METODE PEMBELAJARAN & SINTAKS PER PERTEMUAN:
Setiap pertemuan di array "pertemuan" HARUS memiliki metode tersendiri sesuai pilihan guru di atas:
${meetingMethods.map((m, idx) => `- Pertemuan ${idx + 1}: Wajib menerapkan sintaks resmi dari metode "${m}" pada Kegiatan Inti.`).join('\n')}

ATURAN KRUSIAL & WAJIB: KEGIATAN INTI & AKTIVITAS GURU (HARUS SANGAT DETAIL & MENGACU PADA MATERI SPESIFIK):
Pada bagian "kegiatanInti", setiap pertemuan memuat array "sintaks" sesuai metode yang digunakan.
Untuk SETIAP tahap sintaks:
1. DESKRIPSI "aktivitasGuru" HARUS SANGAT DETAIL (MINIMAL 3-5 KALIMAT KOMPREHENSIF) DAN MENGACU LANGSUNG PADA SUB-MATERI SPESIFIK:
   - DILARANG KERAS menggunakan kalimat generik/singkat seperti "Guru memfasilitasi diskusi", "Guru membimbing siswa", "Guru menjelaskan materi", atau "Guru memberikan LKPD".
   - Guru HARUS menguraikan secara konkret dan kontekstual:
     a) Konsep esensial sub-materi apa yang dipaparkan atau dimodelkan guru (sebutkan istilah teknis ilmiah, dalil/teori/rumus/prinsip/studi kasus nyata yang relevan dengan topik mata pelajaran "${subject}" dan CP "${cp}").
     b) Pertanyaan penuntun mendalam (scaffolding question) apa yang dilontarkan guru untuk menuntun alur berpikir logis peserta didik dan mencegah miskonsepsi pada materi tersebut.
     c) Langkah konkret guru saat mendemonstrasikan fenomena materi, menampilkan stimulus visual/data/studi kasus, atau membagikan bahan ajar terkait topik tersebut.
     d) Bagaimana guru berkeliling membimbing kelompok yang mengalami kesulitan (diferensiasi proses), mengecek pemahaman, serta memberikan konfirmasi dan penguatan konsep materi secara ilmiah.
2. DESKRIPSI "aktivitasSiswa" HARUS MENGGAMBARKAN AKSI EKSPLORATIF NYATA SISWA TERHADAP MATERI:
   - Menjabarkan secara operasional (minimal 3-4 kalimat) bagaimana siswa menganalisis data materi, berdiskusi membedah kasus materi dalam kelompok, menguji hipotesis konsep, dan menyusun solusi atau kesimpulan materi.
3. "fokusMendalam": Tuliskan fokus dimensi Deep Learning yang dicapai (misal: Mindful Critical Inquiry, Meaningful Conceptual Understanding, Joyful Collaboration, atau Diferensiasi Konten/Proses).

ATURAN RINCIAN KEGIATAN PENDAHULUAN DAN PENUTUP (WAJIB DIJABARKAN LENGKAP PADA SETIAP PERTEMUAN):
Kegiatan pendahuluan dan penutup pada setiap pertemuan HARUS dijabarkan secara rinci dan operasional, dengan langkah-langkah konkret:
- Pada "kegiatanPendahuluan" (durasi: 15 Menit):
  Wajib memuat minimal 6-7 langkah konkret yang operasional pada setiap pertemuan:
  1. Orientasi & Penumbuhan Budi Pekerti: Guru membuka pembelajaran dengan salam hangat, sapaan ramah, memimpin doa bersama siswa sesuai keyakinan, serta memeriksa kebersihan dan kerapian ruang kelas.
  2. Presensi & Kesiapan Belajar: Guru memeriksa kehadiran siswa dan mengecek kesiapan fisik serta psikologis peserta didik untuk belajar.
  3. Mindfulness / Ice Breaking (Joyful Learning): Guru memandu latihan kesadaran penuh (Mindfulness / Teknik STOP) atau ice breaking singkat yang menggembirakan untuk menumbuhkan fokus dan suasana belajar positif.
  4. Apersepsi Kontekstual: Guru mengaitkan materi prasyarat atau pengalaman belajar pertemuan sebelumnya dengan topik yang akan dipelajari hari ini.
  5. Pertanyaan Pemantik & Motivasi (Meaningful): Guru mengajukan pertanyaan pemantik kontekstual yang merangsang daya nalar kritis dan rasa ingin tahu siswa serta memaparkan manfaat nyata materi dalam kehidupan sehari-hari.
  6. Penyampaian Tujuan Pembelajaran & Alur Asesmen: Guru menyampaikan Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP) spesifik pertemuan ini, garis besar skenario aktivitas belajar, dan kriteria penilaian.
  7. Pembagian Kelompok & Kontrak Belajar: Guru mengondisikan pembagian kelompok belajar heterogen (diferensiasi proses) dan menyepakati kontrak/kesepakatan kelas yang saling menghargai.

- Pada "kegiatanPenutup" (durasi: 15 Menit):
  Wajib memuat minimal 5-6 langkah konkret yang operasional pada setiap pertemuan:
  1. Simpulan Bersama: Peserta didik bersama guru merangkum dan menyimpulkan poin-poin kunci serta konsep esensial yang telah dipelajari hari ini.
  2. Refleksi Terbimbing Peserta Didik (Metakognisi): Peserta didik melakukan refleksi terbimbing (apa yang telah dipahami, tantangan yang dihadapi, serta perasaan dan pengalaman bermakna selama pembelajaran).
  3. Asesmen Formatif Cepat (Check for Understanding / Exit Ticket): Guru memberikan evaluasi pemahaman mandiri singkat (1-2 soal kuis cepat atau lembar exit ticket) untuk memantau capaian belajar seluruh siswa.
  4. Apresiasi & Penguatan Positif Guru: Guru memberikan apresiasi dan umpan balik konstruktif atas usaha, kreativitas, dan kerja sama aktif seluruh peserta didik.
  5. Tindak Lanjut & Informasi Pertemuan Berikutnya: Guru memberikan arahan tindak lanjut (remedial/pengayaan) serta menginformasikan persiapan materi/tugas untuk pertemuan berikutnya.
  6. Doa Penutup & Salam: Pembelajaran ditutup dengan doa bersama penuh syukur dan salam penutup yang santun.

ATURAN DIMENSI PROFIL LULUSAN (8 DIMENSI LULUSAN):
Ganti dan hilangkan istilah "Dimensi Profil Pelajar Pancasila". Gunakan "Dimensi Profil Lulusan" yang wajib memuat 8 Dimensi Lulusan berikut secara lengkap dan kontekstual:
1. Keimanan dan Ketakwaan terhadap Tuhan Yang Maha Esa
2. Kewargaan
3. Penalaran Kritis
4. Kreativitas
5. Kolaborasi
6. Kemandirian
7. Kesehatan
8. Komunikasi

CATATAN: Hapus dan jangan tampilkan atribut "targetPesertaDidik".

WAJIB MENGEMBALIKAN RESPONS DALAM FORMAT JSON MURNI YANG VALID (tanpa pembuka markdown atau teks pengantar lain).
Gunakan struktur JSON berikut:
{
  "identitas": {
    "namaSekolah": "${schoolName}",
    "npsn": "${schoolNpsn}",
    "alamatSekolah": "${schoolAddress}",
    "namaGuru": "${teacherName}",
    "nipGuru": "${teacherNip}",
    "mataPelajaran": "${subject}",
    "fase": "${targetGrade}",
    "alokasiWaktu": "${timeAllocation}",
    "jumlahPertemuan": ${totalMeetings},
    "tahunPelajaran": "${academicYear}",
    "semester": "${currentSemester}",
    "namaKepsek": "${headmaster}",
    "nipKepsek": "${headmasterNip}",
    "metodeGabungan": "${meetingMethodsDesc}",
    "tanggalCetak": "${tanggalCetak || ''}"
  },
  "capaianPembelajaran": "${cp}",
  "elemenCp": "Elemen/Domain konten utama CP",
  "tujuanPembelajaran": [
    "TP operasional 1 terukur dengan KKO",
    "TP operasional 2 terukur dengan KKO",
    "TP operasional 3 terukur dengan KKO"
  ],
  "pemahamanBermakna": "Intisari pemahaman bermakna yang bertahan lama dan relevan dengan kehidupan sehari-hari siswa SMA",
  "pertanyaanPemantik": [
    "Pertanyaan terbuka menantang 1?",
    "Pertanyaan terbuka menantang 2?",
    "Pertanyaan terbuka menantang 3?"
  ],
  "dimensiProfilLulusan": [
    "Keimanan dan Ketakwaan terhadap Tuhan YME: Uraian kontekstual spiritual dan etika pada materi ini",
    "Kewargaan: Uraian kontekstual kepedulian sosial, kebangsaan, dan lingkungan",
    "Penalaran Kritis: Uraian analisis logis, pengolahan data, dan evaluasi solusi",
    "Kreativitas: Uraian pengembangan ide inovatif dan solusi orisinal",
    "Kolaborasi: Uraian kerja tim sinergis, gotong royong, dan komunikasi",
    "Kemandirian: Uraian regulasi diri, ketekunan, dan inisiatif belajar",
    "Kesehatan: Uraian kesejahteraan fisik-mental (well-being) dalam proses belajar",
    "Komunikasi: Uraian artikulasi gagasan, dialog santun, dan presentasi"
  ],
  "prinsipPembelajaranMendalam": {
    "mindful": "Penerapan berkesadaran penuh dalam proses belajar topik ini",
    "meaningful": "Keterkaitan topik dengan realitas dan solusi masalah nyata di lingkungan siswa",
    "joyful": "Aktivitas eksploratif interaktif yang membangun kegembiraan belajar"
  },
  "saranaPrasarana": {
    "media": ["Media digital, infografis, video interaktif, presentasi"],
    "alatBahan": ["Laptop, proyektor, smartphone, papan tulis, LKPD"],
    "sumberBelajar": ["Buku teks Kurikulum Merdeka, modul ajar digital, sumber artikel online terpercaya"]
  },
  "modelMetode": {
    "nama": "${meetingMethodsDesc}",
    "alasanPemilihan": "Alasan pedagogis mengapa metode-metode ini optimal untuk mencapai CP topik ini",
    "sintaksUtama": [
      "Tahap 1 sintaks metode",
      "Tahap 2 sintaks metode",
      "Tahap lanjutan"
    ]
  },
  "pertemuan": [
    {
      "nomor": 1,
      "topik": "Topik spesifik pertemuan 1",
      "metode": "${meetingMethods[0] || methodChosen}",
      "alokasiWaktu": "${is5JP ? '2 x 45 Menit (2 JP)' : timeAllocation}",
      "tujuanPertemuan": "Tujuan spesifik yang dicapai pada pertemuan 1",
      "kegiatanPendahuluan": {
        "durasi": "15 Menit",
        "langkah": [
          "Orientasi & Penumbuhan Budi Pekerti: Guru membuka pembelajaran dengan salam pembuka, menyapa peserta didik dengan hangat, dan mengajak salah satu peserta didik memimpin doa bersama sesuai keyakinan masing-masing.",
          "Presensi & Kesiapan Ruang: Guru memeriksa kebersihan, kerapian meja kursi, serta sirkulasi ruang kelas, dilanjutkan memeriksa presensi kehadiran dan kesiapan fisik-mental peserta didik.",
          "Mindfulness & Ice Breaking: Guru memandu latihan kesadaran penuh (Mindfulness / Teknik STOP) atau ice breaking singkat yang menggembirakan untuk memusatkan fokus belajar peserta didik.",
          "Apersepsi Kontekstual: Guru mengaitkan materi prasyarat atau pengalaman belajar sebelumnya dengan konsep materi yang akan dipelajari pada pertemuan ini melalui analogi konkret.",
          "Pertanyaan Pemantik & Motivasi: Guru melontarkan pertanyaan pemantik yang merangsang daya nalar kritis peserta didik dan menyampaikan manfaat praktis mempelajari materi ini dalam kehidupan sehari-hari.",
          "Penyampaian Tujuan & Asesmen: Guru menyampaikan Capaian Pembelajaran, Tujuan Pembelajaran (TP) spesifik hari ini, garis besar alur aktivitas, serta kriteria dan teknik penilaian yang akan diterapkan.",
          "Kontrak Belajar & Pembagian Kelompok: Guru mengondisikan pembagian kelompok belajar heterogen berdasarkan tingkat kesiapan belajar (diferensiasi) dan menegaskan kembali kesepakatan/kontrak kelas."
        ]
      },
      "kegiatanInti": {
        "durasi": "${is5JP ? '60 Menit' : '60 Menit'}",
        "metode": "${meetingMethods[0] || methodChosen}",
        "sintaks": [
          {
            "tahap": "Tahap 1 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Guru menayangkan video kontekstual/studi kasus nyata mengenai fenomena [sub-materi topik], kemudian memaparkan konsep kunci dan terminologi materi secara interaktif. Guru melontarkan pertanyaan penuntun (scaffolding): '[Pertanyaan mendalam guru terkait konsep materi]', membimbing siswa mencermati variabel permasalahan, serta membagikan LKPD terstruktur seraya memitigasi miskonsepsi awal pada materi tersebut.",
            "aktivitasSiswa": "Peserta didik mengamati tayangan stimulus materi dengan saksama (Mindful), mencatat data/fakta kunci, merespons pertanyaan penuntun guru dengan nalar kritis, dan berdiskusi awal bersama anggota kelompok untuk merumuskan masalah utama.",
            "fokusMendalam": "Mindful Critical Inquiry & Kontekstualisasi Materi"
          },
          {
            "tahap": "Tahap 2 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Guru mengorganisasikan peserta didik ke dalam kelompok belajar heterogen, menjelaskan pembagian peran, dan memberikan pengarahan langkah investigasi pada LKPD [topik materi]. Guru memfasilitasi kelompok yang memerlukan pendampingan khusus (diferensiasi proses) dan memastikan tiap kelompok memahami alur eksplorasi konsep materi.",
            "aktivitasSiswa": "Peserta didik berkumpul dalam kelompok, membagi peran kerja tim, membaca literatur materi dari buku teks dan modul digital, serta menyusun rencana penyelidikan masalah materi secara kolaboratif.",
            "fokusMendalam": "Joyful Collaboration & Diferensiasi Proses"
          },
          {
            "tahap": "Tahap 3 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Guru berkeliling memantau jalannya diskusi kelompok, mengajukan pertanyaan penuntun saat siswa mengolah data/analisis kasus materi, memberikan bimbingan proporsional agar siswa mampu mengaitkan teori materi dengan temuan data, serta mengecek ketelitian penalaran konsep tiap kelompok.",
            "aktivitasSiswa": "Peserta didik melakukan penyelidikan, mengolah data materi pada LKPD, mendiskusikan hubungan sebab-akibat antar-konsep, memvalidasi temuan dengan teori rujukan, dan merumuskan solusi alternatif atas masalah materi.",
            "fokusMendalam": "Meaningful Problem Solving & Penalaran Kritis"
          },
          {
            "tahap": "Tahap 4 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Guru mengundi atau menentukan urutan presentasi karya, menetapkan tata tertib forum diskusi kelas, memfasilitasi jalannya sesi tanya jawab antar-kelompok, serta mencatat poin-poin argumen dan pertanyaan penting siswa terkait pemahaman konsep materi.",
            "aktivitasSiswa": "Perwakilan kelompok mempresentasikan hasil analisis studi kasus materi di depan kelas secara percaya diri, sedangkan peserta didik dari kelompok lain menyimak aktif, memberikan tanggapan konstruktif, dan mengajukan pertanyaan kritis.",
            "fokusMendalam": "Komunikasi Efektif & Kolaborasi Reflektif"
          },
          {
            "tahap": "Tahap 5 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Guru membimbing peserta didik mengonfirmasi kesahihan analisis materi dari tiap kelompok, meluruskan miskonsepsi yang sempat muncul selama presentasi, memberikan penguatan ilmiah komprehensif atas dalil/konsep kunci materi, serta memvalidasi kesimpulan akhir pembelajaran.",
            "aktivitasSiswa": "Peserta didik menyimak penguatan konsep materi dari guru, menyelaraskan catatan hasil investigasi dengan konsep ilmiah yang benar, merefleksikan proses penyelidikan kelompok, dan menyepakati rumusan simpulan bersama.",
            "fokusMendalam": "Penguatan Konseptual & Metakognisi Mendalam"
          }
        ]
      },
      "kegiatanPenutup": {
        "durasi": "15 Menit",
        "langkah": [
          "Rangkuman & Simpulan Bersama: Peserta didik difasilitasi guru untuk merangkum dan menyimpulkan poin-poin kunci serta konsep esensial yang telah dipelajari.",
          "Refleksi Terbimbing Peserta Didik: Peserta didik melakukan refleksi metakognitif menjawab pertanyaan pemandu (apa hal paling bermakna yang dipelajari, tantangan diskusi kelompok, dan perasaan belajar hari ini).",
          "Asesmen Formatif Cepat (Exit Ticket): Guru memberikan lembar evaluasi pemahaman mandiri singkat (1-2 soal kuis cepat atau exit ticket) untuk mengecek ketuntasan konsep.",
          "Apresiasi & Penguatan Positif: Guru memberikan apresiasi dan umpan balik yang konstruktif atas kreativitas, keaktifan, dan kolaborasi seluruh peserta didik dan kelompok.",
          "Tindak Lanjut & Info Pertemuan Berikutnya: Guru memberikan arahan tindak lanjut (pengayaan/pendampingan remedial) serta menginformasikan topik materi dan persiapan untuk pertemuan berikutnya.",
          "Doa Penutup & Salam: Pembelajaran ditutup dengan rasa syukur dan doa bersama yang dipimpin perwakilan siswa serta salam penutup hangat dari guru."
        ]
      }
    }
  ],
  "asesmen": {
    "diagnostik": {
      "teknik": "Tes diagnostik non-kognitif (kesiapan belajar) dan kognitif awal",
      "instrumen": "Daftar pertanyaan apersepsi dan kuis diagnostik cepat"
    },
    "formatif": {
      "teknik": "Observasi proses diskusi, kinerja kelompok, dan penilaian LKPD",
      "instrumen": "Lembar observasi dan ceklis ketercapaian tugas",
      "fokus": "Memberikan umpan balik langsung selama proses penyelidikan dan kolaborasi"
    },
    "sumatif": {
      "teknik": "Penilaian unjuk kerja produk presentasi / tes tertulis berbasis studi kasus",
      "instrumen": "Rubrik penilaian komprehensif dan soal uraian analisis",
      "fokus": "Mengukur kedalaman pemahaman konseptual dan kemampuan pemecahan masalah"
    },
    "rubrik": [
      {
        "aspek": "Penguasaan Konsep & Analisis Masalah",
        "sangatMahir": "Mampu menjelaskan konsep secara akurat, mendalam, dan menghubungkan dengan solusi nyata tanpa bantuan",
        "mahir": "Mampu menjelaskan konsep dan menganalisis masalah dengan baik dan tepat",
        "berkembang": "Menjelaskan konsep secara parsial dan memerlukan sedikit arahan analisis",
        "perluBimbingan": "Belum mampu menjelaskan konsep dasar dan membutuhkan bimbingan intensif"
      },
      {
        "aspek": "Kolaborasi & Partisipasi Aktif",
        "sangatMahir": "Memimpin diskusi secara konstruktif, menghargai pendapat rekan, dan sangat proaktif",
        "mahir": "Berpartisipasi aktif dalam kelompok dan menyelesaikan tanggung jawab dengan baik",
        "berkembang": "Cukup aktif namun terkadang pasif dalam kerja sama",
        "perluBimbingan": "Kurang terlibat dalam kelompok dan pasif dalam diskusi"
      },
      {
        "aspek": "Kreativitas & Komunikasi Hasil",
        "sangatMahir": "Menyajikan solusi yang orisinal, argumentatif, dan komunikatif secara memukau",
        "mahir": "Menyajikan solusi dengan runtut, jelas, dan percaya diri",
        "berkembang": "Menyajikan hasil namun belum sistematis",
        "perluBimbingan": "Penyampaian belum jelas dan membutuhkan panduan penuh"
      }
    ]
  },
  "pengayaanRemedial": {
    "pengayaan": "Peserta didik yang telah mencapai ketuntasan diberikan tugas tantangan eksplorasi kasus lanjutan atau peran tutor sebaya.",
    "remedial": "Bimbingan terfokus pada indikator yang belum tuntas melalui peninjauan konsep kunci dan pendampingan khusus."
  },
  "refleksi": {
    "refleksiSiswa": [
      "Bagian materi mana yang paling menarik dan bermakna bagi kamu hari ini?",
      "Tantangan apa yang kamu hadapi dalam proses penyelidikan/diskusi, dan bagaimana kamu mengatasinya?",
      "Bagaimana konsep ini dapat kamu terapkan dalam kehidupan sehari-harimu?"
    ],
    "refleksiGuru": [
      "Apakah seluruh peserta didik terlibat aktif dan antusias dalam pembelajaran mendalam hari ini?",
      "Apakah sintaks metode pembelajaran berjalan sesuai alokasi waktu yang direncanakan?",
      "Langkah apa yang perlu diperbaiki untuk pertemuan berikutnya agar pembelajaran lebih efektif?"
    ]
  },
  "lampiran": {
    "lkpd": {
      "judul": "Lembar Kerja Peserta Didik (LKPD) Pembelajaran Mendalam",
      "petunjuk": "Bacalah setiap instruksi dengan cermat, diskusikan secara kolaboratif dalam kelompok, dan rumuskan solusi terbaik.",
      "tugasLangkah": [
        "1. Cermati stimulus/studi kasus kontekstual yang disajikan.",
        "2. Identifikasi rumusan masalah dan fakta-fakta kunci.",
        "3. Kumpulkan data dan lakukan analisis mendalam.",
        "4. Rumuskan solusi inovatif dan susun bahan presentasi kelompok."
      ],
      "studiKasusSoal": "Tuliskan studi kasus nyata yang menarik dan relevan dengan topik ini yang menantang nalar kritis siswa SMA."
    },
    "bahanBacaan": "Uraian ringkas bahan bacaan guru dan siswa mengenai esensi konsep materi, prinsip dasar, dan keterkaitannya dengan kehidupan.",
    "glosarium": [
      {
        "istilah": "Istilah kunci 1",
        "definisi": "Definisi istilah kunci 1"
      },
      {
        "istilah": "Istilah kunci 2",
        "definisi": "Definisi istilah kunci 2"
      }
    ],
    "daftarPustaka": [
      "Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi. (2024). Buku Panduan Guru dan Buku Siswa SMA. Jakarta: Pusat Perbukuan.",
      "Jurnal dan artikel ilmiah pembelajaran terkini yang relevan dengan topik."
    ]
  }
}

PASTIKAN seluruh array pertemuan berjumlah ${totalMeetings} item, dengan alur runtut dari Pertemuan 1 sampai Pertemuan ${totalMeetings}.`;

  return await generateContentWithFallback(ai, prompt, ThinkingLevel.MEDIUM);
}

export async function handleCpSearchGeneration(body: any, apiKey: string) {
  const { subject, fase, keyword, jenjang } = body || {};
  if (!subject) {
    throw new Error('Mata pelajaran wajib diisi.');
  }

  const targetJenjang = jenjang || 'SMA / MA (Sekolah Menengah Atas)';
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  const prompt = `Anda adalah pakar kurikulum nasional Kementerian Pendidikan Dasar dan Menengah RI yang menguasai naskah regulasi resmi terbaru:
"Keputusan Kepala Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP) Kementerian Pendidikan Dasar dan Menengah Nomor 046/H/KR/2025 tentang Capaian Pembelajaran pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah pada Kurikulum Merdeka".
Dokumen rujukan tersimpan pada: https://vtjtunvkoicwdugnifxi.supabase.co/storage/v1/object/public/cp-documents/KepKaBSKAP-046_2025-ttg-CP.pdf.

Tugas Anda:
Lakukan penelusuran dan ekstraksi Capaian Pembelajaran (CP) otentik, presisi, dan mutlak sesuai naskah regulasi BSKAP 046/H/KR/2025:
- Jenjang Sekolah: ${targetJenjang}
- Mata Pelajaran: ${subject}
- Fase yang Dicari: ${fase || 'Sesuai jenjang'}
- Kata Kunci / Fokus Topik: ${keyword || 'Capaian Pembelajaran'}

Berikan output WAJIB HANYA berupa JSON valid dengan format persis:
{
  "mataPelajaran": "${subject}",
  "jenjang": "${targetJenjang}",
  "fase": "${fase || 'Fase Terkait'}",
  "dasarHukum": "Keputusan Kepala BSKAP No. 046/H/KR/2025",
  "dokumenRujukanUrl": "https://vtjtunvkoicwdugnifxi.supabase.co/storage/v1/object/public/cp-documents/KepKaBSKAP-046_2025-ttg-CP.pdf",
  "capaianFaseUmum": "Teks resmi Capaian Pembelajaran umum pada akhir fase yang dicari sesuai naskah KepKa BSKAP 046/2025...",
  "rasionalSingkat": "Rasional dan tujuan ringkas mata pelajaran ini...",
  "elemen": [
    {
      "namaElemen": "Nama Elemen Resmi (sesuai naskah BSKAP 046/2025)",
      "deskripsiCp": "Teks deskripsi capaian pembelajaran elemen ini...",
      "materiPokok": ["Topik / Ruang Lingkup 1", "Topik / Ruang Lingkup 2"]
    }
  ],
  "capaianPerFase": [
    {
      "fase": "Nama Fase (misal: Fase E atau Fase D atau Fase A/B/C)",
      "kelas": "Tingkat Kelas",
      "judul": "Capaian Pembelajaran ${subject} Fase ...",
      "teksCp": "Teks lengkap dan otentik Capaian Pembelajaran pada akhir fase ini sesuai naskah resmi BSKAP 046/2025...",
      "fokusKompetensi": "Ringkasan ruang lingkup kompetensi utama fase ini (1-2 kalimat padat)."
    }
  ]
}
Pastikan array 'elemen' dan 'capaianPerFase' selalu terisi data array valid.`;

  let parsedData: any = null;
  try {
    parsedData = await generateContentWithFallback(ai, prompt);
  } catch (aiErr: any) {
    console.warn('AI search CP mengalami gangguan/503 di serverless, beralih ke data kurikulum BSKAP 046/2025:', aiErr?.message);
    return getCuratedCpDataset(subject, fase, targetJenjang, keyword);
  }

  return {
    mataPelajaran: parsedData?.mataPelajaran || subject,
    jenjang: parsedData?.jenjang || targetJenjang,
    fase: parsedData?.fase || fase || 'Fase Terkait',
    dasarHukum: parsedData?.dasarHukum || 'Keputusan Kepala BSKAP No. 046/H/KR/2025',
    dokumenRujukanUrl: parsedData?.dokumenRujukanUrl || 'https://vtjtunvkoicwdugnifxi.supabase.co/storage/v1/object/public/cp-documents/KepKaBSKAP-046_2025-ttg-CP.pdf',
    capaianFaseUmum: parsedData?.capaianFaseUmum || parsedData?.capaianPerFase?.[0]?.teksCp || '',
    rasionalSingkat: parsedData?.rasionalSingkat || '',
    elemen: Array.isArray(parsedData?.elemen) && parsedData.elemen.length > 0
      ? parsedData.elemen
      : getCuratedCpDataset(subject, fase, targetJenjang, keyword).elemen,
    capaianPerFase: Array.isArray(parsedData?.capaianPerFase) && parsedData.capaianPerFase.length > 0
      ? parsedData.capaianPerFase
      : getCuratedCpDataset(subject, fase, targetJenjang, keyword).capaianPerFase,
  };
}
