export type BahanAjarFormatId =
  | 'slide_interaktif'
  | 'video_pembelajaran'
  | 'gamifikasi'
  | 'peta_konsep'
  | 'infografis'
  | 'modul_digital'
  | 'simulasi_praktik'
  | 'web_pembelajaran'
  | 'podcast_audio'
  | 'custom_format';

export type StudentDifficultyLevel = 'dasar' | 'reguler' | 'pengayaan';

export interface FormatOptionMeta {
  id: BahanAjarFormatId;
  label: string;
  shortDesc: string;
  features: string[];
  accentColor: string;
}

export const BAHAN_AJAR_FORMATS: FormatOptionMeta[] = [
  {
    id: 'slide_interaktif',
    label: 'Slide Interaktif',
    shortDesc: 'Presentasi modern dengan navigasi antar-slide, transisi, tombol interaktif & infografis.',
    features: ['Presentasi modern', 'Animasi transisi', 'Navigasi antar-slide', 'Tombol interaktif', 'Ilustrasi & infografis'],
    accentColor: 'blue'
  },
  {
    id: 'video_pembelajaran',
    label: 'Video Pembelajaran',
    shortDesc: 'Naskah video, storyboard per adegan, narasi guru, subtitle & durasi terukur.',
    features: ['Naskah video', 'Storyboard & adegan', 'Narasi guru', 'Visual pendukung', 'Subtitle & poin penting', 'Durasi dapat diatur'],
    accentColor: 'red'
  },
  {
    id: 'gamifikasi',
    label: 'Gamifikasi',
    shortDesc: 'Misi pembelajaran, tantangan berlevel, poin XP, badge, leaderboard & permainan edukatif.',
    features: ['Kuis interaktif', 'Misi pembelajaran', 'Tantangan berlevel', 'Poin & skor', 'Badge penghargaan', 'Leaderboard opsional', 'Permainan edukatif'],
    accentColor: 'amber'
  },
  {
    id: 'peta_konsep',
    label: 'Peta Konsep (Mind Mapping)',
    shortDesc: 'Visualisasi hierarki konsep utama, cabang materi & hubungan antarkonsep interaktif.',
    features: ['Konsep utama', 'Cabang materi', 'Hubungan antarkonsep', 'Visualisasi hierarki', 'Peta konsep interaktif'],
    accentColor: 'indigo'
  },
  {
    id: 'infografis',
    label: 'Infografis',
    shortDesc: 'Ringkasan materi visual, diagram alur, perbandingan konsep & sorotan informasi penting.',
    features: ['Ringkasan visual', 'Diagram', 'Ilustrasi', 'Perbandingan konsep', 'Informasi penting'],
    accentColor: 'emerald'
  },
  {
    id: 'modul_digital',
    label: 'Modul Digital',
    shortDesc: 'Materi terstruktur lengkap dengan daftar isi, penjelasan konsep, contoh, rangkuman & latihan.',
    features: ['Materi terstruktur', 'Daftar isi', 'Penjelasan konsep', 'Contoh penerapan', 'Rangkuman', 'Latihan soal'],
    accentColor: 'slate'
  },
  {
    id: 'simulasi_praktik',
    label: 'Simulasi & Praktik Interaktif',
    shortDesc: 'Simulasi parameter konsep, eksperimen virtual, studi kasus & skenario pemecahan masalah.',
    features: ['Simulasi konsep', 'Eksperimen virtual', 'Studi kasus', 'Praktik langkah demi langkah', 'Skenario pemecahan masalah'],
    accentColor: 'cyan'
  },
  {
    id: 'web_pembelajaran',
    label: 'Web Pembelajaran Interaktif',
    shortDesc: 'Halaman web eksplorasi bebas dengan tab materi, accordion, tombol eksplorasi & multimedia.',
    features: ['Berbasis halaman web', 'Navigasi bebas', 'Tombol eksplorasi', 'Accordion', 'Tab materi', 'Konten multimedia'],
    accentColor: 'teal'
  },
  {
    id: 'podcast_audio',
    label: 'Podcast & Audio Pembelajaran',
    shortDesc: 'Naskah percakapan edukatif dua arah, narasi materi, ringkasan & pemutar suara TTS.',
    features: ['Naskah percakapan edukatif', 'Narasi materi', 'Diskusi dua arah', 'Ringkasan audio'],
    accentColor: 'violet'
  },
  {
    id: 'custom_format',
    label: 'Format Bebas (Custom)',
    shortDesc: 'Rancang sendiri bentuk bahan ajar atau gabungkan beberapa ide desain sesuai instruksi guru.',
    features: ['Instruksi bebas guru', 'Desain pembelajaran adaptif', 'Kombinasi multi-format'],
    accentColor: 'orange'
  }
];

export interface ModulAnalysisMissingItem {
  field: string;
  label: string;
  alasan: string;
  perluKonfirmasi: boolean;
}

export interface ModulAnalysisResult {
  sumberModulJudul: string;
  mataPelajaran: string;
  jenjangKelas: string;
  fase: string;
  alokasiWaktu: string;
  tujuanPembelajaran: string[];
  materiPokok: string;
  submateri: string[];
  kompetensiDicapai: string[];
  kegiatanPembelajaran: Array<{
    pertemuanKe: number;
    namaPertemuan: string;
    metode: string;
    ringkasanAktivitas: string;
  }>;
  asesmenDanIndikator: {
    asesmenDiagnostik: string;
    asesmenFormatif: string;
    asesmenSumatif: string;
    indikatorKeberhasilan: string[];
  };
  strukturBahanAjar: Array<{
    urutan: number;
    bagian: string;
    fokusMateri: string;
    keterkaitanTujuan: string;
  }>;
  missingItems: ModulAnalysisMissingItem[];
  butuhKonfirmasiGuru: boolean;
  catatanAnalisis: string;
}

export interface SlideItem {
  nomor: number;
  judul: string;
  subjudul?: string;
  layout?: 'hero' | 'split' | 'grid' | 'infographic' | 'quiz';
  transisi?: 'fade' | 'slide' | 'zoom';
  poinUtama: string[];
  narasiRingkas: string;
  ilustrasiDeskripsi?: string;
  infografisMini?: Array<{ label: string; nilai: string; keterangan?: string }>;
  tombolInteraktif?: {
    labelTombol: string;
    judulRespon: string;
    isiRespon: string;
  };
}

export interface VideoSceneItem {
  nomor: number;
  judulAdegan: string;
  durasiDetik: number;
  rentangWaktu: string;
  visualPendukung: string;
  narasiGuru: string;
  subtitle: string;
  poinPentingLayar: string[];
}

export interface VideoPembelajaranData {
  judulVideo: string;
  durasiMenit: number;
  catatanProduksi?: string;
  poinPentingKeseluruhan: string[];
  adegan: VideoSceneItem[];
}

export interface GamifikasiLevelItem {
  level: number;
  judul: string;
  instruksi: string;
  tantanganSoal: string;
  opsiJawaban?: string[];
  kunciJawaban?: string;
  penjelasan?: string;
  xp: number;
}

export interface GamifikasiData {
  judulMisi: string;
  skenario: string;
  aktifkanLeaderboard: boolean;
  totalXp: number;
  badgeReward: {
    nama: string;
    icon: string;
    deskripsi: string;
  };
  tantanganBerlevel: GamifikasiLevelItem[];
  permainanEdukatif?: {
    jenis: 'cocokkan_konsep' | 'urutkan_langkah';
    judulPermainan: string;
    instruksi: string;
    pasangan: Array<{ kiri: string; kanan: string }>;
  };
  kuisInteraktif?: Array<{
    question: string;
    options: string[];
    answer: string;
    explanation?: string;
    poin?: number;
  }>;
  leaderboardContoh?: Array<{ nama: string; poin: number; badge: string }>;
}

export interface PetaKonsepData {
  konsepUtama: string;
  ringkasan: string;
  cabangMateri: Array<{
    id: string;
    nama: string;
    hubunganDariUtama: string;
    deskripsi: string;
    subKonsep: Array<{
      nama: string;
      penjelasanSingkat: string;
    }>;
    hubunganAntarCabang?: string;
    warna?: string;
  }>;
}

export interface InfografisData {
  judul: string;
  subjudul: string;
  ringkasanVisual: string;
  sorotanFakta: Array<{ angkaAtauHighlight: string; label: string; penjelasan: string }>;
  diagramAlur: Array<{ langkah: number; judul: string; deskripsi: string }>;
  perbandinganKonsep?: {
    judulPerbandingan: string;
    konsepA: string;
    konsepB: string;
    aspek: Array<{ kriteria: string; nilaiA: string; nilaiB: string }>;
  };
  informasiPenting: string[];
  deskripsiIlustrasi?: string;
}

export interface ModulDigitalData {
  judul: string;
  kataPengantar: string;
  daftarIsi: Array<{ nomor: string; judulBagian: string; estimasiMenit?: number }>;
  bagianMateri: Array<{
    kode: string;
    judul: string;
    penjelasanKonsep: string;
    contohPenerapan: string;
    poinKunci: string[];
  }>;
  rangkuman: string[];
  latihanSoal: Array<{
    tipe: 'pg' | 'essay';
    pertanyaan: string;
    opsi?: string[];
    kunci: string;
    pembahasan: string;
  }>;
}

export interface SimulasiPraktikData {
  judulSimulasi: string;
  konsepYangDisimulasikan: string;
  deskripsiSingkat: string;
  parameterInteraktif: Array<{
    id: string;
    namaParameter: string;
    satuan: string;
    min: number;
    max: number;
    defaultVal: number;
    dampakRendah: string;
    dampakSedang: string;
    dampakTinggi: string;
  }>;
  eksperimenVirtual: {
    judulEksperimen: string;
    alatBahanVirtual: string[];
    langkahPraktik: Array<{ langkahKe: number; instruksi: string; hasilPengamatan: string }>;
  };
  studiKasus: {
    judulKasus: string;
    narasiKasus: string;
    skenarioPemecahanMasalah: Array<{
      pertanyaanKeputusan: string;
      pilihanAksi: Array<{ label: string; tepat: boolean; umpanBalik: string }>;
    }>;
  };
}

export interface WebPembelajaranData {
  judulHalaman: string;
  tagline: string;
  tabMateri: Array<{
    id: string;
    labelTab: string;
    judulKonten: string;
    isiKonten: string;
    poinHighlight: string[];
  }>;
  accordionKonsep: Array<{
    judul: string;
    jawabanAtauUraian: string;
  }>;
  tombolEksplorasi: Array<{
    labelTombol: string;
    judulPopup: string;
    kontenEksplorasi: string;
  }>;
}

export interface PodcastAudioData {
  judulEpisode: string;
  durasiEstimasi: string;
  pembawaAcara: string;
  narasumber: string;
  narasiPembuka: string;
  dialogInteraktif: Array<{
    pembicara: string;
    peran: 'host' | 'guru';
    teks: string;
    penekananPoin?: string;
  }>;
  ringkasanAudio: string[];
}

export interface CustomFormatData {
  namaFormat: string;
  ringkasanDesainPembelajaran: string;
  bagianKustom: Array<{
    judulBagian: string;
    jenisBlok: 'teks' | 'daftar' | 'interaktif' | 'studi_kasus' | 'tabel';
    isi: string;
    poinAtauItem?: string[];
  }>;
}

export interface MultiFormatBahanAjarContent {
  version: 2;
  selectedFormats: BahanAjarFormatId[];
  jenjangKelas: string;
  mataPelajaran: string;
  topik: string;
  tingkatKesulitan: StudentDifficultyLevel;
  sumberModulJudul?: string;
  tujuanPembelajaran?: string[];
  ringkasanAnalisis?: {
    kompetensiDicapai?: string[];
    indikatorKeberhasilan?: string[];
  };
  // Shared media (optional, never forced unless relevant)
  imageUrl?: string;
  videoUrl?: string;
  videoTitle?: string;
  videoChannel?: string;
  mediaType?: string;
  suggestedVideos?: Array<{
    id: string;
    url: string;
    title: string;
    channel: string;
    duration?: string;
  }>;

  // Teacher-configured practice question preferences
  jumlahLatihanSoal?: number;
  jenisLatihanSoal?: 'pg' | 'essay' | 'campuran';
  latihanSoalTambahan?: Array<{
    tipe: 'pg' | 'essay';
    pertanyaan: string;
    opsi?: string[];
    kunci: string;
    pembahasan: string;
  }>;

  // Format-specific payloads (populated only for formats chosen by teacher)
  slideInteraktif?: SlideItem[];
  videoPembelajaran?: VideoPembelajaranData;
  gamifikasi?: GamifikasiData;
  petaKonsep?: PetaKonsepData;
  infografis?: InfografisData;
  modulDigital?: ModulDigitalData;
  simulasiPraktik?: SimulasiPraktikData;
  webPembelajaran?: WebPembelajaranData;
  podcastAudio?: PodcastAudioData;
  customFormat?: CustomFormatData;

  // Enrichment blocks from AI Creative Assistant
  creativeAdditions?: Array<{
    id: string;
    jenis: string;
    judul: string;
    konten: string;
    dibuatPada: string;
  }>;
}

export type CreativeAssistantActionId =
  | 'kembangkan_menarik'
  | 'sederhanakan'
  | 'contoh_kontekstual'
  | 'buat_analogi'
  | 'ilustrasi_pendukung'
  | 'pertanyaan_pemantik'
  | 'aktivitas_kolaboratif'
  | 'latihan_evaluasi'
  | 'rekomendasi_media'
  | 'instruksi_bebas';

export interface CreativeAssistantResponse {
  judulTambahan: string;
  jenisAksi: CreativeAssistantActionId;
  ringkasanSaran: string;
  kontenUtama: string;
  poinImplementasi?: string[];
  pertanyaanAtauSoal?: Array<{
    pertanyaan: string;
    opsi?: string[];
    kunciAtauPanduan?: string;
  }>;
  rekomendasiMedia?: Array<{
    namaMedia: string;
    jenis: string;
    alasanKecocokan: string;
    caraPenggunaan: string;
  }>;
  penyesuaianJenjang?: string;
}
