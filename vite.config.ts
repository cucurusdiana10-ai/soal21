import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
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

function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function apiDevPlugin(): Plugin {
  return {
    name: 'api-gemini-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];

        if (req.method === 'POST' && url === '/api/generate-material') {
          res.setHeader('Content-Type', 'application/json');
          try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: 'GEMINI_API_KEY belum disetel di server environment.' }));
            }

            const body = await readBody(req);
            const { subject, grade, topic, description } = body;
            if (!subject || !grade || !topic) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Data subject, grade, dan topic wajib diisi.' }));
            }

            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
            });
            const fullTopic = topic + (description ? ` - Petunjuk Khusus Guru: ${description}` : '');

            const prompt = `Sebagai asisten guru ahli pembelajaran digital interaktif dan menyenangkan untuk siswa SMA di SMAN 21 Garut, buatkan bahan ajar interaktif, seru, dan mudah dipahami untuk:
Mata Pelajaran: ${subject}
Kelas/Tingkat: ${grade}
Capaian Pembelajaran / Topik: "${fullTopic}"

Kembalikan respon DALAM FORMAT JSON MURNI yang valid dengan struktur persis berikut:
{
  "imageUrl": "URL foto Unsplash berkualitas tinggi dan relevan dengan topik, contoh: https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80",
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

            const response = await ai.models.generateContent({
              model: 'gemini-3.7-flash',
              contents: prompt,
              config: { responseMimeType: 'application/json' }
            });

            const text = response.text;
            if (!text) throw new Error('Tidak ada respon teks dari AI Gemini.');
            const parsed = parseJsonSafely(text);
            return res.end(JSON.stringify(parsed));
          } catch (err: any) {
            console.error('Error in /api/generate-material:', err);
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: err.message || 'Gagal meracik bahan ajar AI.' }));
          }
        }

        if (req.method === 'POST' && url === '/api/generate-questions') {
          res.setHeader('Content-Type', 'application/json');
          try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: 'GEMINI_API_KEY belum disetel di server environment.' }));
            }

            const body = await readBody(req);
            const { topic, type, count } = body;
            if (!topic || !type || !count) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Missing required fields: topic, type, count' }));
            }

            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
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

            const response = await ai.models.generateContent({
              model: 'gemini-3.7-flash',
              contents: prompt,
              config: { responseMimeType: 'application/json' }
            });

            const text = response.text;
            if (!text) throw new Error('Tidak ada respon dari AI');
            const parsed = parseJsonSafely(text);
            return res.end(JSON.stringify(parsed));
          } catch (err: any) {
            console.error('Error in /api/generate-questions:', err);
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: err.message || 'Gagal meracik soal dari AI.' }));
          }
        }

        if (req.method === 'POST' && url === '/api/grade-essay') {
          res.setHeader('Content-Type', 'application/json');
          try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: 'GEMINI_API_KEY belum disetel di server environment.' }));
            }

            const body = await readBody(req);
            const { question, answerKey, studentAnswer } = body;

            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
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

            const response = await ai.models.generateContent({
              model: 'gemini-3.7-flash',
              contents: prompt,
              config: { responseMimeType: 'application/json' }
            });

            const text = response.text;
            if (!text) throw new Error('Empty response from AI');
            return res.end(JSON.stringify(parseJsonSafely(text)));
          } catch (err: any) {
            console.error('Error in /api/grade-essay:', err);
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: err.message || 'Failed to grade essay' }));
          }
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
