export interface KepsekInfo {
  nama: string;
  nip: string;
}

const STORAGE_KEY_NIP = 'sman21_nip_kepsek';
const STORAGE_KEY_NAMA = 'sman21_nama_kepsek';

export function parseKepsek(raw: string | undefined | null): KepsekInfo {
  const defaultNama = 'Agus Supriatna, S.Pd., M.Si.';
  let localNip = '';
  if (typeof window !== 'undefined') {
    try {
      localNip = localStorage.getItem(STORAGE_KEY_NIP) || '';
    } catch {
      // ignore
    }
  }

  if (!raw) {
    return {
      nama: defaultNama,
      nip: localNip
    };
  }

  // If encoded with ###NIP:
  if (raw.includes('###NIP:')) {
    const parts = raw.split('###NIP:');
    const nama = parts[0].trim() || defaultNama;
    const nip = parts[1].trim() || localNip;
    return { nama, nip };
  }

  // If encoded with |||
  if (raw.includes('|||')) {
    const parts = raw.split('|||');
    const nama = parts[0].trim() || defaultNama;
    const nip = parts[1].trim() || localNip;
    return { nama, nip };
  }

  // If pattern is [NIP: 1970...]
  const match = raw.match(/\[NIP:\s*([^\]]+)\]/i);
  if (match) {
    const nama = raw.replace(match[0], '').trim() || defaultNama;
    const nip = match[1].trim() || localNip;
    return { nama, nip };
  }

  return {
    nama: raw.trim() || defaultNama,
    nip: localNip
  };
}

export function formatKepsekDbString(nama: string, nip: string): string {
  const cleanNama = (nama || 'Agus Supriatna, S.Pd., M.Si.').trim();
  const cleanNip = (nip || '').trim();

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_NAMA, cleanNama);
      if (cleanNip) {
        localStorage.setItem(STORAGE_KEY_NIP, cleanNip);
      } else {
        localStorage.removeItem(STORAGE_KEY_NIP);
      }
    } catch {
      // ignore
    }
  }

  return cleanNip ? `${cleanNama}###NIP:${cleanNip}` : cleanNama;
}

export const STANDAR_KEGIATAN_PENDAHULUAN: string[] = [
  'Orientasi & Penumbuhan Budi Pekerti: Guru membuka pembelajaran dengan salam hangat, sapaan ramah, dan memimpin doa bersama siswa sesuai keyakinan masing-masing.',
  'Presensi & Kesiapan Ruang: Guru memeriksa kebersihan dan kerapian ruang kelas, dilanjutkan memeriksa kehadiran dan kesiapan fisik-mental peserta didik untuk belajar.',
  'Mindfulness & Ice Breaking (Joyful Learning): Guru memandu latihan kesadaran penuh (Mindfulness / Teknik STOP: Stop, Take a breath, Observe, Proceed) atau ice breaking singkat yang menggembirakan untuk memusatkan fokus belajar peserta didik.',
  'Apersepsi Kontekstual: Guru mengaitkan materi prasyarat atau pengalaman belajar sebelumnya dengan topik bahasan baru melalui analogi konkret kehidupan sehari-hari.',
  'Pertanyaan Pemantik & Motivasi (Meaningful): Guru mengajukan pertanyaan pemantik kontekstual yang merangsang nalar kritis serta memaparkan manfaat nyata materi dalam kehidupan nyata.',
  'Penyampaian Tujuan & Alur Asesmen: Guru menyampaikan Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP) spesifik hari ini, garis besar alur aktivitas, dan kriteria penilaian.',
  'Kontrak Belajar & Pembagian Kelompok: Guru mengondisikan pembagian kelompok belajar heterogen berdasarkan tingkat kesiapan belajar (diferensiasi) dan menyepakati kontrak kelas.'
];

export const STANDAR_KEGIATAN_PENUTUP: string[] = [
  'Rangkuman & Simpulan Bersama: Peserta didik bersama guru merangkum dan menyimpulkan poin-poin kunci serta konsep esensial yang telah dipelajari hari ini.',
  'Refleksi Terbimbing Peserta Didik (Metakognisi): Peserta didik melakukan refleksi metakognitif menjawab apa yang telah dipahami, tantangan yang dihadapi, dan perasaan belajar.',
  'Asesmen Formatif Cepat (Exit Ticket): Guru memberikan evaluasi pemahaman mandiri singkat (1-2 soal kuis cepat atau exit ticket) untuk mengecek ketuntasan konsep.',
  'Apresiasi & Penguatan Positif Guru: Guru memberikan apresiasi dan umpan balik konstruktif atas keaktifan, kreativitas, dan kolaborasi seluruh peserta didik.',
  'Tindak Lanjut & Info Pertemuan Berikutnya: Guru memberikan arahan tindak lanjut (remedial/pengayaan) serta menginformasikan topik materi dan persiapan untuk pertemuan berikutnya.',
  'Doa Penutup & Salam: Pembelajaran ditutup dengan doa bersama penuh syukur yang dipimpin perwakilan siswa dan salam penutup santun dari guru.'
];

export function getDetailedPendahuluan(existing?: string[]): string[] {
  if (Array.isArray(existing) && existing.length >= 4) {
    return existing;
  }
  return STANDAR_KEGIATAN_PENDAHULUAN;
}

export function getDetailedPenutup(existing?: string[]): string[] {
  if (Array.isArray(existing) && existing.length >= 4) {
    return existing;
  }
  return STANDAR_KEGIATAN_PENUTUP;
}

export const STORAGE_KEY_TTD_KEPSEK = 'sman21_ttd_kepsek';
export const STORAGE_KEY_CAP_SEKOLAH = 'sman21_cap_sekolah';
export const STORAGE_KEY_USE_AUTO_STAMP = 'sman21_use_auto_stamp';

export function getStoredTtdKepsek(): string {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(STORAGE_KEY_TTD_KEPSEK) || '';
    } catch {
      return '';
    }
  }
  return '';
}

export function setStoredTtdKepsek(val: string): void {
  if (typeof window !== 'undefined') {
    try {
      if (val) {
        localStorage.setItem(STORAGE_KEY_TTD_KEPSEK, val);
      } else {
        localStorage.removeItem(STORAGE_KEY_TTD_KEPSEK);
      }
    } catch {
      // ignore
    }
  }
}

export function getStoredCapSekolah(): string {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(STORAGE_KEY_CAP_SEKOLAH) || '';
    } catch {
      return '';
    }
  }
  return '';
}

export function setStoredCapSekolah(val: string): void {
  if (typeof window !== 'undefined') {
    try {
      if (val) {
        localStorage.setItem(STORAGE_KEY_CAP_SEKOLAH, val);
      } else {
        localStorage.removeItem(STORAGE_KEY_CAP_SEKOLAH);
      }
    } catch {
      // ignore
    }
  }
}

// Generate realistic SVG official circular wet stamp for SMAN 21 Garut
export function getDefaultOfficialStampSvg(schoolName: string = 'SMAN 21 GARUT'): string {
  const cleanSchool = schoolName.toUpperCase().replace(/^SMA NEGERI\s*/i, 'SMAN ').trim();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
    <defs>
      <path id="topArc" d="M 30,120 A 90,90 0 0,1 210,120" fill="none" />
      <path id="bottomArc" d="M 210,120 A 90,90 0 0,1 30,120" fill="none" />
      <filter id="inkRough" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" />
      </filter>
    </defs>
    <g filter="url(#inkRough)" stroke="#3730a3" fill="#3730a3" opacity="0.88">
      <!-- Outer Double Ring -->
      <circle cx="120" cy="120" r="108" fill="none" stroke="#3730a3" stroke-width="4.5" />
      <circle cx="120" cy="120" r="99" fill="none" stroke="#3730a3" stroke-width="1.8" />
      
      <!-- Inner Ring -->
      <circle cx="120" cy="120" r="68" fill="none" stroke="#3730a3" stroke-width="1.8" />
      <circle cx="120" cy="120" r="64" fill="none" stroke="#3730a3" stroke-width="3" />

      <!-- Curved Text Top -->
      <text font-family="'Times New Roman', Georgia, serif" font-size="12.5" font-weight="bold" letter-spacing="1.5">
        <textPath href="#topArc" startOffset="50%" text-anchor="middle">
          PEMERINTAH DAERAH PROVINSI JABAR
        </textPath>
      </text>

      <!-- Curved Text Bottom -->
      <text font-family="'Times New Roman', Georgia, serif" font-size="12" font-weight="bold" letter-spacing="1.5">
        <textPath href="#bottomArc" startOffset="50%" text-anchor="middle">
          CABANG DINAS WILAYAH XI
        </textPath>
      </text>

      <!-- Side Stars -->
      <text x="26" y="124" font-size="14" text-anchor="middle">★</text>
      <text x="214" y="124" font-size="14" text-anchor="middle">★</text>

      <!-- Center School Name -->
      <g text-anchor="middle">
        <text x="120" y="106" font-family="'Arial Black', Impact, sans-serif" font-size="15" font-weight="900" letter-spacing="0.5">
          ${cleanSchool}
        </text>
        <line x1="68" y1="114" x2="172" y2="114" stroke="#3730a3" stroke-width="2" />
        <text x="120" y="127" font-family="'Times New Roman', serif" font-size="10.5" font-weight="bold" letter-spacing="1">
          KABUPATEN GARUT
        </text>
        <line x1="68" y1="133" x2="172" y2="133" stroke="#3730a3" stroke-width="2" />
        <text x="120" y="145" font-family="Arial, sans-serif" font-size="9" font-weight="bold" letter-spacing="0.5">
          DISDIK JABAR
        </text>
      </g>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

