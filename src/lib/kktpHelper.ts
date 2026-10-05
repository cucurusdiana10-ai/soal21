export interface KKTPItem {
  aspek: string;
  sangatMahir: string;
  mahir: string;
  berkembang: string;
  perluBimbingan: string;
}

export function getEnsuredKKTP(data: any): KKTPItem[] {
  if (Array.isArray(data?.kriteriaKetercapaianTujuanPembelajaran) && data.kriteriaKetercapaianTujuanPembelajaran.length > 0) {
    return data.kriteriaKetercapaianTujuanPembelajaran.map((item: any, idx: number) => ({
      aspek: item.aspek || item.indikator || `Indikator TP ${idx + 1}`,
      sangatMahir: item.sangatMahir || item.sangat_mahir || 'Mampu menguasai secara komprehensif, mendalam, dan memecahkan masalah kontekstual secara mandiri (86-100).',
      mahir: item.mahir || 'Mampu menguasai konsep dan menerapkan prosedur dengan tepat dan terstruktur (71-85).',
      berkembang: item.berkembang || 'Cukup memahami konsep namun masih membutuhkan sedikit arahan atau bimbingan (56-70).',
      perluBimbingan: item.perluBimbingan || item.perlu_bimbingan || 'Belum mampu mencapai indikator dan memerlukan pendampingan intensif (<56).'
    }));
  }
  if (Array.isArray(data?.kktp) && data.kktp.length > 0) {
    return data.kktp.map((item: any, idx: number) => ({
      aspek: item.aspek || item.indikator || `Indikator TP ${idx + 1}`,
      sangatMahir: item.sangatMahir || 'Mampu menguasai secara komprehensif, mendalam, dan memecahkan masalah kontekstual secara mandiri (86-100).',
      mahir: item.mahir || 'Mampu menguasai konsep dan menerapkan prosedur dengan tepat dan terstruktur (71-85).',
      berkembang: item.berkembang || 'Cukup memahami konsep namun masih membutuhkan sedikit arahan atau bimbingan (56-70).',
      perluBimbingan: item.perluBimbingan || 'Belum mampu mencapai indikator dan memerlukan pendampingan intensif (<56).'
    }));
  }

  // Fallback: derive dynamically from tujuanPembelajaran
  const tps: string[] = Array.isArray(data?.tujuanPembelajaran) ? data.tujuanPembelajaran : [];
  if (tps.length > 0) {
    return tps.map((tp, idx) => {
      const cleanTp = String(tp).trim();
      return {
        aspek: `Indikator TP ${idx + 1}: ${cleanTp}`,
        sangatMahir: `Mampu mendemonstrasikan penguasaan tuntas atas ${cleanTp.toLowerCase()} secara komprehensif, orisinal, serta mampu memecahkan masalah kontekstual secara mandiri tanpa bantuan (86-100).`,
        mahir: `Mampu menguasai dan menerapkan ${cleanTp.toLowerCase()} secara tepat, runtut, dan terstruktur sesuai kriteria pembelajaran (71-85).`,
        berkembang: `Mulai memahami dan menerapkan ${cleanTp.toLowerCase()}, namun masih membutuhkan sedikit arahan atau bimbingan pada aspek analisis tertentu (56-70).`,
        perluBimbingan: `Belum mampu menunjukkan pemahaman dasar mengenai ${cleanTp.toLowerCase()} dan memerlukan pendampingan intensif dari guru (<56).`
      };
    });
  }

  return [
    {
      aspek: 'Penguasaan Konsep Esensial Materi',
      sangatMahir: 'Mampu menjelaskan konsep secara akurat, mendalam, dan menghubungkan dengan solusi nyata tanpa bantuan (86-100).',
      mahir: 'Mampu menjelaskan konsep dan menganalisis masalah dengan baik dan tepat (71-85).',
      berkembang: 'Menjelaskan konsep secara parsial dan memerlukan sedikit arahan analisis (56-70).',
      perluBimbingan: 'Belum mampu menjelaskan konsep dasar dan membutuhkan bimbingan intensif (<56).'
    }
  ];
}
