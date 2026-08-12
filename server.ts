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

      const { subject, grade, topic } = req.body;
      if (!subject || !grade || !topic) {
        return res.status(400).json({ error: 'Missing required fields: subject, grade, topic' });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Sebagai asisten guru SMAN 21 Garut, buatkan bahan ajar interaktif untuk mata pelajaran ${subject} Kelas ${grade} dengan Capaian Pembelajaran/Topik: "${topic}". 
      Berikan respons dalam format JSON dengan struktur:
      {
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
        model: 'gemini-2.5-pro',
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
