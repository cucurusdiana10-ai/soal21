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
