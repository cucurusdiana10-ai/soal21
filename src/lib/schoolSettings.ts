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

