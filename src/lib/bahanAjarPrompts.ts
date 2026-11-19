import {
  BahanAjarFormatId,
  CreativeAssistantActionId,
  ModulAnalysisResult,
  StudentDifficultyLevel
} from '../types/bahanAjar';

export function buildAnalyzeModulPrompt(input: {
  modulTitle?: string;
  subjectName?: string;
  grade?: string;
  cp?: string;
  metode?: string;
  alokasiWaktu?: string;
  contentJson?: any;
  rawText?: string;
}): string {
  const modJsonStr = input.contentJson ? JSON.stringify(input.contentJson, null, 2) : '';
  const rawTextStr = input.rawText ? input.rawText.trim() : '';

  return `Anda adalah pakar analisis kurikulum dan desainer instruksional SMA Kurikulum Merdeka.
Tugas Anda adalah MEMBACA dan MENGANALISIS secara saksama isi Modul Ajar yang diberikan guru di bawah ini.

ATURAN KETAT INTEGRITAS ISI MODUL AJAR (WAJIB DIPATUHI):
1. DILARANG KERAS mengarang Tujuan Pembelajaran (TP) baru atau mengubah substansi materi yang TIDAK terdapat dalam Modul Ajar.
2. Ekstrak secara setia apa yang tertulis di dalam Modul Ajar.
3. Jika suatu informasi penting TIDAK TERSEDIA atau kosong/tidak jelas di dalam Modul Ajar (misalnya Tujuan Pembelajaran tidak tercantum, Submateri belum dirinci, Kegiatan Pembelajaran kosong, atau Asesmen/Indikator keberhasilan belum ada), JANGAN dikarang sendiri — masukkan ke dalam array "missingItems" dan atur "butuhKonfirmasiGuru": true!
4. Susunlah rekomendasi "strukturBahanAjar" yang sepenuhnya diturunkan dari hasil analisis Modul Ajar tersebut.

DATA MODUL AJAR SUMBER:
- Judul Modul: ${input.modulTitle || '(Tidak tercantum)'}
- Mata Pelajaran (metadata): ${input.subjectName || '(Tidak tercantum)'}
- Jenjang / Fase / Kelas (metadata): ${input.grade || '(Tidak tercantum)'}
- Capaian Pembelajaran (CP): ${input.cp || '(Tidak tercantum)'}
- Metode Pembelajaran: ${input.metode || '(Tidak tercantum)'}
- Alokasi Waktu: ${input.alokasiWaktu || '(Tidak tercantum)'}
${modJsonStr ? `\nISI TERSTRUKTUR MODUL AJAR (JSON):\n${modJsonStr.slice(0, 14000)}` : ''}
${rawTextStr ? `\nTEKS MODUL AJAR DARI GURU:\n${rawTextStr.slice(0, 14000)}` : ''}

Kembalikan HANYA JSON valid persis mengikuti skema berikut:
{
  "sumberModulJudul": "Judul modul atau materi pokok dari sumber",
  "mataPelajaran": "Nama mata pelajaran yang teridentifikasi (atau 'BELUM TERSEDIA' jika tidak ada)",
  "jenjangKelas": "Jenjang dan tingkat kelas yang teridentifikasi, misal 'SMA Kelas X' (atau 'BELUM TERSEDIA')",
  "fase": "Fase kurikulum misal 'Fase E' atau 'Fase F' (atau 'BELUM TERSEDIA')",
  "alokasiWaktu": "Alokasi waktu sesuai modul (atau 'BELUM TERSEDIA')",
  "tujuanPembelajaran": [
    "Salinan setia Tujuan Pembelajaran 1 dari modul (kosongkan array jika memang tidak ada di modul)"
  ],
  "materiPokok": "Materi pokok utama yang teridentifikasi dari modul",
  "submateri": [
    "Submateri 1 dari modul",
    "Submateri 2 dari modul"
  ],
  "kompetensiDicapai": [
    "Kompetensi / elemen CP / dimensi profil lulusan yang teridentifikasi dari modul"
  ],
  "kegiatanPembelajaran": [
    {
      "pertemuanKe": 1,
      "namaPertemuan": "Judul/topik pertemuan 1",
      "metode": "Metode yang tertulis di modul",
      "ringkasanAktivitas": "Ringkasan pendahuluan, inti/sintaks, dan penutup sesuai modul"
    }
  ],
  "asesmenDanIndikator": {
    "asesmenDiagnostik": "Sesuai modul atau 'BELUM TERSEDIA'",
    "asesmenFormatif": "Sesuai modul atau 'BELUM TERSEDIA'",
    "asesmenSumatif": "Sesuai modul atau 'BELUM TERSEDIA'",
    "indikatorKeberhasilan": [
      "Indikator keberhasilan / aspek KKTP yang tercantum di modul"
    ]
  },
  "strukturBahanAjar": [
    {
      "urutan": 1,
      "bagian": "Nama bagian struktur bahan ajar",
      "fokusMateri": "Cakupan konsep yang dibahas mengacu ke modul",
      "keterkaitanTujuan": "Keterkaitan langsung dengan TP/kompetensi di modul"
    }
  ],
  "missingItems": [
    {
      "field": "nama_field_yang_kurang_misal_tujuanPembelajaran_atau_submateri_atau_asesmen",
      "label": "Label informasi yang belum tersedia",
      "alasan": "Penjelasan singkat mengapa informasi ini perlu konfirmasi guru",
      "perluKonfirmasi": true
    }
  ],
  "butuhKonfirmasiGuru": false,
  "catatanAnalisis": "Ringkasan hasil pembacaan modul dan hal yang perlu dikonfirmasi guru (jika ada)"
}`;
}

export function buildMultiFormatMaterialPrompt(input: {
  subject: string;
  grade: string;
  topic: string;
  description?: string;
  selectedFormats: BahanAjarFormatId[];
  tingkatKesulitan: StudentDifficultyLevel;
  videoDurationMinutes?: number;
  enableLeaderboard?: boolean;
  customFormatPrompt?: string;
  analysis?: Partial<ModulAnalysisResult> | null;
  selectedMeetingIndex?: string;
  jumlahLatihanSoal?: number;
  jenisLatihanSoal?: 'pg' | 'essay' | 'campuran';
}): string {
  const formats = input.selectedFormats.length > 0 ? input.selectedFormats : ['modul_digital'];
  const soalCount = typeof input.jumlahLatihanSoal === 'number' ? Math.max(0, Math.min(30, input.jumlahLatihanSoal)) : 5;
  const soalType = input.jenisLatihanSoal || 'campuran';
  const soalTypeLabel =
    soalType === 'pg'
      ? 'SEMUA Pilihan Ganda (tipe: "pg", 4 opsi A-D)'
      : soalType === 'essay'
      ? 'SEMUA Esai / Uraian (tipe: "essay")'
      : 'Kombinasi Campuran Pilihan Ganda ("pg") & Esai ("essay")';
  const difficultyDesc =
    input.tingkatKesulitan === 'dasar'
      ? 'TINGKAT DASAR (Pemula/Scaffolding Tinggi): Gunakan bahasa sederhana, akrab, analogi konkret sehari-hari, langkah bertahap yang mudah diikuti.'
      : input.tingkatKesulitan === 'pengayaan'
      ? 'TINGKAT PENGAYAAN (HOTS & Mendalam): Gunakan analisis konseptual mendalam, studi kasus kompleks, keterkaitan lintas disiplin, dan tantangan pemecahan masalah tingkat tinggi.'
      : 'TINGKAT REGULER (Sesuai Standar Jenjang SMA): Seimbang antara kejelasan konsep ilmiah, bahasa komunikatif remaja SMA, contoh kontekstual, dan latihan bertahap.';

  const analysisBlock = input.analysis
    ? `
HASIL ANALISIS MODUL AJAR TERKONFIRMASI GURU (WAJIB DIJADIKAN RUJUKAN UTAMA):
- Mata Pelajaran: ${input.analysis.mataPelajaran || input.subject}
- Jenjang / Kelas: ${input.analysis.jenjangKelas || `SMA Kelas ${input.grade}`} (${input.analysis.fase || ''})
- Materi Pokok: ${input.analysis.materiPokok || input.topic}
- Submateri: ${(input.analysis.submateri || []).join('; ') || '-'}
- Tujuan Pembelajaran (DILARANG MENGUBAH SUBSTANSI):
${(input.analysis.tujuanPembelajaran || []).map((tp, i) => `  ${i + 1}. ${tp}`).join('\n') || '  (Gunakan topik utama dengan tetap menjaga akurasi kurikulum)'}
- Kompetensi yang Harus Dicapai: ${(input.analysis.kompetensiDicapai || []).join('; ') || '-'}
- Indikator Keberhasilan / Asesmen: ${(input.analysis.asesmenDanIndikator?.indikatorKeberhasilan || []).join('; ') || '-'}
- Fokus Pertemuan: ${
        input.selectedMeetingIndex && input.selectedMeetingIndex !== 'ALL' && input.analysis.kegiatanPembelajaran
          ? JSON.stringify(input.analysis.kegiatanPembelajaran[Number(input.selectedMeetingIndex)] || input.analysis.kegiatanPembelajaran[0])
          : JSON.stringify(input.analysis.kegiatanPembelajaran || [])
      }
`
    : '';

  const schemaBlocks: string[] = [];

  if (formats.includes('slide_interaktif')) {
    schemaBlocks.push(`  "slideInteraktif": [
    {
      "nomor": 1,
      "judul": "Judul Slide yang Kuat",
      "subjudul": "Subjudul ringkas",
      "layout": "hero | split | grid | infographic | quiz",
      "transisi": "fade | slide | zoom",
      "poinUtama": ["Poin padat 1", "Poin padat 2", "Poin padat 3"],
      "narasiRingkas": "Penjelasan presenter / catatan ajar yang komunikatif",
      "ilustrasiDeskripsi": "Deskripsi ilustrasi atau diagram visual untuk slide ini",
      "infografisMini": [
        { "label": "Fakta/Data Kunci", "nilai": "Nilai/Angka/Istilah", "keterangan": "Makna singkat" }
      ],
      "tombolInteraktif": {
        "labelTombol": "Teks tombol interaktif (misal: Lihat Contoh Nyata / Uji Pemahaman)",
        "judulRespon": "Judul popup interaktif",
        "isiRespon": "Penjelasan mendalam atau mini kuis saat siswa mengklik tombol"
      }
    }
  ] (Buat minimal 6-8 slide presentasi modern yang runtut dari pembuka hingga evaluasi)`);
  }

  if (formats.includes('video_pembelajaran')) {
    const durMenit = Number(input.videoDurationMinutes) || 5;
    const targetScenes = Math.max(4, Math.min(8, Math.round(durMenit) + 1));
    schemaBlocks.push(`  "videoPembelajaran": {
    "judulVideo": "Judul Video Pembelajaran Menarik",
    "durasiMenit": ${durMenit},
    "catatanProduksi": "Arahan gaya visual, tempo bicara, dan suasana video sesuai jenjang SMA kelas ${input.grade}",
    "poinPentingKeseluruhan": ["Poin penting 1", "Poin penting 2", "Poin penting 3"],
    "adegan": [
      {
        "nomor": 1,
        "judulAdegan": "Nama adegan (misal: Pembukaan & Fenomena Pemantik)",
        "durasiDetik": 45,
        "rentangWaktu": "00:00 - 00:45",
        "visualPendukung": "Deskripsi visual layar, animasi, B-roll, atau teks grafis yang tampil",
        "narasiGuru": "Naskah lengkap kata demi kata yang diucapkan guru di depan kamera/voiceover",
        "subtitle": "Teks subtitle ringkas yang tampil di layar",
        "poinPentingLayar": ["Bullet teks di layar 1", "Bullet teks di layar 2"]
      }
    ]
  } (Total jumlah durasiDetik seluruh adegan HARUS proporsional dengan durasi target ${durMenit} menit = ${durMenit * 60} detik, terdiri dari ${targetScenes} adegan runtut)`);
  }

  if (formats.includes('gamifikasi')) {
    const lb = Boolean(input.enableLeaderboard);
    schemaBlocks.push(`  "gamifikasi": {
    "judulMisi": "Judul Misi Petualangan Belajar",
    "skenario": "Narasi misi seru yang mengaitkan materi pokok dengan tantangan dunia nyata",
    "aktifkanLeaderboard": ${lb},
    "totalXp": 300,
    "badgeReward": {
      "nama": "Nama Badge Penghargaan",
      "icon": "🏆",
      "deskripsi": "Syarat meraih badge"
    },
    "tantanganBerlevel": [
      {
        "level": 1,
        "judul": "Level 1: Eksplorasi Konsep Dasar",
        "instruksi": "Instruksi tantangan",
        "tantanganSoal": "Pertanyaan / misi interaktif level 1",
        "opsiJawaban": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
        "kunciJawaban": "A",
        "penjelasan": "Umpan balik edukatif saat siswa menjawab",
        "xp": 100
      }
    ],
    "permainanEdukatif": {
      "jenis": "cocokkan_konsep",
      "judulPermainan": "Tantangan Pasangkan Konsep & Maknanya",
      "instruksi": "Cocokkan istilah di sebelah kiri dengan penjelasan/contoh yang tepat di sebelah kanan",
      "pasangan": [
        { "kiri": "Istilah/Konsep 1", "kanan": "Definisi/Contoh Tepat 1" },
        { "kiri": "Istilah/Konsep 2", "kanan": "Definisi/Contoh Tepat 2" },
        { "kiri": "Istilah/Konsep 3", "kanan": "Definisi/Contoh Tepat 3" },
        { "kiri": "Istilah/Konsep 4", "kanan": "Definisi/Contoh Tepat 4" }
      ]
    },
    "kuisInteraktif": [
      {
        "question": "Pertanyaan kuis gamifikasi?",
        "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
        "answer": "A",
        "explanation": "Pembahasan",
        "poin": 50
      }
    ]
  } (Buat minimal 3 tantangan berlevel progresif + permainan edukatif 4 pasangan + ${soalCount === 0 ? 'array kuisInteraktif kosong []' : `${Math.min(10, soalCount)} soal kuis interaktif`})`);
  }

  if (formats.includes('peta_konsep')) {
    schemaBlocks.push(`  "petaKonsep": {
    "konsepUtama": "Konsep Inti Sentral Materi",
    "ringkasan": "Gambaran menyeluruh keterkaitan konsep dalam hierarki materi",
    "cabangMateri": [
      {
        "id": "cabang-1",
        "nama": "Nama Cabang Materi 1",
        "hubunganDariUtama": "Kata penghubung dari konsep utama (misal: 'terdiri atas', 'memerlukan', 'menghasilkan')",
        "deskripsi": "Uraian ringkas cabang materi",
        "subKonsep": [
          { "nama": "Subkonsep 1A", "penjelasanSingkat": "Penjelasan dan contoh" },
          { "nama": "Subkonsep 1B", "penjelasanSingkat": "Penjelasan dan contoh" }
        ],
        "hubunganAntarCabang": "Keterkaitan logis cabang ini dengan cabang materi lainnya",
        "warna": "blue"
      }
    ]
  } (Buat 3-5 cabang materi yang saling terhubung logis sesuai submateri modul)`);
  }

  if (formats.includes('infografis')) {
    schemaBlocks.push(`  "infografis": {
    "judul": "Judul Infografis Visual",
    "subjudul": "Subjudul ringkas yang memikat",
    "ringkasanVisual": "Intisari materi dalam 2-3 kalimat padat",
    "sorotanFakta": [
      { "angkaAtauHighlight": "Angka/Istilah Kunci", "label": "Label Fakta", "penjelasan": "Makna ringkas" }
    ],
    "diagramAlur": [
      { "langkah": 1, "judul": "Tahap/Proses 1", "deskripsi": "Penjelasan singkat tahap" }
    ],
    "perbandinganKonsep": {
      "judulPerbandingan": "Perbandingan Konsep Kunci dalam Materi",
      "konsepA": "Konsep A",
      "konsepB": "Konsep B",
      "aspek": [
        { "kriteria": "Aspek pembanding 1", "nilaiA": "Karakteristik A", "nilaiB": "Karakteristik B" }
      ]
    },
    "informasiPenting": ["Poin ingat cepat 1", "Poin ingat cepat 2", "Poin ingat cepat 3"],
    "deskripsiIlustrasi": "Deskripsi tata letak grafis dan ikon/diagram visual"
  }`);
  }

  if (formats.includes('modul_digital')) {
    schemaBlocks.push(`  "modulDigital": {
    "judul": "Judul Modul Digital Terstruktur",
    "kataPengantar": "Pengantar komunikatif dan panduan belajar mandiri siswa",
    "daftarIsi": [
      { "nomor": "Bab 1", "judulBagian": "Nama Bagian 1", "estimasiMenit": 15 }
    ],
    "bagianMateri": [
      {
        "kode": "1.1",
        "judul": "Judul Submateri",
        "penjelasanKonsep": "Uraian konseptual mendalam, sistematis, dan mudah dipahami",
        "contohPenerapan": "Contoh penerapan nyata dan perhitungan/kasus konkret",
        "poinKunci": ["Intisari 1", "Intisari 2"]
      }
    ],
    "rangkuman": ["Butir rangkuman 1", "Butir rangkuman 2", "Butir rangkuman 3"],
    "latihanSoal": [
      {
        "tipe": "pg",
        "pertanyaan": "Soal latihan pemahaman konsep?",
        "opsi": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
        "kunci": "A",
        "pembahasan": "Pembahasan detail"
      },
      {
        "tipe": "essay",
        "pertanyaan": "Soal analisis uraian?",
        "kunci": "Pokok jawaban yang diharapkan",
        "pembahasan": "Penjelasan kriteria jawaban tepat"
      }
    ]
  } (Buat minimal 3 bagian materi komprehensif sesuai submateri modul, daftar isi lengkap, rangkuman, dan ${soalCount === 0 ? 'array latihanSoal kosong [] karena guru memilih 0 latihan soal' : `TEPAT ${soalCount} butir latihanSoal dengan komposisi ${soalTypeLabel}`})`);
  }

  if (formats.includes('simulasi_praktik')) {
    schemaBlocks.push(`  "simulasiPraktik": {
    "judulSimulasi": "Judul Simulasi & Eksperimen Virtual",
    "konsepYangDisimulasikan": "Konsep atau prinsip yang diuji dalam simulasi",
    "deskripsiSingkat": "Cara kerja simulasi dan apa yang dapat dieksplorasi siswa",
    "parameterInteraktif": [
      {
        "id": "param_1",
        "namaParameter": "Nama variabel yang dapat digeser siswa",
        "satuan": "satuan (misal: °C, %, M, kali, atau level)",
        "min": 0,
        "max": 100,
        "defaultVal": 50,
        "dampakRendah": "Penjelasan kondisi ilmiah/konseptual jika nilai parameter rendah (<35)",
        "dampakSedang": "Penjelasan kondisi jika nilai parameter sedang (35-70)",
        "dampakTinggi": "Penjelasan kondisi jika nilai parameter tinggi (>70)"
      }
    ],
    "eksperimenVirtual": {
      "judulEksperimen": "Judul Praktikum / Eksperimen Virtual",
      "alatBahanVirtual": ["Alat/komponen 1", "Alat/komponen 2"],
      "langkahPraktik": [
        { "langkahKe": 1, "instruksi": "Langkah praktik konkret", "hasilPengamatan": "Fenomena yang teramati siswa" }
      ]
    },
    "studiKasus": {
      "judulKasus": "Judul Studi Kasus Kontekstual",
      "narasiKasus": "Skenario permasalahan nyata yang harus dipecahkan",
      "skenarioPemecahanMasalah": [
        {
          "pertanyaanKeputusan": "Keputusan atau analisis langkah pemecahan masalah?",
          "pilihanAksi": [
            { "label": "Pilihan tindakan 1", "tepat": true, "umpanBalik": "Mengapa keputusan ini tepat secara konsep" },
            { "label": "Pilihan tindakan 2", "tepat": false, "umpanBalik": "Risiko atau kekeliruan konseptual dari tindakan ini" }
          ]
        }
      ]
    }
  } (Sertakan minimal 2-3 parameter interaktif, 4 langkah eksperimen virtual, dan 2 skenario pemecahan masalah studi kasus)`);
  }

  if (formats.includes('web_pembelajaran')) {
    schemaBlocks.push(`  "webPembelajaran": {
    "judulHalaman": "Judul Halaman Web Pembelajaran Interaktif",
    "tagline": "Deskripsi singkat ajakan eksplorasi mandiri",
    "tabMateri": [
      {
        "id": "tab-1",
        "labelTab": "Tab 1: Konsep Inti",
        "judulKonten": "Judul bagian",
        "isiKonten": "Uraian materi multimedia ramah baca web",
        "poinHighlight": ["Poin sorotan 1", "Poin sorotan 2"]
      }
    ],
    "accordionKonsep": [
      {
        "judul": "Pertanyaan/Topik Pendalaman yang Bisa Dibuka-Tutup?",
        "jawabanAtauUraian": "Penjelasan ringkas namun tajam saat accordion dibuka siswa"
      }
    ],
    "tombolEksplorasi": [
      {
        "labelTombol": "Teks Tombol Eksplorasi (misal: Bedah Miskonsepsi Umum)",
        "judulPopup": "Judul Panel Eksplorasi",
        "kontenEksplorasi": "Isi materi tambahan saat siswa menekan tombol eksplorasi"
      }
    ]
  } (Sertakan minimal 3 tab materi, 4 item accordion, dan 3 tombol eksplorasi interaktif)`);
  }

  if (formats.includes('podcast_audio')) {
    schemaBlocks.push(`  "podcastAudio": {
    "judulEpisode": "Judul Episode Podcast Edukatif",
    "durasiEstimasi": "5-7 Menit",
    "pembawaAcara": "Host (Siswa Penasaran)",
    "narasumber": "Guru Pengampu / Pakar",
    "narasiPembuka": "Intro pembuka podcast yang hangat dan memancing rasa ingin tahu",
    "dialogInteraktif": [
      {
        "pembicara": "Host",
        "peran": "host",
        "teks": "Pertanyaan atau tanggapan natural penuh rasa ingin tahu.",
        "penekananPoin": "Kata kunci yang dibahas"
      },
      {
        "pembicara": "Guru",
        "peran": "guru",
        "teks": "Jawaban dialogis dengan analogi mudah dan penjelasan konsep yang mengalir.",
        "penekananPoin": "Inti penjelasan"
      }
    ],
    "ringkasanAudio": ["Takeaway 1 dari episode podcast", "Takeaway 2", "Takeaway 3"]
  } (Buat minimal 8-10 giliran dialog dua arah yang natural, edukatif, dan tidak kaku)`);
  }

  if (formats.includes('custom_format')) {
    schemaBlocks.push(`  "customFormat": {
    "namaFormat": "Nama Bentuk Bahan Ajar Kustom Sesuai Permintaan Guru",
    "ringkasanDesainPembelajaran": "Penjelasan bagaimana instruksi khusus guru diterjemahkan menjadi desain pembelajaran efektif",
    "bagianKustom": [
      {
        "judulBagian": "Judul Bagian 1",
        "jenisBlok": "teks | daftar | interaktif | studi_kasus | tabel",
        "isi": "Konten mendalam bagian ini sesuai desain instruksi guru",
        "poinAtauItem": ["Poin pendukung 1", "Poin pendukung 2"]
      }
    ]
  } (Rancang struktur yang paling relevan dengan instruksi bebas guru: "${input.customFormatPrompt || 'Desain pembelajaran kreatif multi-bentuk'}")`);
  }

  if (!formats.includes('modul_digital') && soalCount > 0) {
    schemaBlocks.push(`  "latihanSoalTambahan": [
    {
      "tipe": "${soalType === 'essay' ? 'essay' : 'pg'}",
      "pertanyaan": "Pertanyaan latihan sesuai materi?",
      ${soalType !== 'essay' ? '"opsi": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],' : ''}
      "kunci": "${soalType === 'essay' ? 'Poin jawaban utama yang diharapkan' : 'A'}",
      "pembahasan": "Pembahasan jelas dan mendidik"
    }
  ] (WAJIB membuat TEPAT ${soalCount} butir soal di dalam array "latihanSoalTambahan" dengan jenis: ${soalTypeLabel})`);
  }

  return `Anda adalah desainer pembelajaran digital profesional dan pakar kurikulum SMA di SMAN 21 Garut.
Tugas Anda adalah menyusun Bahan Ajar berkualitas tinggi HANYA untuk format yang dipilih oleh guru, dengan merujuk secara setia pada Modul Ajar (tanpa mengarang Tujuan Pembelajaran di luar modul dan tanpa mengubah substansi materi).

IDENTITAS BAHAN AJAR:
- Mata Pelajaran: ${input.subject}
- Jenjang / Tingkat Kelas: SMA Kelas ${input.grade}
- Topik Utama: ${input.topic}
- Petunjuk Tambahan Guru: ${input.description || '(Tidak ada)'}
- Level Bahasa & Kedalaman: ${difficultyDesc}
- Format Bahan Ajar yang Dipilih Guru: ${formats.join(', ')}
- Permintaan Jumlah Latihan Soal dari Guru: ${soalCount === 0 ? 'TIDAK PERLU latihan soal (0 soal)' : `${soalCount} butir soal (${soalTypeLabel})`}
${input.customFormatPrompt ? `- Instruksi Format Bebas (Custom) dari Guru: "${input.customFormatPrompt}"` : ''}
${analysisBlock}

ATURAN WAJIB:
1. Sesuaikan bahasa, kedalaman konsep, istilah teknis, dan tingkat kesulitan soal/aktivitas secara tepat dengan jenjang SMA Kelas ${input.grade} dan level "${input.tingkatKesulitan}".
2. Pertahankan konsistensi penuh dengan Tujuan Pembelajaran dan Submateri dari Modul Ajar (jangan mengubah substansi).
3. HANYA buat properti JSON untuk format yang dipilih guru! Jangan memaksakan format yang tidak dipilih.
4. ${soalCount > 0 ? `WAJIB membuat TEPAT ${soalCount} butir soal latihan yang berkualitas sesuai permintaan guru (${soalTypeLabel}).` : 'Guru memilih 0 latihan soal, jadi kosongkan latihan soal.'}

Kembalikan HANYA JSON MURNI valid dengan struktur:
{
  "version": 2,
  "selectedFormats": ${JSON.stringify(formats)},
  "jenjangKelas": "SMA Kelas ${input.grade}",
  "mataPelajaran": "${input.subject}",
  "topik": "${input.topic}",
  "tingkatKesulitan": "${input.tingkatKesulitan}",
  "jumlahLatihanSoal": ${soalCount},
  "jenisLatihanSoal": "${soalType}",
  "tujuanPembelajaran": ${JSON.stringify(input.analysis?.tujuanPembelajaran || [])},
${schemaBlocks.join(',\n')}
}`;
}

export function buildCreativeAssistantPrompt(input: {
  actionId: CreativeAssistantActionId;
  customInstruction?: string;
  subject: string;
  grade: string;
  topic: string;
  tingkatKesulitan: StudentDifficultyLevel;
  currentMaterialSummary: string;
  tujuanPembelajaran?: string[];
}): string {
  const actionMap: Record<CreativeAssistantActionId, string> = {
    kembangkan_menarik: 'Kembangkan materi yang sudah ada menjadi jauh lebih menarik, hidup, berdaya pikat bagi siswa SMA, tanpa mengubah substansi ilmiahnya.',
    sederhanakan: `Sederhanakan penjelasan konsep agar jauh lebih mudah dicerna sesuai tingkat kemampuan siswa (${input.tingkatKesulitan}) tanpa menghilangkan makna inti.`,
    contoh_kontekstual: 'Buatkan contoh-contoh kontekstual yang nyata, dekat dengan kehidupan sehari-hari siswa SMA di Jawa Barat / Indonesia dan dunia kerja/teknologi masa kini.',
    buat_analogi: 'Buatkan analogi kreatif dan perumpamaan cerdas yang membuat konsep abstrak menjadi langsung terbayang oleh siswa.',
    ilustrasi_pendukung: 'Rancang deskripsi ilustrasi pendukung, skema diagram alur teks/visual, dan panduan grafis yang dapat langsung ditampilkan guru di kelas.',
    pertanyaan_pemantik: 'Buatkan rangkaian pertanyaan pemantik bernalar kritis (mindful inquiry) untuk membuka diskusi kelas dan memancing rasa ingin tahu siswa.',
    aktivitas_kolaboratif: 'Susun aktivitas pembelajaran kolaboratif kelompok yang aktif, terukur waktunya, dilengkapi pembagian peran dan langkah kerja siswa.',
    latihan_evaluasi: 'Buatkan paket latihan soal dan evaluasi formatif singkat (PG & Esai/HOTS) lengkap dengan kunci jawaban dan rubrik pembahasan.',
    rekomendasi_media: 'Berikan rekomendasi media pembelajaran konkret (simulasi interaktif, eksperimen sederhana, video edukatif, alat peraga, aplikasi pendukung) lengkap dengan cara pakainya.',
    instruksi_bebas: `Laksanakan instruksi khusus dari guru berikut ini secara optimal: "${input.customInstruction || 'Bantu sempurnakan bahan ajar ini'}"`
  };

  return `Anda adalah AI Creative Assistant khusus untuk membantu guru merancang dan menyempurnakan bahan ajar di SMAN 21 Garut.

KONTEKS BAHAN AJAR SAAT INI:
- Mata Pelajaran: ${input.subject}
- Jenjang / Kelas: SMA Kelas ${input.grade}
- Topik: ${input.topic}
- Tingkat Kemampuan Sasaran: ${input.tingkatKesulitan}
- Tujuan Pembelajaran Acuan: ${(input.tujuanPembelajaran || []).join('; ') || 'Sesuai topik utama'}
- Ringkasan Bahan Ajar Saat Ini:
${input.currentMaterialSummary.slice(0, 6000)}

TUGAS ANDA SEKARANG:
${actionMap[input.actionId] || actionMap.instruksi_bebas}
${input.customInstruction && input.actionId !== 'instruksi_bebas' ? `\nCatatan Tambahan Guru: "${input.customInstruction}"` : ''}

Sesuaikan gaya bahasa, kedalaman konsep, dan tingkat kesulitan secara presisi dengan peserta didik SMA Kelas ${input.grade} (level: ${input.tingkatKesulitan}).

Kembalikan HANYA JSON MURNI valid persis struktur berikut:
{
  "judulTambahan": "Judul ringkas dan jelas untuk hasil bantuan AI ini",
  "jenisAksi": "${input.actionId}",
  "ringkasanSaran": "Ringkasan 1-2 kalimat manfaat saran ini untuk pembelajaran di kelas",
  "kontenUtama": "Isi materi/analogi/contoh/aktivitas/ilustrasi lengkap yang siap pakai dan langsung bisa dibaca siswa atau guru",
  "poinImplementasi": [
    "Langkah/poin kunci 1",
    "Langkah/poin kunci 2",
    "Langkah/poin kunci 3"
  ],
  "pertanyaanAtauSoal": [
    {
      "pertanyaan": "Pertanyaan pemantik atau soal evaluasi (isi jika relevan dengan aksi)",
      "opsi": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "kunciAtauPanduan": "Kunci jawaban atau panduan respons yang diharapkan"
    }
  ],
  "rekomendasiMedia": [
    {
      "namaMedia": "Nama media pembelajaran (isi jika aksi rekomendasi_media atau ilustrasi_pendukung)",
      "jenis": "Simulasi / Video / Alat Peraga / Digital",
      "alasanKecocokan": "Mengapa media ini efektif untuk materi ini",
      "caraPenggunaan": "Cara praktis guru memakainya di kelas"
    }
  ],
  "penyesuaianJenjang": "Penjelasan singkat bagaimana bahasa & kedalaman telah disesuaikan untuk SMA Kelas ${input.grade} (${input.tingkatKesulitan})"
}`;
}
