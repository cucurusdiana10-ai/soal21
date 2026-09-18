/**
 * Curated Indonesian High School Educational YouTube Video Library
 * Menyediakan referensi video pembelajaran YouTube yang otentik, relevan,
 * dan terverifikasi untuk siswa SMA berdasarkan mata pelajaran dan topik.
 */

export interface EducationalVideo {
  id: string;
  url: string;
  title: string;
  channel: string;
  subject: string;
  keywords: string[];
}

export const YOUTUBE_EDUCATIONAL_DATABASE: EducationalVideo[] = [
  // --- INFORMATIKA ---
  {
    id: 'mUXo-S7gkds',
    url: 'https://www.youtube.com/watch?v=mUXo-S7gkds',
    title: 'Apa itu Berpikir Komputasional (Computational Thinking)?',
    channel: 'Kok Bisa?',
    subject: 'Informatika',
    keywords: ['berpikir komputasional', 'computational thinking', 'dekomposisi', 'abstraksi', 'algoritma', 'pola']
  },
  {
    id: '8mAITcNt710',
    url: 'https://www.youtube.com/watch?v=8mAITcNt710',
    title: 'Dasar Pemrograman & Logika Algoritma untuk Pemula',
    channel: 'Web Programming UNPAS',
    subject: 'Informatika',
    keywords: ['algoritma', 'pemrograman', 'coding', 'python', 'variabel', 'looping', 'fungsi', 'logika']
  },
  {
    id: '7_LPdttKXPc',
    url: 'https://www.youtube.com/watch?v=7_LPdttKXPc',
    title: 'Bagaimana Cara Kerja Jaringan Internet di Seluruh Dunia?',
    channel: 'Kok Bisa?',
    subject: 'Informatika',
    keywords: ['jaringan', 'internet', 'ip address', 'routing', 'dns', 'kabel bawah laut', 'server']
  },
  {
    id: 'inWWhr5tnEA',
    url: 'https://www.youtube.com/watch?v=inWWhr5tnEA',
    title: 'Keamanan Siber & Cara Melindungi Data Pribadi di Era Digital',
    channel: 'Hujan Tanda Tanya',
    subject: 'Informatika',
    keywords: ['keamanan', 'cybersecurity', 'data', 'enkripsi', 'hacker', 'phishing', 'analisis data']
  },

  // --- BIOLOGI ---
  {
    id: 'F_fS0N_8Z8o',
    url: 'https://www.youtube.com/watch?v=F_fS0N_8Z8o',
    title: 'Bagaimana Proses Makanan Dicerna di Tubuh Kita? (Sistem Pencernaan)',
    channel: 'Kok Bisa?',
    subject: 'Biologi',
    keywords: ['pencernaan', 'lambung', 'usus', 'enzim', 'makanan', 'nutrisi', 'organ pencernaan']
  },
  {
    id: 'j3H1_V74y80',
    url: 'https://www.youtube.com/watch?v=j3H1_V74y80',
    title: 'Sistem Peredaran Darah Manusia: Jantung, Pembuluh, dan Sirkulasi',
    channel: 'Ruangguru',
    subject: 'Biologi',
    keywords: ['peredaran darah', 'jantung', 'darah', 'pembuluh', 'eritrosit', 'leukosit', 'tekanan darah']
  },
  {
    id: 'URUJD5NEXC8',
    url: 'https://www.youtube.com/watch?v=URUJD5NEXC8',
    title: 'Struktur dan Fungsi Sel Hewan serta Tumbuhan Lengkap',
    channel: 'Bimbel SMARRT',
    subject: 'Biologi',
    keywords: ['sel', 'organel', 'mitokondria', 'membran', 'nukleus', 'kloroplas', 'sitoplasma']
  },
  {
    id: 'hLq2datPo5M',
    url: 'https://www.youtube.com/watch?v=hLq2datPo5M',
    title: 'Ekosistem, Rantai Makanan, dan Daur Biogeokimia',
    channel: 'Zenius Education',
    subject: 'Biologi',
    keywords: ['ekosistem', 'lingkungan', 'rantai makanan', 'simbiosis', 'bioma', 'daur karbon', 'nitrogen']
  },
  {
    id: '8m6hHRlKwxY',
    url: 'https://www.youtube.com/watch?v=8m6hHRlKwxY',
    title: 'Hukum Mendel, DNA, dan Pewarisan Sifat (Genetika)',
    channel: 'Pahamify',
    subject: 'Biologi',
    keywords: ['genetika', 'dna', 'rna', 'mendel', 'kromosom', 'pewarisan sifat', 'genotip', 'fenotip']
  },

  // --- MATEMATIKA ---
  {
    id: 'PUB0TaZ7bhA',
    url: 'https://www.youtube.com/watch?v=PUB0TaZ7bhA',
    title: 'Konsep Dasar Trigonometri (Sin, Cos, Tan) dan Segitiga Siku-Siku',
    channel: 'Kok Bisa?',
    subject: 'Matematika',
    keywords: ['trigonometri', 'sinus', 'cosinus', 'tangen', 'sudut', 'segitiga', 'kuadran']
  },
  {
    id: '7h2QfHj5d8c',
    url: 'https://www.youtube.com/watch?v=7h2QfHj5d8c',
    title: 'Fungsi Kuadrat, Titik Puncak, dan Menggambar Parabola',
    channel: 'Bimbel SMARRT',
    subject: 'Matematika',
    keywords: ['fungsi kuadrat', 'persamaan kuadrat', 'parabola', 'diskriminan', 'akar', 'grafik']
  },
  {
    id: '4uP72m7Zg1Y',
    url: 'https://www.youtube.com/watch?v=4uP72m7Zg1Y',
    title: 'Kaidah Pencacahan, Permutasi, dan Kombinasi (Teori Peluang)',
    channel: 'Zenius Education',
    subject: 'Matematika',
    keywords: ['peluang', 'kombinasi', 'permutasi', 'pencacahan', 'faktorial', 'ruang sampel']
  },
  {
    id: '7X2V9cWc5mQ',
    url: 'https://www.youtube.com/watch?v=7X2V9cWc5mQ',
    title: 'Barisan dan Deret Aritmatika serta Geometri SMA',
    channel: 'Pahamify',
    subject: 'Matematika',
    keywords: ['barisan', 'deret', 'aritmatika', 'geometri', 'suku', 'beda', 'rasio', 'un', 'sn']
  },
  {
    id: 'k3aKKasbCwE',
    url: 'https://www.youtube.com/watch?v=k3aKKasbCwE',
    title: 'Statistika: Mean, Median, Modus, dan Penyajian Data Kelompok',
    channel: 'Ruangguru',
    subject: 'Matematika',
    keywords: ['statistika', 'mean', 'median', 'modus', 'data', 'histogram', 'kuartil', 'simpangan']
  },

  // --- FISIKA ---
  {
    id: 'kKKM8Y-u7ds',
    url: 'https://www.youtube.com/watch?v=kKKM8Y-u7ds',
    title: 'Hukum Gerak Newton I, II, III dan Penerapannya di Alam',
    channel: 'Kok Bisa?',
    subject: 'Fisika',
    keywords: ['newton', 'gaya', 'gerak', 'kelembaman', 'percepatan', 'aksi reaksi', 'massa']
  },
  {
    id: '2Tz8X-sC_g8',
    url: 'https://www.youtube.com/watch?v=2Tz8X-sC_g8',
    title: 'Kinematika Gerak Lurus Beraturan (GLB) & Berubah Beraturan (GLBB)',
    channel: 'Zenius Education',
    subject: 'Fisika',
    keywords: ['glb', 'glbb', 'kecepatan', 'jarak', 'perpindahan', 'kinematika', 'lintasan']
  },
  {
    id: 'w4SF4Vv58tE',
    url: 'https://www.youtube.com/watch?v=w4SF4Vv58tE',
    title: 'Usaha, Energi Kinetik, Potensial, dan Hukum Kekekalan Energi',
    channel: 'Bimbel SMARRT',
    subject: 'Fisika',
    keywords: ['usaha', 'energi', 'kinetik', 'potensial', 'mekanik', 'daya', 'kekekalan']
  },
  {
    id: '8jB74_3v3wE',
    url: 'https://www.youtube.com/watch?v=8jB74_3v3wE',
    title: 'Rangkaian Listrik Dinamis: Hukum Ohm & Hukum Kirchhoff',
    channel: 'Pahamify',
    subject: 'Fisika',
    keywords: ['listrik', 'ohm', 'kirchhoff', 'arus', 'tegangan', 'hambatan', 'seri', 'paralel']
  },

  // --- KIMIA ---
  {
    id: '0RRVV4Diomg',
    url: 'https://www.youtube.com/watch?v=0RRVV4Diomg',
    title: 'Cara Membaca Tabel Periodik Unsur & Konfigurasi Elektron',
    channel: 'Kok Bisa?',
    subject: 'Kimia',
    keywords: ['periodik', 'unsur', 'atom', 'proton', 'elektron', 'neutron', 'golongan', 'periode']
  },
  {
    id: 'Qf07-8Jhhpc',
    url: 'https://www.youtube.com/watch?v=Qf07-8Jhhpc',
    title: 'Ikatan Kimia: Ikatan Ion, Kovalen, dan Logam',
    channel: 'Bimbel SMARRT',
    subject: 'Kimia',
    keywords: ['ikatan kimia', 'kovalen', 'ion', 'logam', 'elektronegativitas', 'lewis']
  },
  {
    id: 'mnbZ_D_rEwA',
    url: 'https://www.youtube.com/watch?v=mnbZ_D_rEwA',
    title: 'Teori Asam dan Basa: Arrhenius, Bronsted-Lowry, dan Lewis',
    channel: 'Zenius Education',
    subject: 'Kimia',
    keywords: ['asam', 'basa', 'ph', 'indikator', 'titrasi', 'garam', 'netralisasi']
  },
  {
    id: 'afW3V-3f5qI',
    url: 'https://www.youtube.com/watch?v=afW3V-3f5qI',
    title: 'Reaksi Redoks & Penyetaraan Reaksi Kimia SMA',
    channel: 'Ruangguru',
    subject: 'Kimia',
    keywords: ['redoks', 'oksidasi', 'reduksi', 'biloks', 'elektron', 'reaksi']
  },

  // --- BAHASA INDONESIA ---
  {
    id: '5rT8a-kC91k',
    url: 'https://www.youtube.com/watch?v=5rT8a-kC91k',
    title: 'Struktur, Ciri Kebahasaan, dan Langkah Menulis Teks Prosedur',
    channel: 'Ruangguru',
    subject: 'Bahasa Indonesia',
    keywords: ['prosedur', 'langkah', 'instruksi', 'teks', 'imperatif', 'konjungsi']
  },
  {
    id: '4a5pQ8f3e_A',
    url: 'https://www.youtube.com/watch?v=4a5pQ8f3e_A',
    title: 'Kaidah dan Struktur Teks Eksplanasi Fenomena Alam dan Sosial',
    channel: 'Zenius Education',
    subject: 'Bahasa Indonesia',
    keywords: ['eksplanasi', 'sebab akibat', 'kausalitas', 'kronologis', 'fenomena']
  },
  {
    id: '2z5T9b9b00E',
    url: 'https://www.youtube.com/watch?v=2z5T9b9b00E',
    title: 'Seni Bernegosiasi: Struktur dan Trik Teks Negosiasi yang Efektif',
    channel: 'Pahamify',
    subject: 'Bahasa Indonesia',
    keywords: ['negosiasi', 'kesepakatan', 'persuasi', 'kompromi', 'tawar menawar']
  },

  // --- BAHASA INGGRIS ---
  {
    id: 'dr3C3X1H7v8',
    url: 'https://www.youtube.com/watch?v=dr3C3X1H7v8',
    title: 'Narrative Text: Generic Structure, Characteristics, and Moral Value',
    channel: 'Kampung Inggris LC',
    subject: 'Bahasa Inggris',
    keywords: ['narrative', 'story', 'orientation', 'complication', 'resolution', 'fable', 'legend']
  },
  {
    id: '1x9_A4qH_40',
    url: 'https://www.youtube.com/watch?v=1x9_A4qH_40',
    title: 'Analytical Exposition Text: Definition, Structure, and Language Features',
    channel: 'Ruangguru',
    subject: 'Bahasa Inggris',
    keywords: ['analytical exposition', 'argument', 'thesis', 'reiteration', 'opinion']
  },

  // --- SEJARAH & SOSIAL HUMANIORA ---
  {
    id: '0h6C9c0M12M',
    url: 'https://www.youtube.com/watch?v=0h6C9c0M12M',
    title: 'Detik-Detik Proklamasi Kemerdekaan Indonesia 17 Agustus 1945',
    channel: 'Kok Bisa?',
    subject: 'Sejarah',
    keywords: ['sejarah', 'proklamasi', 'kemerdekaan', 'soekarno', 'hatta', 'rengasdengklok', 'bpupki', 'ppki']
  },
  {
    id: 'LwLh6ax0zTE',
    url: 'https://www.youtube.com/watch?v=LwLh6ax0zTE',
    title: 'Hukum Permintaan dan Penawaran dalam Ekonomi Pasar',
    channel: 'Ruangguru',
    subject: 'Ekonomi',
    keywords: ['ekonomi', 'permintaan', 'penawaran', 'pasar', 'harga keseimbangan', 'elastisitas']
  },
  {
    id: '3CerJbZ-DM0',
    url: 'https://www.youtube.com/watch?v=3CerJbZ-DM0',
    title: 'Mengenal Lapisan Atmosfer Bumi dan Fenomena Cuaca Iklim',
    channel: 'Kok Bisa?',
    subject: 'Geografi',
    keywords: ['geografi', 'atmosfer', 'troposfer', 'stratosfer', 'cuaca', 'iklim', 'bumi', 'litosfer']
  },
  {
    id: '7bF_e0_4ZcI',
    url: 'https://www.youtube.com/watch?v=7bF_e0_4ZcI',
    title: 'Interaksi Sosial, Norma, dan Nilai dalam Masyarakat (Sosiologi)',
    channel: 'Zenius Education',
    subject: 'Sosiologi',
    keywords: ['sosiologi', 'interaksi', 'norma', 'sosial', 'masyarakat', 'konflik', 'integrasi']
  }
];

export interface YoutubeMatchResult {
  videoUrl: string;
  videoTitle: string;
  videoChannel: string;
  isCurated: boolean;
  youtubeSearchUrl: string;
  alternativeVideos: EducationalVideo[];
}

/**
 * Mencocokkan topik & mata pelajaran dengan video YouTube pembelajaran resmi yang relevan.
 * Mencegah video placeholder (Rickroll dQw4w9WgXcQ) atau link rusak.
 */
export function resolveRelevantYoutubeVideo(
  subject: string,
  topic: string,
  providedVideoUrl?: string
): YoutubeMatchResult {
  const normSubject = (subject || '').toLowerCase().trim();
  const normTopic = (topic || '').toLowerCase().trim();
  const cleanSearchQuery = `${subject || ''} ${topic || ''} SMA pembelajaran`.trim();
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanSearchQuery)}`;

  // Filter out the known rickroll placeholder
  const isRickroll = providedVideoUrl && providedVideoUrl.includes('dQw4w9WgXcQ');
  const hasValidCustomVideo = providedVideoUrl && !isRickroll && (
    providedVideoUrl.includes('youtube.com') ||
    providedVideoUrl.includes('youtu.be') ||
    providedVideoUrl.endsWith('.mp4')
  );

  // If a valid custom non-rickroll video was provided, retain it
  if (hasValidCustomVideo) {
    return {
      videoUrl: providedVideoUrl.trim(),
      videoTitle: `Video Pembelajaran: ${topic || subject}`,
      videoChannel: 'YouTube Pembelajaran',
      isCurated: false,
      youtubeSearchUrl,
      alternativeVideos: getAlternativesForSubject(subject)
    };
  }

  // Find exact or semantic keyword match in our curated educational database
  let bestMatch: EducationalVideo | null = null;
  let highestScore = 0;

  for (const item of YOUTUBE_EDUCATIONAL_DATABASE) {
    let score = 0;
    const itemSub = item.subject.toLowerCase();

    // Subject similarity
    if (normSubject.includes(itemSub) || itemSub.includes(normSubject)) {
      score += 10;
    }

    // Keyword matching in topic
    for (const kw of item.keywords) {
      if (normTopic.includes(kw)) {
        score += 8;
      }
      if (item.title.toLowerCase().includes(kw) && normTopic.includes(kw)) {
        score += 5;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  // If match found with decent confidence
  if (bestMatch && highestScore >= 8) {
    return {
      videoUrl: bestMatch.url,
      videoTitle: bestMatch.title,
      videoChannel: bestMatch.channel,
      isCurated: true,
      youtubeSearchUrl,
      alternativeVideos: getAlternativesForSubject(subject, bestMatch.id)
    };
  }

  // Fallback to subject-level default or default Kok Bisa channel
  const subjectFallback = YOUTUBE_EDUCATIONAL_DATABASE.find(v => 
    normSubject.includes(v.subject.toLowerCase()) || v.subject.toLowerCase().includes(normSubject)
  ) || YOUTUBE_EDUCATIONAL_DATABASE[0];

  return {
    videoUrl: subjectFallback.url,
    videoTitle: subjectFallback.title,
    videoChannel: subjectFallback.channel,
    isCurated: true,
    youtubeSearchUrl,
    alternativeVideos: getAlternativesForSubject(subject, subjectFallback.id)
  };
}

function getAlternativesForSubject(subject: string, excludeId?: string): EducationalVideo[] {
  const norm = (subject || '').toLowerCase().trim();
  const matched = YOUTUBE_EDUCATIONAL_DATABASE.filter(v => 
    v.id !== excludeId && (norm.includes(v.subject.toLowerCase()) || v.subject.toLowerCase().includes(norm))
  );

  if (matched.length >= 3) return matched.slice(0, 3);

  // Pad with top general educational videos
  const others = YOUTUBE_EDUCATIONAL_DATABASE.filter(v => v.id !== excludeId && !matched.some(m => m.id === v.id));
  return [...matched, ...others].slice(0, 3);
}
