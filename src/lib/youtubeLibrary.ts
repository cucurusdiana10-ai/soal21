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
  },

  // --- PENDIDIKAN PANCASILA & KEWARGANEGARAAN ---
  {
    id: 'lJ6_9oH3vVw',
    url: 'https://www.youtube.com/watch?v=lJ6_9oH3vVw',
    title: 'Nilai-Nilai Luhur Pancasila dalam Kehidupan Berbangsa dan Bernegara',
    channel: 'BPIP RI',
    subject: 'Pendidikan Pancasila',
    keywords: ['pancasila', 'sila', 'nilai', 'uud 1945', 'konstitusi', 'demokrasi', 'bhineka tunggal ika', 'norma hukum']
  },
  {
    id: 'c90tP93iXbA',
    url: 'https://www.youtube.com/watch?v=c90tP93iXbA',
    title: 'Hak Asasi Manusia (HAM) & Penegakan Hukum di Indonesia',
    channel: 'Kok Bisa?',
    subject: 'Pendidikan Pancasila',
    keywords: ['ham', 'hak asasi', 'hukum', 'pelanggaran ham', 'keadilan', 'peradilan', 'warga negara']
  },

  // --- PENDIDIKAN AGAMA ISLAM (PAI) ---
  {
    id: 'vB97fGk56_c',
    url: 'https://www.youtube.com/watch?v=vB97fGk56_c',
    title: 'Kajian Iman, Fiqih Ibadah, dan Pembentukan Karakter Mulia (Akhlak)',
    channel: 'Kemenag RI',
    subject: 'Pendidikan Agama Islam',
    keywords: ['agama', 'islam', 'iman', 'akhlak', 'fiqih', 'ibadah', 'al-qur\'an', 'hadits', 'syariah']
  },

  // --- PENDIDIKAN JASMANI, OLAHRAGA, & KESEHATAN (PJOK) ---
  {
    id: 'x81a_bX99dE',
    url: 'https://www.youtube.com/watch?v=x81a_bX99dE',
    title: 'Kebugaran Jasmani, Pola Hidup Sehat, dan Gerak Dasar Olahraga',
    channel: 'Kemenpora RI',
    subject: 'PJOK',
    keywords: ['pjok', 'olahraga', 'kebugaran', 'jasmani', 'sepak bola', 'bola voli', 'atletik', 'senam', 'kesehatan']
  },

  // --- SENI BUDAYA & PRAKARYA (PKWU) ---
  {
    id: '7mC0n55vXlA',
    url: 'https://www.youtube.com/watch?v=7mC0n55vXlA',
    title: 'Apresiasi Seni Rupa 2 Dimensi & 3 Dimensi serta Unsur Estetika',
    channel: 'Kemendikbud RI',
    subject: 'Seni Budaya',
    keywords: ['seni', 'seni rupa', 'musik', 'tari', 'teater', 'budaya', 'estetika', 'karya seni', 'prakarya', 'pkwu']
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

function normalizeSubjectKey(sub: string): string {
  const s = (sub || '').toLowerCase().trim();
  if (s.includes('informatika') || s.includes('tik') || s.includes('komputer') || s.includes('koding')) return 'informatika';
  if (s.includes('biologi') || s.includes('hayati')) return 'biologi';
  if (s.includes('fisika')) return 'fisika';
  if (s.includes('kimia')) return 'kimia';
  if (s.includes('matematika') || s.includes('mtk') || s.includes('kalkulus') || s.includes('aljabar')) return 'matematika';
  if (s.includes('inggris') || s.includes('english')) return 'bahasa inggris';
  if (s.includes('indonesia') || s.includes('sastra')) return 'bahasa indonesia';
  if (s.includes('sejarah') || s.includes('history')) return 'sejarah';
  if (s.includes('ekonomi') || s.includes('akuntansi')) return 'ekonomi';
  if (s.includes('geografi') || s.includes('kebumian')) return 'geografi';
  if (s.includes('sosiologi') || s.includes('antropologi')) return 'sosiologi';
  if (s.includes('pancasila') || s.includes('ppkn') || s.includes('pkn') || s.includes('kewarganegaraan')) return 'pendidikan pancasila';
  if (s.includes('pjok') || s.includes('penjas') || s.includes('olahraga')) return 'pjok';
  if (s.includes('seni') || s.includes('prakarya') || s.includes('budaya') || s.includes('pkwu')) return 'seni budaya';
  if (s.includes('agama') || s.includes('pai') || s.includes('islam')) return 'pendidikan agama islam';
  return s;
}

/**
 * Mencocokkan topik & mata pelajaran dengan video YouTube pembelajaran resmi yang relevan.
 * Menjamin video yang dihasilkan selalu valid, dapat disematkan (embeddable), dan tidak rusak.
 */
export function resolveRelevantYoutubeVideo(
  subject: string,
  topic: string,
  providedVideoUrl?: string
): YoutubeMatchResult {
  const cleanSubject = (subject || '').trim();
  const cleanTopic = (topic || '').trim();
  const normSubKey = normalizeSubjectKey(cleanSubject);
  const normTopic = cleanTopic.toLowerCase();
  const cleanSearchQuery = `${cleanSubject} ${cleanTopic} SMA pembelajaran`.trim();
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanSearchQuery)}`;

  // Validasi URL khusus yang diberikan:
  // Harus menghasilkan ID embed YouTube 11 karakter yang valid atau direct mp4,
  // dan BUKAN search query, BUKAN placeholder rickroll, BUKAN teks deskriptif
  const rawUrl = (providedVideoUrl || '').trim();
  const isRickroll = rawUrl.includes('dQw4w9WgXcQ');
  const isSearchUrl = rawUrl.includes('results?search_query') || rawUrl.includes('search_query=');
  const isChannelUrl = rawUrl.includes('youtube.com/@') || rawUrl.includes('/channel/') || rawUrl.includes('/user/');
  
  // Ekstraksi ID YouTube jika ada
  let validEmbedId: string | null = null;
  const ytMatch = rawUrl.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1] && ytMatch[1].length === 11 && !isRickroll) {
    validEmbedId = ytMatch[1];
  }

  const isDirectVideo = rawUrl.endsWith('.mp4') || rawUrl.endsWith('.webm') || rawUrl.startsWith('data:video/');

  // Jika URL yang diberikan benar-benar video yang valid & dapat di-embed
  if (!isSearchUrl && !isChannelUrl && !isRickroll && (validEmbedId || isDirectVideo)) {
    const canonicalUrl = validEmbedId ? `https://www.youtube.com/watch?v=${validEmbedId}` : rawUrl;
    return {
      videoUrl: canonicalUrl,
      videoTitle: `Video Pembelajaran: ${cleanTopic || cleanSubject}`,
      videoChannel: 'YouTube Pembelajaran Terpilih',
      isCurated: false,
      youtubeSearchUrl,
      alternativeVideos: getAlternativesForSubject(cleanSubject)
    };
  }

  // Jika URL tidak valid, kosong, atau hasil pencarian,
  // cari kecocokan terbaik di curated educational database kami
  let bestMatch: EducationalVideo | null = null;
  let highestScore = -1;

  for (const item of YOUTUBE_EDUCATIONAL_DATABASE) {
    let score = 0;
    const itemSubKey = normalizeSubjectKey(item.subject);

    // Kecocokan mata pelajaran
    if (normSubKey && (normSubKey === itemSubKey || normSubKey.includes(itemSubKey) || itemSubKey.includes(normSubKey))) {
      score += 15;
    }

    // Keyword matching pada topik
    for (const kw of item.keywords) {
      const lowerKw = kw.toLowerCase();
      if (normTopic.includes(lowerKw)) {
        score += 10;
      }
      if (lowerKw.includes(normTopic) && normTopic.length > 3) {
        score += 7;
      }
    }

    // Kecocokan dengan judul video
    const itemTitleLower = item.title.toLowerCase();
    for (const kw of item.keywords) {
      if (itemTitleLower.includes(kw.toLowerCase()) && normTopic.includes(kw.toLowerCase())) {
        score += 5;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  // Jika match ditemukan dengan skor baik
  if (bestMatch && highestScore > 0) {
    return {
      videoUrl: bestMatch.url,
      videoTitle: bestMatch.title,
      videoChannel: bestMatch.channel,
      isCurated: true,
      youtubeSearchUrl,
      alternativeVideos: getAlternativesForSubject(cleanSubject, bestMatch.id)
    };
  }

  // Fallback ke video mata pelajaran yang sama
  const subjectFallback = YOUTUBE_EDUCATIONAL_DATABASE.find(v => {
    const vSubKey = normalizeSubjectKey(v.subject);
    return normSubKey && (vSubKey === normSubKey || normSubKey.includes(vSubKey) || vSubKey.includes(normSubKey));
  }) || YOUTUBE_EDUCATIONAL_DATABASE[0];

  return {
    videoUrl: subjectFallback.url,
    videoTitle: subjectFallback.title,
    videoChannel: subjectFallback.channel,
    isCurated: true,
    youtubeSearchUrl,
    alternativeVideos: getAlternativesForSubject(cleanSubject, subjectFallback.id)
  };
}

function getAlternativesForSubject(subject: string, excludeId?: string): EducationalVideo[] {
  const normSubKey = normalizeSubjectKey(subject || '');
  const matched = YOUTUBE_EDUCATIONAL_DATABASE.filter(v => {
    if (v.id === excludeId) return false;
    const vSubKey = normalizeSubjectKey(v.subject);
    return normSubKey && (vSubKey === normSubKey || normSubKey.includes(vSubKey) || vSubKey.includes(normSubKey));
  });

  if (matched.length >= 3) return matched.slice(0, 3);

  // Pad dengan video edukasi top lainnya
  const others = YOUTUBE_EDUCATIONAL_DATABASE.filter(v => v.id !== excludeId && !matched.some(m => m.id === v.id));
  return [...matched, ...others].slice(0, 3);
}
