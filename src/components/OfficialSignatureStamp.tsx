import React from 'react';
import { getDefaultOfficialStampSvg } from '../lib/schoolSettings';

interface OfficialSignatureStampProps {
  ttdUrl?: string | null;
  capUrl?: string | null;
  schoolName?: string;
  showStamp?: boolean;
  className?: string;
  scale?: number;
}

export default function OfficialSignatureStamp({
  ttdUrl,
  capUrl,
  schoolName = 'SMAN 21 GARUT',
  showStamp = false,
  className = '',
  scale = 1
}: OfficialSignatureStampProps) {
  const defaultStamp = getDefaultOfficialStampSvg(schoolName);
  const activeStamp = capUrl || defaultStamp;
  const hasTtd = Boolean(ttdUrl && ttdUrl.trim());

  return (
    <div
      className={`relative min-h-[112px] md:min-h-[128px] w-full max-w-[280px] mx-auto flex items-center justify-center select-none overflow-visible ${className}`}
    >
      {/* Optional Separate Stamp (Only shown when explicitly enabled and no double stamp) */}
      {showStamp && (
        <div
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 pointer-events-none z-0 transition-transform"
          style={{
            transform: 'translateY(-50%) rotate(-8deg)',
            width: '92px',
            height: '92px'
          }}
          title="Cap Stempel Resmi Sekolah"
        >
          <img
            src={activeStamp}
            alt="Cap Stempel Resmi Sekolah"
            className="w-full h-full object-contain mix-blend-multiply opacity-90 drop-shadow-xs"
            loading="lazy"
          />
        </div>
      )}

      {/* Manual Signature from Kelola Aplikasi (Ukuran Diperbesar Sesuai TTD Biasa) */}
      {hasTtd ? (
        <div className="relative z-10 flex items-center justify-center w-full h-full py-1">
          <img
            src={ttdUrl!}
            alt="Tanda Tangan Kepala Sekolah"
            className="max-h-28 md:max-h-32 w-auto max-w-[260px] md:max-w-[280px] object-contain mix-blend-multiply contrast-110 drop-shadow-2xs transition-transform"
            style={{
              filter: 'contrast(1.1) brightness(0.98)'
            }}
          />
        </div>
      ) : (
        <div className="relative z-10 h-28 md:h-32 flex flex-col items-center justify-center text-slate-300">
          <span className="text-[10px] font-mono tracking-wider italic text-slate-400">
            [ Ruang Tanda Tangan ]
          </span>
        </div>
      )}
    </div>
  );
}
