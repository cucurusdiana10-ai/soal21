import { LkpdContent } from './lkpdDocxGenerator';

/**
 * Builds an authentic, deep learning LKPD directly from an archived Modul Ajar.
 * @param mod The archived module record from Supabase
 * @param meetingSelection 'ALL' | '0' | '1' | '2' ... (index of meeting in module)
 * @param customMeetingCount Optional number of meetings
 * @param userProfile Current user info
 */
export function buildLkpdFromModule(
  mod: any,
  meetingSelection: string = '0',
  customMeetingCount?: number,
  userProfile?: any
): LkpdContent {
  const content = mod?.content_json || {};
  const ident = content?.identitas || {};
  const allMeetings: any[] = Array.isArray(content?.pertemuan) ? content.pertemuan : [];

  // Determine meetings in scope
  let targetedMeetings: any[] = [];
  let pertemuanLabel = 'Pertemuan 1';

  if (meetingSelection === 'ALL') {
    targetedMeetings = allMeetings;
    pertemuanLabel = `Semua Pertemuan (Pertemuan 1 s.d. ${allMeetings.length || 1})`;
  } else {
    const idx = parseInt(meetingSelection, 10);
    if (!isNaN(idx) && allMeetings[idx]) {
      targetedMeetings = [allMeetings[idx]];
      pertemuanLabel = `Pertemuan ${idx + 1}`;
    } else if (allMeetings.length > 0) {
      targetedMeetings = [allMeetings[0]];
      pertemuanLabel = 'Pertemuan 1';
    } else {
      targetedMeetings = [];
      pertemuanLabel = 'Pertemuan 1';
    }
  }

  // Extract main topic / subject
  const subjectName = mod?.subject_name || ident.mataPelajaran || 'Mata Pelajaran';
  const grade = mod?.grade || ident.fase || 'Fase E (Kelas X)';
  const moduleTitle = mod?.title || 'Modul Pembelajaran Mendalam';
  
  // Specific title for LKPD
  const firstMeetingName = targetedMeetings[0]?.nama || '';
  const judulLkpd = targetedMeetings.length === 1 && firstMeetingName && !firstMeetingName.toLowerCase().startsWith('pertemuan')
    ? `${firstMeetingName}`
    : `${moduleTitle}`;

  // Time allocation
  const alokasi = targetedMeetings.length > 1
    ? `${targetedMeetings.length * 2} x 45 Menit (${targetedMeetings.length} Pertemuan)`
    : targetedMeetings[0]?.alokasiWaktu || ident.alokasiWaktu || '2 x 45 Menit (1 Pertemuan)';

  // Tujuan Pembelajaran
  const tujuanPembelajaranList: string[] = [];
  if (targetedMeetings.length === 1 && targetedMeetings[0]?.tujuanPertemuan) {
    tujuanPembelajaranList.push(targetedMeetings[0].tujuanPertemuan);
  }
  if (Array.isArray(content.tujuanPembelajaran)) {
    content.tujuanPembelajaran.forEach((tp: string) => {
      if (!tujuanPembelajaranList.includes(tp)) {
        tujuanPembelajaranList.push(tp);
      }
    });
  }
  if (tujuanPembelajaranList.length === 0) {
    tujuanPembelajaranList.push(`Memahami dan mengaplikasikan konsep kunci materi ${subjectName} secara nalar kritis dan kolaboratif.`);
  }

  // Petunjuk Belajar
  const petunjukBelajar = [
    'Bacalah stimulus konteks fenomena nyata dan rumusan masalah dengan cermat bersama kelompok.',
    'Bagi peran kerja investigasi secara gotong royong dan berkesadaran (Mindful & Joyful Collaboration).',
    'Lakukan penyelidikan terstruktur, kumpulkan data/fakta, dan lengkapi tabel pengamatan.',
    'Diskusikan pertanyaan analisis nalar kritis untuk merumuskan pemecahan masalah yang orisinal.',
    'Simpulkan temuan bersama dan persiapkan sajian presentasi kelompok untuk dikonfirmasi bersama Guru.'
  ];

  // Stimulus Kontekstual & Studi Kasus
  const existingLkpd = content.lampiran?.lkpd;
  const deepLearningFocus = content.prinsipPembelajaranMendalam?.meaningful || '';
  
  let stimulusNarasi = '';
  if (existingLkpd?.studiKasusSoal) {
    stimulusNarasi = existingLkpd.studiKasusSoal;
  } else if (targetedMeetings[0]?.kegiatanInti?.sintaks?.[0]?.aktivitasGuru) {
    stimulusNarasi = `Dalam kehidupan sehari-hari, fenomena ${subjectName} memegang peranan krusial dalam memecahkan tantangan nyata di lingkungan sekitar kita. ${deepLearningFocus || ''} Cermati dan diskusikan kasus yang disajikan oleh guru terkait keterkaitan konsep materi dengan tantangan kontekstual saat ini.`;
  } else {
    stimulusNarasi = `Peserta didik diajak mengamati dan menelaah fenomena kontekstual materi ${subjectName}. Amati variabel permasalahan di sekitar lingkungan Anda, identifikasi masalah utama, dan susun hipotesis awal bersama kelompok.`;
  }

  // Langkah Investigasi
  const langkahInvestigasi: Array<{ langkahKe: number; instruksi: string; fokusAktivitas?: string }> = [];
  let stepIndex = 1;

  targetedMeetings.forEach((meeting) => {
    const sintaks = meeting?.kegiatanInti?.sintaks || [];
    if (Array.isArray(sintaks) && sintaks.length > 0) {
      sintaks.forEach((st: any) => {
        if (st.aktivitasSiswa) {
          langkahInvestigasi.push({
            langkahKe: stepIndex++,
            instruksi: st.aktivitasSiswa,
            fokusAktivitas: st.tahap || st.fokusMendalam
          });
        }
      });
    }
  });

  if (langkahInvestigasi.length === 0) {
    if (existingLkpd?.tugasLangkah && Array.isArray(existingLkpd.tugasLangkah)) {
      existingLkpd.tugasLangkah.forEach((tk: string, i: number) => {
        langkahInvestigasi.push({
          langkahKe: i + 1,
          instruksi: tk,
          fokusAktivitas: 'Investigasi Mandiri/Kelompok'
        });
      });
    } else {
      langkahInvestigasi.push(
        { langkahKe: 1, instruksi: 'Identifikasi fakta kunci dan rumuskan masalah utama dari fenomena stimulus.', fokusAktivitas: 'Orientasi Masalah' },
        { langkahKe: 2, instruksi: 'Kumpulkan literatur rujukan dari modul bahan ajar digital atau buku teks siswa.', fokusAktivitas: 'Eksplorasi Konsep' },
        { langkahKe: 3, instruksi: 'Lakukan analisis komparatif dan olah data temuan ke dalam tabel lembar kerja kelompok.', fokusAktivitas: 'Pengolahan Data' },
        { langkahKe: 4, instruksi: 'Rumuskan solusi kreatif dan argumentatif atas tantangan masalah yang dihadapi.', fokusAktivitas: 'Solusi Pemecahan Masalah' }
      );
    }
  }

  // Tabel Pengamatan
  const tabelPengamatan = {
    judulTabel: `Tabel Hasil Penyelidikan & Pengumpulan Data (${subjectName})`,
    kolom: ['No', 'Variabel / Komponen Yang Diamati', 'Deskripsi Fakta / Data Temuan', 'Analisis Keterkaitan Konsep', 'Catatan Solutif'],
    barisContoh: [
      ['1', 'Variabel / Parameter 1', '..........................................................', '..........................................................', '................................'],
      ['2', 'Variabel / Parameter 2', '..........................................................', '..........................................................', '................................'],
      ['3', 'Variabel / Parameter 3', '..........................................................', '..........................................................', '................................']
    ]
  };

  // Pertanyaan Diskusi Kritis
  const pertanyaanDiskusi: string[] = [];
  if (Array.isArray(content.pertanyaanPemantik) && content.pertanyaanPemantik.length > 0) {
    content.pertanyaanPemantik.forEach((q: string) => {
      pertanyaanDiskusi.push(q);
    });
  }
  pertanyaanDiskusi.push(
    `Berdasarkan data yang telah dikumpulkan kelompok Anda pada tabel di atas, jelaskan bagaimana hubungan sebab-akibat antar konsep dalam materi ${subjectName} ini!`,
    `Tantangan nyata apa yang mungkin muncul jika konsep ini diabaikan dalam kehidupan sehari-hari, dan apa rekomendasi solutif yang kelompok Anda usulkan?`
  );

  // Rubrik Penilaian LKPD
  const rubrikPenilaian = [
    {
      aspek: 'Keterlibatan & Kolaborasi Gotong Royong',
      skor4: 'Seluruh anggota proaktif, berbagi peran setara, dan menciptakan iklim diskusi yang suportif.',
      skor3: 'Sebagian besar anggota aktif berkontribusi dan berbagi tugas dengan baik.',
      skor2: 'Hanya 1-2 anggota yang mendominasi pengerjaan kelompok.',
      skor1: 'Anggota kelompok pasif dan tidak terlihat pembagian peran kerja yang jelas.'
    },
    {
      aspek: 'Kedalaman Investigasi & Ketepatan Data',
      skor4: 'Data pengamatan lengkap, akurat, sistematis, dan diverifikasi dengan teori ilmiah terpercaya.',
      skor3: 'Data pengamatan cukup lengkap dan sesuai dengan konsep materi.',
      skor2: 'Data pengamatan kurang lengkap dan masih terdapat beberapa miskonsepsi.',
      skor1: 'Data pengamatan tidak lengkap atau tidak relevan dengan instruksi kerja.'
    },
    {
      aspek: 'Penalaran Kritis & Solusi Pemecahan Masalah',
      skor4: 'Analisis mendalam, argumentasi logis berbasis fakta, dan solusi yang diusulkan sangat orisinal.',
      skor3: 'Analisis baik, logis, dan solusi menjawab permasalahan yang diajukan.',
      skor2: 'Analisis masih bersifat deskriptif permukaan tanpa pengaitan konsep mendalam.',
      skor1: 'Belum mampu menarik analisis dan tidak memberikan solusi yang memadai.'
    },
    {
      aspek: 'Komunikasi & Kerapian Lembar Kerja',
      skor4: 'Penyajian sangat rapi, runtut, bahasa santun, dan siap dipresentasikan dengan percaya diri.',
      skor3: 'Penyajian rapi, jelas, dan mudah dipahami.',
      skor2: 'Penyajian kurang terstruktur dan bahasa belum baku.',
      skor1: 'Penyajian tidak rapi dan sulit dipahami.'
    }
  ];

  return {
    identitas: {
      namaSekolah: ident.namaSekolah || 'SMAN 21 Garut',
      npsn: ident.npsn || '20209194',
      alamatSekolah: ident.alamatSekolah || 'Jl. Raya Talegong No. 21, Kec. Talegong, Kab. Garut, Jawa Barat 44167',
      mataPelajaran: subjectName,
      fase: grade,
      alokasiWaktu: alokasi,
      pertemuanKe: pertemuanLabel,
      judulLkpd,
      namaGuru: ident.namaGuru || userProfile?.name || 'Guru Pengampu',
      nipGuru: ident.nipGuru || userProfile?.username || '-',
      tahunPelajaran: ident.tahunPelajaran || '2026/2027',
      semester: ident.semester || 'Ganjil',
      tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    },
    tujuanPembelajaran: tujuanPembelajaranList,
    petunjukBelajar,
    stimulusKontekstual: {
      judul: `Investigasi Masalah: ${judulLkpd}`,
      narasi: stimulusNarasi,
      pertanyaanAwal: content.pertanyaanPemantik?.[0] || `Bagaimana prinsip ${subjectName} dapat diterapkan secara efektif?`
    },
    langkahInvestigasi,
    tabelPengamatan,
    pertanyaanDiskusi,
    kesimpulanDanRefleksi: {
      panduanKesimpulan: `Rumuskan 2-3 poin simpulan kunci mengenai esensi materi ${subjectName} yang telah diselidiki bersama kelompok:`,
      refleksiSiswa: [
        'Konsep baru apa yang paling berkesan dan bermakna bagi kamu hari ini?',
        'Bagaimana kerja sama kelompok membantumu mengatasi kesulitan selama penyelidikan?'
      ]
    },
    rubrikPenilaian
  };
}
