import React, { useState } from 'react';
import { Image, Video, Upload, ExternalLink, Play, Film, Sparkles } from 'lucide-react';
import { getYouTubeEmbedUrl, isDirectVideoUrl } from '../lib/mediaUtils';

interface MediaViewerProps {
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video' | 'both' | string;
  title?: string;
  isEditing?: boolean;
  onImageUrlChange?: (url: string) => void;
  onVideoUrlChange?: (url: string) => void;
  onMediaTypeChange?: (type: 'image' | 'video' | 'both') => void;
  className?: string;
}

export default function MediaViewer({
  imageUrl,
  videoUrl,
  mediaType = 'both',
  title,
  isEditing = false,
  onImageUrlChange,
  onVideoUrlChange,
  onMediaTypeChange,
  className = ''
}: MediaViewerProps) {
  const [activeTab, setActiveTab] = useState<'video' | 'image'>(
    videoUrl ? 'video' : 'image'
  );

  const youtubeEmbed = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;
  const isDirectVideo = videoUrl ? isDirectVideoUrl(videoUrl) : false;
  const hasVideo = Boolean(videoUrl && (youtubeEmbed || isDirectVideo));
  const hasImage = Boolean(imageUrl);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUrlChange) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageUrlChange(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tab Switcher if both media exist or if in editing mode */}
      {(hasVideo && hasImage) || isEditing ? (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'video'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" /> Video Pembelajaran
              {hasVideo && <span className="w-2 h-2 rounded-full bg-red-300 animate-pulse" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('image')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'image'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Image className="w-3.5 h-3.5" /> Gambar Ilustrasi
              {hasImage && <span className="w-2 h-2 rounded-full bg-indigo-300" />}
            </button>
          </div>

          {isEditing && onMediaTypeChange && (
            <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
              <span>Format Media:</span>
              <select
                value={mediaType}
                onChange={(e) => onMediaTypeChange(e.target.value as any)}
                className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-bold text-gray-800"
              >
                <option value="both">🖼️ & 🎥 Gambar + Video</option>
                <option value="video">🎥 Video Saja</option>
                <option value="image">🖼️ Gambar Saja</option>
              </select>
            </div>
          )}
        </div>
      ) : null}

      {/* Editing Controls */}
      {isEditing && (
        <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" /> Pengaturan Media Bahan Ajar (Gambar / Video)
            </h5>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {/* Video Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                URL Video (YouTube / Link Video MP4):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={videoUrl || ''}
                  onChange={(e) => onVideoUrlChange && onVideoUrlChange(e.target.value)}
                  placeholder="Contoh: https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 font-medium"
                />
              </div>
              <p className="text-[11px] text-gray-500">Mendukung link YouTube standar, youtu.be, Shorts, atau direct video.</p>
            </div>

            {/* Image Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                URL Gambar atau Unggah Foto dari Komputer:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrl || ''}
                  onChange={(e) => onImageUrlChange && onImageUrlChange(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 p-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
                <label className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold border border-indigo-200 cursor-pointer flex items-center gap-1 shrink-0 transition">
                  <Upload className="w-3.5 h-3.5" /> Unggah
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
              <p className="text-[11px] text-gray-500">Format gambar JPG, PNG, WebP maksimal 5MB.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Display: Video View */}
      {activeTab === 'video' && hasVideo ? (
        <div className="relative rounded-2xl overflow-hidden border border-gray-300 bg-black shadow-md aspect-video max-h-[440px] w-full">
          {youtubeEmbed ? (
            <iframe
              src={youtubeEmbed}
              title={title || "Video Pembelajaran"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : isDirectVideo ? (
            <video
              src={videoUrl}
              controls
              className="w-full h-full object-contain bg-black"
            >
              Browser Anda tidak mendukung tag video.
            </video>
          ) : null}
        </div>
      ) : activeTab === 'video' && !hasVideo ? (
        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-2">
          <Film className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm font-semibold text-gray-600">Belum ada URL video yang disematkan.</p>
          {isEditing && (
            <p className="text-xs text-indigo-600 font-medium">Masukkan link YouTube pada form di atas untuk menampilkan video.</p>
          )}
        </div>
      ) : null}

      {/* Main Display: Image View */}
      {(activeTab === 'image' || (!hasVideo && hasImage)) && (
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 group max-h-80 w-full shadow-sm">
          <img
            src={imageUrl || "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80"}
            alt={title || "Gambar Pendukung Materi"}
            className="w-full h-80 object-cover opacity-90 group-hover:scale-105 transition duration-500"
            onError={(e) => {
              (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80');
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-black/20 p-6 flex flex-col justify-end">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-600/90 text-white text-xs font-bold rounded-full backdrop-blur-sm flex items-center">
                <Image className="w-3.5 h-3.5 mr-1" /> Gambar Ilustrasi Pembelajaran
              </span>
            </div>
            {title && <h3 className="text-xl font-bold text-white mt-1 drop-shadow-sm">{title}</h3>}
          </div>
        </div>
      )}
    </div>
  );
}
