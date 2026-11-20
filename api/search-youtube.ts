import { searchLiveYoutubeVideos } from './_gemini';
import { resolveRelevantYoutubeVideo } from '../src/lib/youtubeLibrary';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const subject = String(req.query?.subject || req.body?.subject || '');
    const topic = String(req.query?.topic || req.query?.q || req.body?.topic || '');
    if (!topic && !subject) {
      return res.status(400).json({ error: 'Parameter topic atau subject diperlukan', videos: [] });
    }

    const liveVideos = await searchLiveYoutubeVideos(subject, topic);
    if (liveVideos.length > 0) {
      return res.status(200).json({ videos: liveVideos, source: 'youtube-live' });
    }

    const fallback = resolveRelevantYoutubeVideo(subject, topic);
    return res.status(200).json({
      videos: [
        {
          id: '',
          url: fallback.videoUrl,
          title: fallback.videoTitle,
          channel: fallback.videoChannel,
          duration: '',
          thumbnail: ''
        },
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
