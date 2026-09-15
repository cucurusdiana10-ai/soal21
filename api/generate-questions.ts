import { handleQuestionsGeneration } from './_gemini';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'ready', 
      endpoint: '/api/generate-questions',
      hasKey: Boolean(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY belum terdeteksi di Vercel Functions. Pastikan setelah menambahkan variabel GEMINI_API_KEY di Vercel Dashboard, Anda telah melakukan REDEPLOY.'
      });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // ignore
      }
    }

    const result = await handleQuestionsGeneration(body, apiKey);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Error in /api/generate-questions:', err);
    return res.status(500).json({
      error: err?.message || 'Gagal menghasilkan Soal Evaluasi AI'
    });
  }
}
