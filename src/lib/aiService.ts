import { GoogleGenAI } from '@google/genai';

function parseJsonSafely(text: string) {
  if (!text) throw new Error('Respon kosong');
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
    throw new Error('Gagal mengurai format respon.');
  }
}

// Client-side fallback if backend API route is unreachable
async function clientFallbackGenerateMaterial(subject: string, grade: string, topic: string, description?: string) {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Server backend mengalami kendala atau GEMINI_API_KEY belum terpasang.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const fullTopic = topic + (description ? ` - Petunjuk Khusus Guru: ${description}` : '');
  
  const prompt = `Sebagai asisten guru ahli pembelajaran digital interaktif dan menyenangkan untuk siswa SMA di SMAN 21 Garut, buatkan bahan ajar interaktif, seru, dan mudah dipahami untuk:
Mata Pelajaran: ${subject}
Kelas/Tingkat: ${grade}
Capaian Pembelajaran / Topik: "${fullTopic}"

Kembalikan respon DALAM FORMAT JSON MURNI yang valid dengan struktur persis berikut:
{
  "imageUrl": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80",
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "mediaType": "both",
  "mindMap": ["Konsep Inti 1", "Konsep Inti 2", "Konsep Inti 3", "Aplikasi Nyata"],
  "funFact": "1 fakta mengejutkan / unik tentang topik ini.",
  "realWorldApplication": "Studi kasus / penerapan seru topik ini di kehidupan sehari-hari.",
  "materials": [
    { "title": "1. Pengantar Konsep & Cerita / Analogi Seru", "content": "Penjelasan pembuka..." },
    { "title": "2. Pembahasan Inti & Konsep Kunci", "content": "Penjelasan mendalam..." },
    { "title": "3. Tips Cepat Paham & Rangkuman", "content": "Ringkasan intisari..." }
  ],
  "interactiveQuestions": [
    {
      "question": "Pertanyaan pancingan 1?",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "answer": "A",
      "explanation": "Penjelasan mengapa benar."
    }
  ]
}`;

  for (const model of ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const text = response.text;
      if (text) return parseJsonSafely(text);
    } catch {
      // try next
    }
  }
  throw new Error('Gagal meracik bahan ajar dari AI.');
}

// Client-side fallback for generating questions
async function clientFallbackGenerateQuestions(topic: string, type: string, count: number) {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Server backend mengalami kendala atau GEMINI_API_KEY belum terpasang.');
  }

  const ai = new GoogleGenAI({ apiKey });
  let prompt = `Sebagai asisten guru SMAN 21 Garut, buatkan paket soal evaluasi/ujian berkualitas tinggi, mendidik, dan jelas tentang materi: "${topic}".\n`;
  prompt += `Jumlah butir soal yang dibuat: Tepat ${count} butir soal.\n`;
  prompt += `Jenis soal: ${type === 'pg' ? 'Semua Pilihan Ganda (PG) 4 opsi (A, B, C, D)' : type === 'essay' ? 'Semua Esai / Uraian Terbuka' : 'Kombinasi Campuran (Pilihan Ganda & Esai)'}.\n`;
  prompt += `Berikan respons DALAM FORMAT JSON ARRAY murni dengan struktur tiap item:\n`;
  prompt += `[\n`;
  prompt += `  {\n`;
  prompt += `    "type": "pg",\n`;
  prompt += `    "question": "Kalimat pertanyaan pilihan ganda yang jelas?",\n`;
  prompt += `    "options": ["Teks pilihan A", "Teks pilihan B", "Teks pilihan C", "Teks pilihan D"],\n`;
  prompt += `    "answer": "A",\n`;
  prompt += `    "explanation": "Penjelasan singkat jawaban yang tepat."\n`;
  prompt += `  },\n`;
  prompt += `  {\n`;
  prompt += `    "type": "essay",\n`;
  prompt += `    "question": "Kalimat pertanyaan esai pemahaman konsep?",\n`;
  prompt += `    "answerKey": "Kunci jawaban dan poin kriteria penilaian guru."\n`;
  prompt += `  }\n`;
  prompt += `]`;

  for (const model of ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const text = response.text;
      if (text) return parseJsonSafely(text);
    } catch {
      // try next
    }
  }
  throw new Error('Gagal meracik soal dari AI.');
}

async function postApiWithFallback(endpoints: string[], payload: any, clientFallback?: () => Promise<any>) {
  let lastErrorMsg = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const contentType = res.headers.get('content-type') || '';
        const rawText = await res.text();

        if (res.ok) {
          if (contentType.includes('application/json')) {
            try {
              return JSON.parse(rawText);
            } catch {
              return parseJsonSafely(rawText);
            }
          } else {
            return parseJsonSafely(rawText);
          }
        }

        if (res.status === 405) {
          lastErrorMsg = 'Server sedang proses pemanasan rute (405). Silakan ulangi dalam beberapa detik.';
        } else if (contentType.includes('application/json')) {
          try {
            const errJson = JSON.parse(rawText);
            if (errJson.error) lastErrorMsg = errJson.error;
            else lastErrorMsg = `Server error (${res.status})`;
          } catch {
            lastErrorMsg = `Server error (${res.status})`;
          }
        } else {
          lastErrorMsg = `Server error (${res.status})`;
        }
      } catch (err: any) {
        lastErrorMsg = err.message || 'Koneksi gagal.';
      }
    }

    // Small delay before retry if 405 or initial failure
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (clientFallback) {
    try {
      return await clientFallback();
    } catch {
      // ignore
    }
  }

  throw new Error(lastErrorMsg || 'Gagal memproses permintaan ke server AI.');
}

export async function generateMaterialApi(payload: { subject: string; grade: string; topic: string; description?: string }) {
  return postApiWithFallback(
    ['/api/generate-material', '/api/ai/material', '/api/material'],
    payload,
    () => clientFallbackGenerateMaterial(payload.subject, payload.grade, payload.topic, payload.description)
  );
}

export async function generateQuestionsApi(payload: { topic: string; type: string; count: number }) {
  return postApiWithFallback(
    ['/api/generate-questions', '/api/ai/questions'],
    payload,
    () => clientFallbackGenerateQuestions(payload.topic, payload.type, payload.count)
  );
}

export async function gradeEssayApi(payload: { question: string; answerKey: string; studentAnswer: string }) {
  return postApiWithFallback(
    ['/api/grade-essay', '/api/ai/grade-essay'],
    payload
  );
}

export interface ModulAjarPayload {
  subject: string;
  cp: string;
  grade?: string;
  metode: string;
  pertemuanCount: number;
  alokasiWaktu?: string;
  namaGuru?: string;
  nipGuru?: string;
  namaSekolah?: string;
  npsn?: string;
  alamatSekolah?: string;
  tahunPelajaran?: string;
  semester?: string;
  namaKepsek?: string;
}

export async function generateModulAjarApi(payload: ModulAjarPayload) {
  return postApiWithFallback(
    ['/api/generate-modul', '/api/ai/modul'],
    payload
  );
}

