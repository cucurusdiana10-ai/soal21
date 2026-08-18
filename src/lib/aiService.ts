import { GoogleGenAI } from '@google/genai';

function parseJsonSafely(text: string) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

// Client-side fallback if backend API route is unreachable or hosted on static SPA
async function clientFallbackGenerateMaterial(subject: string, grade: string, topic: string, description?: string) {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Server backend tidak dapat dihubungi. Pastikan server aktif atau GEMINI_API_KEY tersedia.');
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

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    }
  });

  const text = response.text;
  if (!text) throw new Error('Respon kosong dari AI Gemini.');
  return parseJsonSafely(text);
}

export async function generateMaterialApi(payload: { subject: string; grade: string; topic: string; description?: string }) {
  const res = await fetch('/api/generate-material', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const contentType = res.headers.get('content-type') || '';
  const rawText = await res.text();

  if (!res.ok) {
    if (contentType.includes('application/json')) {
      try {
        const errJson = JSON.parse(rawText);
        throw new Error(errJson.error || `Server error: ${res.status}`);
      } catch (e: any) {
        if (e.message && !e.message.startsWith('Unexpected token')) throw e;
      }
    }
    // Attempt client fallback if available
    try {
      return await clientFallbackGenerateMaterial(payload.subject, payload.grade, payload.topic, payload.description);
    } catch {
      throw new Error(`Server error (${res.status}): ${rawText.slice(0, 120)}`);
    }
  }

  if (contentType.includes('application/json')) {
    return JSON.parse(rawText);
  } else {
    return parseJsonSafely(rawText);
  }
}

export async function generateQuestionsApi(payload: { topic: string; type: string; count: number }) {
  try {
    const res = await fetch('/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();

    if (!res.ok) {
      if (contentType.includes('application/json')) {
        try {
          const errJson = JSON.parse(rawText);
          throw new Error(errJson.error || `Server error: ${res.status}`);
        } catch {
          // ignore
        }
      }
      throw new Error(`Server error (${res.status}): Gagal meracik soal dari backend.`);
    }

    return parseJsonSafely(rawText);
  } catch (err: any) {
    throw new Error(err.message || 'Gagal meracik soal dari AI.');
  }
}

export async function gradeEssayApi(payload: { question: string; answerKey: string; studentAnswer: string }) {
  try {
    const res = await fetch('/api/grade-essay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();

    if (!res.ok) {
      if (contentType.includes('application/json')) {
        try {
          const errJson = JSON.parse(rawText);
          throw new Error(errJson.error || `Server error: ${res.status}`);
        } catch {
          // ignore
        }
      }
      throw new Error(`Server error (${res.status}): Gagal koreksi AI.`);
    }

    return parseJsonSafely(rawText);
  } catch (err: any) {
    throw new Error(err.message || 'Gagal melakukan koreksi AI.');
  }
}
