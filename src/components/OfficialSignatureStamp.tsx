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
  showStamp = true,
  className = '',
  scale = 1
}: OfficialSignatureStampProps) {
  const defaultStamp = getDefaultOfficialStampSvg(schoolName);
  const activeStamp = capUrl || defaultStamp;
  const hasTtd = Boolean(ttdUrl && ttdUrl.trim());

  return (
    <div
      className={`relative h-24 w-60 mx-auto flex items-center justify-center select-none overflow-visible ${className}`}
      style={{ minHeight: '96px' }}
    >
      {/* Official School Stamp (Cap Stempel Basah) */}
      {showStamp && (
        <div
          className="absolute left-1 md:left-3 top-1/2 -translate-y-1/2 pointer-events-none z-0 transition-transform"
          style={{
            transform: 'translateY(-50%) rotate(-8deg)',
            width: '84px',
            height: '84px'
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

      {/* Manual Signature (Tanda Tangan Manual Kepala Sekolah) */}
      {hasTtd ? (
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <img
            src={ttdUrl!}
            alt="Tanda Tangan Kepala Sekolah"
            className="max-h-20 max-w-[200px] object-contain mix-blend-multiply contrast-125 transition-transform"
            style={{
              filter: 'contrast(1.15) brightness(0.98)'
            }}
          />
        </div>
      ) : (
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-slate-300">
          <span className="text-[10px] font-mono tracking-wider italic text-slate-400">
            [ Ruang Tanda Tangan & Cap ]
          </span>
        </div>
      )}
    </div>
  );
}
