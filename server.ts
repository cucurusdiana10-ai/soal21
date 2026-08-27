import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
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

// Resilient Gemini Generation with Model Fallback
async function generateContentWithFallback(ai: GoogleGenAI, prompt: string) {
  const models = ['gemini-3.6-flash', 'gemini-3.7-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const text = response.text;
      if (text) {
        return parseJsonSafely(text);
      }
    } catch (err: any) {
      console.warn(`Model ${model} failed, trying next fallback:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Gagal memproses permintaan ke AI Gemini.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // API Route for Gemini AI Material Generation
  app.post('/api/generate-material', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing.' });
      }

      const { subject, grade, topic, description } = req.body;
      if (!subject || !grade || !topic) {
        return res.status(400).json({ error: 'Missing required fields: subject, grade, topic' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      const fullTopic = topic + (description ? ` - Petunjuk Khusus Guru: ${description}` : '');
      
      const prompt = `Sebagai asisten guru ahli pembelajaran digital interaktif dan menyenangkan untuk siswa SMA di SMAN 21 Garut, buatkan bahan ajar interaktif, seru, dan mudah dipahami untuk:
Mata Pelajaran: ${subject}
Kelas/Tingkat: ${grade}
Capaian Pembelajaran / Topik: "${fullTopic}"

Bahan ajar harus memuat elemen visual/media (Gambar dan/atau Rekomendasi Video Pembelajaran YouTube yang relevan).
Kembalikan respon DALAM FORMAT JSON MURNI yang valid dengan struktur persis berikut:
{
  "imageUrl": "URL foto Unsplash berkualitas tinggi dan relevan dengan topik, contoh: https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80",
  "videoUrl": "URL video pembelajaran YouTube yang relevan dengan topik (contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ atau https://youtu.be/xxx atau link embed edukasi sains/matematika/sosial relevan)",
  "mediaType": "both",
  "mindMap": [
    "Konsep Inti 1",
    "Konsep Inti 2",
    "Konsep Inti 3",
    "Aplikasi Nyata"
  ],
  "funFact": "1 fakta mengejutkan / unik / 'tahukah kamu' yang memicu rasa penasaran siswa SMA tentang topik ini.",
  "realWorldApplication": "Studi kasus / penerapan seru topik ini di kehidupan sehari-hari atau dunia kerja/teknologi.",
  "materials": [
    {
      "title": "1. Pengantar Konsep & Cerita / Analogi Seru",
      "content": "Jelaskan pembuka materi dengan bahasa akrab siswa SMA, gunakan analogi kehidupan sehari-hari yang mudah diingat."
    },
    {
      "title": "2. Pembahasan Inti & Konsep Kunci",
      "content": "Penjelasan mendalam, lengkap dengan poin-poin terstruktur, definisi, dan contoh konkret."
    },
    {
      "title": "3. Tips Cepat Paham & Rangkuman",
      "content": "Cara mudah mengingat / mnemonik / ringkasan intisari materi agar siswa tidak mudah lupa."
    }
  ],
  "interactiveQuestions": [
    {
      "question": "Pertanyaan pancingan / kuis pemahaman 1?",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "answer": "A",
      "explanation": "Penjelasan ringkas mengapa jawaban ini benar."
    },
    {
      "question": "Pertanyaan pancingan / kuis pemahaman 2?",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "answer": "B",
      "explanation": "Penjelasan ringkas mengapa jawaban ini benar."
    }
  ]
}`;

      const parsedData = await generateContentWithFallback(ai, prompt);
      res.json(parsedData);
    } catch (error: any) {
      console.error('Error generating material:', error);
      res.status(500).json({ error: error.message || 'Gagal meracik bahan ajar AI' });
    }
  });

  // API Route for Gemini AI Question Generation
  app.post('/api/generate-questions', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing.' });
      }

      const { topic, type, count } = req.body;
      if (!topic || !type || !count) {
        return res.status(400).json({ error: 'Missing required fields: topic, type, count' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      
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

      const parsedData = await generateContentWithFallback(ai, prompt);
      res.json(parsedData);
    } catch (error: any) {
      console.error('Error generating questions:', error);
      res.status(500).json({ error: error.message || 'Gagal meracik soal dari AI' });
    }
  });

  // API Route for Gemini AI Essay Grading
  app.post('/api/grade-essay', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing.' });
      }

      const { question, answerKey, studentAnswer } = req.body;
      
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      
      const prompt = `Sebagai guru SMAN 21 Garut yang bijak dan teliti, tolong koreksi jawaban esai siswa berikut.
Pertanyaan: ${question}
Kunci Jawaban yang Diharapkan: ${answerKey}
Jawaban Siswa: ${studentAnswer}

Berikan penilaian dalam format JSON dengan struktur:
{
  "score": <angka_0_sampai_100_untuk_soal_ini>,
  "feedback": "<komentar_pendek_memotivasi_mengapa_nilainya_demikian>"
}`;

      const parsedData = await generateContentWithFallback(ai, prompt);
      res.json(parsedData);
    } catch (error: any) {
      console.error('Error grading essay:', error);
      res.status(500).json({ error: error.message || 'Failed to grade essay' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
