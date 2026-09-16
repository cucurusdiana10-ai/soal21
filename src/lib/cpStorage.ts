import { supabase } from './supabase';

export interface SavedCpItem {
  id: string;
  guru_id: string;
  mata_pelajaran: string;
  fase: string;
  judul: string;
  deskripsi?: string;
  teks_cp: string;
  elemen?: string;
  materi_pokok?: string[];
  sumber?: string;
  file_url?: string;
  created_at: string;
}

export const DOKUMEN_RESMI_CP_URL =
  'https://vtjtunvkoicwdugnifxi.supabase.co/storage/v1/object/public/cp-documents/KepKaBSKAP-046_2025-ttg-CP.pdf';

const STORAGE_KEY_PREFIX = 'guru_saved_cp_';

export async function getTeacherSavedCps(guruId: string): Promise<SavedCpItem[]> {
  const localKey = `${STORAGE_KEY_PREFIX}${guruId || 'default'}`;
  let localItems: SavedCpItem[] = [];

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      localItems = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Gagal membaca cache lokal CP:', e);
  }

  try {
    const { data, error } = await supabase
      .from('capaian_pembelajaran')
      .select('*')
      .eq('uploaded_by', guruId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped: SavedCpItem[] = data.map((d: any) => ({
        id: d.id,
        guru_id: d.uploaded_by || guruId,
        mata_pelajaran: d.mata_pelajaran,
        fase: d.fase,
        judul: d.judul,
        deskripsi: d.deskripsi,
        teks_cp: d.teks_cp,
        sumber: 'KepKa BSKAP No. 046/H/KR/2025',
        file_url: d.file_url || DOKUMEN_RESMI_CP_URL,
        created_at: d.created_at,
      }));

      // Merge unique by ID
      const mergedMap = new Map<string, SavedCpItem>();
      localItems.forEach((item) => mergedMap.set(item.id, item));
      mapped.forEach((item) => mergedMap.set(item.id, item));

      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      localStorage.setItem(localKey, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Gagal sinkronisasi CP ke Supabase:', err);
  }

  return localItems;
}

export async function saveTeacherCp(
  guruId: string,
  cpData: {
    mata_pelajaran: string;
    fase: string;
    judul: string;
    deskripsi?: string;
    teks_cp: string;
    elemen?: string;
    materi_pokok?: string[];
  }
): Promise<SavedCpItem> {
  const localKey = `${STORAGE_KEY_PREFIX}${guruId || 'default'}`;
  const newItem: SavedCpItem = {
    id: `cp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    guru_id: guruId,
    mata_pelajaran: cpData.mata_pelajaran,
    fase: cpData.fase,
    judul: cpData.judul,
    deskripsi: cpData.deskripsi,
    teks_cp: cpData.teks_cp,
    elemen: cpData.elemen,
    materi_pokok: cpData.materi_pokok,
    sumber: 'KepKa BSKAP No. 046/H/KR/2025',
    file_url: DOKUMEN_RESMI_CP_URL,
    created_at: new Date().toISOString(),
  };

  // 1. Save to local storage first (instant response)
  try {
    const raw = localStorage.getItem(localKey);
    const list: SavedCpItem[] = raw ? JSON.parse(raw) : [];
    list.unshift(newItem);
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {
    console.warn('Gagal menyimpan ke localStorage:', e);
  }

  // 2. Try to sync to Supabase table
  try {
    await supabase.from('capaian_pembelajaran').insert([
      {
        mata_pelajaran: cpData.mata_pelajaran,
        fase: cpData.fase,
        judul: cpData.judul,
        deskripsi: cpData.deskripsi,
        teks_cp: cpData.teks_cp,
        uploaded_by: guruId,
        file_url: DOKUMEN_RESMI_CP_URL,
        file_name: 'KepKaBSKAP-046_2025-ttg-CP.pdf',
      },
    ]);
  } catch (err) {
    console.warn('Supabase insert CP warning:', err);
  }

  return newItem;
}

export async function deleteTeacherCp(guruId: string, cpId: string): Promise<void> {
  const localKey = `${STORAGE_KEY_PREFIX}${guruId || 'default'}`;

  // 1. Remove from local storage
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: SavedCpItem[] = JSON.parse(raw);
      const filtered = list.filter((i) => i.id !== cpId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Gagal menghapus dari localStorage:', e);
  }

  // 2. Try removing from Supabase
  try {
    await supabase.from('capaian_pembelajaran').delete().eq('id', cpId);
  } catch (err) {
    console.warn('Gagal menghapus dari Supabase:', err);
  }
}
