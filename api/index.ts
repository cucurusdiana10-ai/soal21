import {
  handleMaterialGeneration,
  handleQuestionsGeneration,
  handleGradeEssayGeneration,
  handleModulGeneration,
  handleCpSearchGeneration,
  handleAnalyzeModulGeneration,
  handleMaterialAssistantGeneration,
  searchLiveYoutubeVideos
} from './_gemini';
import { resolveRelevantYoutubeVideo } from '../src/lib/youtubeLibrary';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';

  if (req.method === 'GET' && url.includes('search-youtube')) {
    try {
      const qs = new URL(url, 'http://localhost').searchParams;
      const subject = qs.get('subject') || '';
      const topic = qs.get('topic') || qs.get('q') || '';
      const liveVideos = await searchLiveYoutubeVideos(subject, topic);
      if (liveVideos.length > 0) {
        return res.status(200).json({ videos: liveVideos, source: 'youtube-live' });
      }
      const fallback = resolveRelevantYoutubeVideo(subject, topic);
      return res.status(200).json({
        videos: [
          { id: '', url: fallback.videoUrl, title: fallback.videoTitle, channel: fallback.videoChannel, duration: '', thumbnail: '' },
          ...fallback.alternativeVideos.map(v => ({
            id: v.id,
            url: v.url,
            title: v.title,
            channel: v.channel,
            duration: '',
            thumbnail: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`
          }))
        ],
        source: 'curated-fallback'
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Gagal mencari video YouTube', videos: [] });
    }
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ready', url, platform: 'vercel' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY environment variable is missing di hosting Vercel. Silakan tambahkan GEMINI_API_KEY pada Settings -> Environment Variables di Vercel.'
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

    if (url.includes('analyze-modul')) {
      const result = await handleAnalyzeModulGeneration(body, apiKey);
      return res.status(200).json(result);
    }

    if (url.includes('material-assistant')) {
      const result = await handleMaterialAssistantGeneration(body, apiKey);
      return res.status(200).json(result);
    }

    if (url.includes('generate-modul') || url.includes('modul')) {
      const result = await handleModulGeneration(body, apiKey);
      return res.status(200).json(result);
    }

    if (url.includes('generate-material') || url.includes('material')) {
      const result = await handleMaterialGeneration(body, apiKey);
      return res.status(200).json(result);
    }

    if (url.includes('generate-questions') || url.includes('questions')) {
      const result = await handleQuestionsGeneration(body, apiKey);
      return res.status(200).json(result);
    }

    if (url.includes('search-cp') || url.includes('cp/search')) {
      const result = await handleCpSearchGeneration(body, apiKey);
      return res.status(200).json(result);
    }

    if (url.includes('grade-essay') || url.includes('grade')) {
      const result = await handleGradeEssayGeneration(body, apiKey);
      return res.status(200).json(result);
    }

    return res.status(404).json({ error: `Route ${url} tidak dikenali.` });
  } catch (err: any) {
    console.error('Error in /api router:', err);
    return res.status(500).json({ error: err?.message || 'Gagal memproses AI' });
  }
}
