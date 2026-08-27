/**
 * Media Utility functions for YouTube, direct video, and image handling
 */

export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();

  // youtube.com/watch?v=ID or youtube.com/v/ID or youtube.com/embed/ID
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = cleanUrl.match(regExp);

  if (match && match[2].length === 11) {
    return `https://www.youtube-nocookie.com/embed/${match[2]}?rel=0&enablejsapi=1`;
  }

  // youtube.com/shorts/ID
  const shortsMatch = cleanUrl.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}?rel=0&enablejsapi=1`;
  }

  return null;
}

export function isDirectVideoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase().trim();
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') || lower.startsWith('data:video/');
}

export function isValidMediaUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  return clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:');
}
