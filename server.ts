import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

      const ai = new GoogleGenAI({ apiKey });
      const fullTopic = topic + (description ? ` - Petunjuk Khusus Guru: ${description}` : '');
      
      const prompt = `Sebagai asisten guru SMAN 21 Garut, buatkan bahan ajar interaktif untuk mata pelajaran ${subject} Kelas ${grade} dengan Capaian Pembelajaran/Topik: "${fullTopic}".
      Berikan respons dalam format JSON dengan struktur:
      {
        "imageUrl": "URL gambar Unsplash berkualitas tinggi yang relevan, contoh: https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80",
        "mindMap": ["Konsep 1", "Konsep 2", "Konsep 3"],
        "materials": [
          { "title": "Submateri 1", "content": "Penjelasan detail yang interaktif untuk siswa SMA..." },
          { "title": "Submateri 2", "content": "Penjelasan..." }
        ],
        "interactiveQuestions": [
          { "question": "Pertanyaan pancingan 1", "options": ["A", "B", "C", "D"], "answer": "A" }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('Empty response from AI');
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error('Error generating material:', error);
      res.status(500).json({ error: error.message || 'Failed to generate material' });
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

      const ai = new GoogleGenAI({ apiKey });
      
      let prompt = `Sebagai asisten guru SMAN 21 Garut, buatkan soal ujian tentang: "${topic}".\n`;
      prompt += `Jumlah soal: ${count}\n`;
      prompt += `Jenis soal: ${type === 'pg' ? 'Pilihan Ganda' : type === 'essay' ? 'Esai' : 'Campuran (Pilihan Ganda & Esai)'}\n`;
      prompt += `Berikan respons dalam format JSON dengan struktur array of objects:\n`;
      prompt += `[\n`;
      prompt += `  { "type": "pg", "question": "Soal PG 1?", "options": ["A", "B", "C", "D"], "answer": "A" },\n`;
      prompt += `  { "type": "essay", "question": "Soal Esai 1?", "answerKey": "Kunci jawaban yang diharapkan" }\n`;
      prompt += `]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('Empty response from AI');
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error('Error generating questions:', error);
      res.status(500).json({ error: error.message || 'Failed to generate questions' });
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
      
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Sebagai guru, tolong koreksi jawaban esai siswa berikut.
Pertanyaan: ${question}
Kunci Jawaban yang Diharapkan: ${answerKey}
Jawaban Siswa: ${studentAnswer}

Berikan penilaian dalam format JSON dengan struktur:
{
  "score": <angka_0_sampai_100_untuk_soal_ini>,
  "feedback": "<komentar_pendek_memotivasi_mengapa_nilainya_demikian>"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const text = response.text;
      if (!text) throw new Error('Empty response from AI');
      res.json(JSON.parse(text));
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
