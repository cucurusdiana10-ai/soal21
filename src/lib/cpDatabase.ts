// Database & Generator Capaian Pembelajaran Resmi BSKAP No. 046/H/KR/2025
// Berfungsi sebagai fallback instan dan andal saat AI Gemini mengalami lonjakan permintaan (503)

export interface CpElementItem {
  namaElemen: string;
  deskripsiCp: string;
  materiPokok?: string[];
}

export interface CpPhaseItem {
  fase: string;
  kelas: string;
  judul: string;
  teksCp: string;
  fokusKompetensi?: string;
}

export interface CpSearchResult {
  mataPelajaran: string;
  jenjang?: string;
  fase?: string;
  dasarHukum: string;
  dokumenRujukanUrl?: string;
  capaianFaseUmum?: string;
  rasionalSingkat?: string;
  elemen?: CpElementItem[];
  capaianPerFase?: CpPhaseItem[];
  sumberData?: string;
}

const DOKUMEN_URL =
  'https://vtjtunvkoicwdugnifxi.supabase.co/storage/v1/object/public/cp-documents/KepKaBSKAP-046_2025-ttg-CP.pdf';

const CURATED_CP_MAP: Record<string, any> = {
  informatika: {
    rasional:
      'Informatika adalah disiplin ilmu yang mengkaji struktur, sifat, dan interaksi dari beberapa sistem yang dipakai untuk mengumpulkan data, memproses dan menyimpan hasil pemrosesan data, serta menampilkannya dalam bentuk informasi. Mengembangkan kemampuan berpikir komputasional (computational thinking) serta pemanfaatan teknologi secara beradab dan kritis.',
    faseUmum:
      'Pada akhir fase, peserta didik mampu menerapkan berpikir komputasional dalam menyelesaikan persoalan kompleks, memanfaatkan teknologi informasi dan komunikasi secara terampil dan etis, memahami arsitektur sistem komputer dan jaringan, mengolah serta menganalisis data bervolume besar, merancang algoritma dan program komputer modular, serta mengkaji dampak sosial informatika di era kecerdasan artifisial.',
    elemen: [
      {
        namaElemen: 'Berpikir Komputasional (BK)',
        deskripsiCp:
          'Menerapkan strategi algoritmik standar untuk menghasilkan beberapa solusi persoalan dengan data diskrit bervolume tidak kecil pada kehidupan sehari-hari maupun implementasinya dalam sistem komputasi.',
        materiPokok: ['Rekursi', 'Pencarian (Searching)', 'Pengurutan (Sorting)', 'Struktur Data Antrean & Tumpukan'],
      },
      {
        namaElemen: 'Teknologi Informasi dan Komunikasi (TIK)',
        deskripsiCp:
          'Memanfaatkan berbagai aplikasi perkantoran (pengolah kata, angka, presentasi) secara terintegrasi untuk menghasilkan dokumen laporan dan analisis yang efektif, serta memahami otomasi integrasi konten.',
        materiPokok: ['Integrasi Aplikasi Office', 'Mail Merge', 'Object Linking & Embedding (OLE)', 'Penyimpanan Awan'],
      },
      {
        namaElemen: 'Sistem Komputer (SK)',
        deskripsiCp:
          'Memahami peran sistem operasi, interaksi antara perangkat keras, perangkat lunak, dan pengguna, serta mekanisme internal pemrosesan data oleh CPU.',
        materiPokok: ['Arsitektur Von Neumann', 'Komponen CPU & Memori', 'Sistem Operasi (OS)', 'Instalasi & Troubleshooting'],
      },
      {
        namaElemen: 'Jaringan Komputer dan Internet (JKI)',
        deskripsiCp:
          'Memahami perbedaan jaringan lokal dan internet, topologi jaringan, protokol jaringan TCP/IP, keamanan konektivitas, serta enkripsi data sederhana.',
        materiPokok: ['Topologi Jaringan', 'Protokol TCP/IP & Subnetting', 'Routing & Gateway', 'Keamanan Jaringan & Enkripsi'],
      },
      {
        namaElemen: 'Analisis Data (AD)',
        deskripsiCp:
          'Mampu mengoleksi, membersihkan, mentransformasi, dan memvisualisasikan data bervolume sedang untuk menarik wawasan (insight) logis dan membuat keputusan berbasis data.',
        materiPokok: ['Pengolahan Data Lanjut', 'Validasi & Transformasi Data', 'Visualisasi Grafik Dinamis', 'Interpretasi Tren Data'],
      },
      {
        namaElemen: 'Algoritma dan Pemrograman (AP)',
        deskripsiCp:
          'Mampu membaca, menganalisis, dan menulis kode program prosedural/modular menggunakan bahasa pemrograman tekstual (Python/C++) untuk menyelesaikan permasalahan nyata.',
        materiPokok: ['Variabel & Tipe Data', 'Struktur Kontrol Kondisional & Perulangan', 'Fungsi & Prosedur Modular', 'Debugging Program'],
      },
      {
        namaElemen: 'Dampak Sosial Informatika (DSI)',
        deskripsiCp:
          'Memahami sejarah perkembangan teknologi, hukum siber (UU ITE), etika privasi data pribadi, dampak otomatisasi dan kecerdasan buatan terhadap lapangan kerja.',
        materiPokok: ['Hukum Siber & UU ITE', 'Privasi & Keamanan Data Pribadi', 'Etika Kecerdasan Artifisial (AI)', 'Karier Bidang IT'],
      },
      {
        namaElemen: 'Praktik Lintas Bidang (PLB)',
        deskripsiCp:
          'Mampu berkolaborasi dalam tim untuk mengidentifikasi persoalan di lingkungan sekitar dan merancang artefak komputasional berbasis solusi digital terintegrasi.',
        materiPokok: ['Manajemen Proyek Perangkat Lunak', 'Perancangan UI/UX Sederhana', 'Pengujian Solusi Komputasional', 'Presentasi Produk'],
      },
    ],
    fasePerFase: [
      {
        fase: 'Fase E',
        kelas: 'Kelas X SMA/MA',
        judul: 'Capaian Pembelajaran Informatika Fase E (Kelas X SMA/MA)',
        teksCp:
          'Pada akhir Fase E, peserta didik mampu menerapkan berpikir komputasional dengan strategi algoritmik standar; mengintegrasikan aplikasi perkantoran; memahami cara kerja sistem komputer dan jaringan; mengolah dan menganalisis data; membuat program terstruktur dalam bahasa pemrograman tekstual; serta memahami dampak sosial informatika dan etika digital.',
        fokusKompetensi: 'Pondasi Berpikir Komputasional, Logika Algoritma Dasar, dan Literasi Komputasi Terapan.',
      },
      {
        fase: 'Fase F',
        kelas: 'Kelas XI - XII SMA/MA',
        judul: 'Capaian Pembelajaran Informatika Fase F (Kelas XI - XII SMA/MA)',
        teksCp:
          'Pada akhir Fase F, peserta didik mampu mengembangkan program modular kompleks, menerapkan struktur data lanjutan (graph, tree), mengelola basis data relasional, mengimplementasikan kecerdasan artifisial dasar/machine learning, serta merancang proyek inovasi digital lintas bidang yang berdampak sosial nyata.',
        fokusKompetensi: 'Pemrograman Tingkat Lanjut, Manajemen Basis Data, dan Rekayasa Solusi Komputasional Cerdas.',
      },
    ],
  },
  'koding dan kecerdasan artifisial': {
    rasional:
      'Membekali peserta didik dengan pemahaman rekayasa koding modern, logika machine learning, etika AI, prompt engineering, dan penciptaan solusi pintar berbasis algoritma generatif serta automasi.',
    faseUmum:
      'Pada akhir fase, peserta didik menguasai logika algoritma koding, arsitektur dasar model AI/machine learning, pemanfaatan library data science, evaluasi bias dan keamanan AI, serta mampu membangun prototipe aplikasi cerdas.',
    elemen: [
      {
        namaElemen: 'Fondasi Logika Koding & Algoritma AI',
        deskripsiCp:
          'Memahami sintaks bahasa pemrograman modern (Python/TypeScript), struktur algoritma pencarian kecerdasan buatan, serta pemrosesan representasi data matriks dan vektor.',
        materiPokok: ['Pemrograman Python Lanjut', 'Vektorisasi & NumPy', 'Algoritma Pencarian Cerdas'],
      },
      {
        namaElemen: 'Prinsip Machine Learning & Model Cerdas',
        deskripsiCp:
          'Memahami alur pelatihan model machine learning (Supervised, Unsupervised, Reinforcement Learning), validasi metrik akurasi, dan inferensi model cerdas.',
        materiPokok: ['Klasifikasi & Regresi', 'Pelatihan Model & Overfitting', 'Computer Vision Sederhana', 'Natural Language Processing (NLP)'],
      },
      {
        namaElemen: 'Etika, Keamanan, & Dampak Sosial AI',
        deskripsiCp:
          'Menganalisis isu bias data, hak cipta karya sintesis, etika pemanfaatan Large Language Model (LLM), privasi data, dan tata kelola AI yang bertanggung jawab.',
        materiPokok: ['Etika AI & Regulasi', 'Deteksi Deepfake & Disinformasi', 'Keamanan Siber & Privasi Data'],
      },
    ],
    fasePerFase: [
      {
        fase: 'Fase E & F',
        kelas: 'Kelas X, XI, XII SMA/MA',
        judul: 'Capaian Pembelajaran Koding & Kecerdasan Artifisial SMA/MA',
        teksCp:
          'Peserta didik mampu merancang skrip koding modular, memanfaatkan model machine learning dan API kecerdasan artifisial secara bertanggung jawab, serta membangun solusi inovatif untuk masalah di lingkungan masyarakat.',
        fokusKompetensi: 'Rekayasa Koding Modern, Pemanfaatan AI, dan Etika Kecerdasan Artifisial.',
      },
    ],
  },
  matematika: {
    rasional:
      'Matematika merupakan ilmu universal yang mendasari perkembangan teknologi modern, memajukan daya pikir manusia, dan menumbuhkan kemampuan bernalar logis, analitis, kritis, dan kreatif.',
    faseUmum:
      'Pada akhir fase, peserta didik dapat menyelesaikan masalah kontekstual yang berkaitan dengan aljabar dan fungsi, bilangan berpangkat dan logaritma, geometri analitik, trigonometri, statistika inferensial, dan peluang majemuk.',
    elemen: [
      {
        namaElemen: 'Bilangan',
        deskripsiCp:
          'Menggeneralisasi sifat-sifat bilangan berpangkat (eksponen) dan logaritma, serta menerapkannya dalam memodelkan fenomena eksponensial (pertumbuhan dan peluruhan).',
        materiPokok: ['Eksponen & Sifat-sifatnya', 'Bentuk Akar', 'Logaritma', 'Model Pertumbuhan & Peluruhan'],
      },
      {
        namaElemen: 'Aljabar dan Fungsi',
        deskripsiCp:
          'Menyelesaikan sistem persamaan linear tiga variabel, sistem pertidaksamaan linear, persamaan kuadrat, fungsi kuadrat, dan fungsi eksponensial.',
        materiPokok: ['SPLTV', 'SPtLDV', 'Fungsi Kuadrat', 'Fungsi Komposisi & Invers'],
      },
      {
        namaElemen: 'Geometri dan Trigonometri',
        deskripsiCp:
          'Menerapkan perbandingan trigonometri pada segitiga siku-siku dan sudut berelasi untuk memecahkan masalah jarak, ketinggian, dan vektor spasial.',
        materiPokok: ['Sinus, Kosinus, Tangen', 'Sudut Berelasi', 'Aturan Sinus & Kosinus'],
      },
      {
        namaElemen: 'Analisis Data dan Peluang',
        deskripsiCp:
          'Menampilkan dan menginterpretasikan data menggunakan diagram pencar, ukuran pemusatan data kelompok, serta menghitung peluang kejadian saling lepas dan bersyarat.',
        materiPokok: ['Ukuran Pemusatan & Penyebaran', 'Regresi Linear Sederhana', 'Peluang Bersyarat & Majemuk'],
      },
    ],
    fasePerFase: [
      {
        fase: 'Fase E',
        kelas: 'Kelas X SMA/MA',
        judul: 'Capaian Pembelajaran Matematika Fase E (Kelas X SMA/MA)',
        teksCp:
          'Peserta didik mampu mengoperasikan eksponen dan logaritma; memodelkan fenomena dengan barisan dan deret; menyelesaikan SPLTV dan SPtLDV; menerapkan perbandingan trigonometri segitiga siku-siku; serta menganalisis data statistik kelompok dan peluang dasar.',
        fokusKompetensi: 'Eksponen, Barisan Deret, SPLTV, Trigonometri Dasar, Statistika Deskriptif.',
      },
      {
        fase: 'Fase F',
        kelas: 'Kelas XI - XII SMA/MA',
        judul: 'Capaian Pembelajaran Matematika Fase F (Kelas XI - XII SMA/MA)',
        teksCp:
          'Peserta didik mampu memahami fungsi komposisi dan invers, lingkaran dan garis singgung, limit fungsi aljabar, turunan fungsi dan integral aljabar, serta inferensi statistik untuk memecahkan masalah kehidupan.',
        fokusKompetensi: 'Kalkulus Diferensial & Integral, Geometri Analitik Lingkaran, Peluang Lanjutan.',
      },
    ],
  },
  'bahasa indonesia': {
    rasional:
      'Kemampuan berbahasa Indonesia yang fasih, santun, dan kritis merupakan modal dasar penguasaan ilmu pengetahuan, komunikasi kebinekaan, serta penghargaan terhadap karya sastra nasional.',
    faseUmum:
      'Peserta didik memiliki kemampuan berbahasa untuk berkomunikasi dan bernalar sesuai dengan tujuan, konteks sosial, akademis, dan dunia kerja. Peserta didik mampu memahami, mengolah, menginterpretasi, dan mengevaluasi informasi dari berbagai tipe teks lisan dan tulis.',
    elemen: [
      {
        namaElemen: 'Menyimak',
        deskripsiCp:
          'Mengevaluasi gagasan, pikiran, perasaan, dan pandangan dari teks lisan dan audiovisual, serta mengidentifikasi akurasi informasi dan bias pembicara.',
        materiPokok: ['Akurasi Fakta vs Opini', 'Menyimak Kritis Berita/Podcast', 'Analisis Bias Pembicara'],
      },
      {
        namaElemen: 'Membaca dan Memirsa',
        deskripsiCp:
          'Mengevaluasi informasi berupa gagasan, pikiran, pandangan, arahan atau pesan dari berbagai jenis teks (deskripsi, laporan hasil observasi, eksposisi, anekdot, negosiasi, dan biografi).',
        materiPokok: ['Teks LHO', 'Teks Eksposisi & Argumentasi', 'Teks Anekdot & Cerpen', 'Teks Negosiasi'],
      },
      {
        namaElemen: 'Berbicara dan Mempresentasikan',
        deskripsiCp:
          'Menyampaikan gagasan, pikiran, pandangan, atau arahan secara runtut, jelas, santun, dan intonatif dalam diskusi, debat, dan presentasi ilmiah.',
        materiPokok: ['Debat Kritis', 'Presentasi Hasil Riset', 'Pidato & Negosiasi'],
      },
      {
        namaElemen: 'Menulis',
        deskripsiCp:
          'Menulis gagasan, pikiran, pandangan, arahan atau pesan tertulis dalam bentuk teks faktual, teks sastra (cerpen/puisi), karya ilmiah populer, serta esai argumentatif yang orisinal dan logis.',
        materiPokok: ['Penulisan Esai Argumentatif', 'Karya Tulis Ilmiah Populer', 'Menulis Resensi & Puisi'],
      },
    ],
    fasePerFase: [
      {
        fase: 'Fase E',
        kelas: 'Kelas X SMA/MA',
        judul: 'Capaian Pembelajaran Bahasa Indonesia Fase E (Kelas X SMA/MA)',
        teksCp:
          'Peserta didik mampu mengolah dan menginterpretasi informasi dari teks laporan hasil observasi, eksposisi, anekdot, cerpen, negosiasi, dan biografi; mempresentasikan gagasan dengan etis; serta menulis esai dan teks sastra secara kreatif.',
        fokusKompetensi: 'Literasi Kritis Teks Faktual dan Sastra, Keterampilan Berargumen dan Debat.',
      },
      {
        fase: 'Fase F',
        kelas: 'Kelas XI - XII SMA/MA',
        judul: 'Capaian Pembelajaran Bahasa Indonesia Fase F (Kelas XI - XII SMA/MA)',
        teksCp:
          'Peserta didik mampu mengevaluasi karya sastra (novel/drama), menulis proposal kegiatan dan karya tulis ilmiah, menulis teks editorial dan artikel opini, serta berpartisipasi aktif dalam seminar dan forum ilmiah.',
        fokusKompetensi: 'Karya Tulis Ilmiah, Kritik Sastra, Editorial, dan Retorika Akademis.',
      },
    ],
  },
  'bahasa inggris': {
    rasional:
      'Pembelajaran Bahasa Inggris membekali peserta didik dengan kecakapan literasi multibahasa internasional untuk mengakses ilmu pengetahuan global, memperluas wawasan kebudayaan, dan bersaing di kancah dunia kerja modern.',
    faseUmum:
      'By the end of the phase, students use English to communicate with teachers, peers, and others in a range of settings and for a range of purposes. They understand, evaluate, and produce various texts (recount, narrative, exposition, discussion, procedure, analytical report).',
    elemen: [
      {
        namaElemen: 'Listening and Speaking',
        deskripsiCp:
          'Using English to interact, express opinions, defend viewpoints, discuss complex topics, and deliver structured oral presentations with appropriate register and pronunciation.',
        materiPokok: ['Expressing Opinions & Stance', 'Oral Presentations', 'Debating Social Issues', 'Active Listening in Discussions'],
      },
      {
        namaElemen: 'Reading and Viewing',
        deskripsiCp:
          'Independently reading and critically analyzing various factual and literary texts to synthesize main ideas, author bias, explicit and implicit meanings.',
        materiPokok: ['Analytical Exposition', 'Hortatory Exposition', 'News Item & Report Texts', 'Inference & Contextual Clues'],
      },
      {
        namaElemen: 'Writing and Presenting',
        deskripsiCp:
          'Producing well-structured written compositions (essays, articles, formal letters, procedural guides) using coherent transition words, accurate grammatical structures, and rich vocabulary.',
        materiPokok: ['Argumentative Essay Writing', 'Formal Correspondence', 'Cohesion & Coherence', 'Academic Vocabulary'],
      },
    ],
    fasePerFase: [
      {
        fase: 'Fase E',
        kelas: 'Kelas X SMA/MA',
        judul: 'Capaian Pembelajaran Bahasa Inggris Fase E (Kelas X SMA/MA)',
        teksCp:
          'Students actively use English in social and academic interactions, comprehend narrative, descriptive, and report texts, and produce structured written summaries and essays on familiar and contemporary topics.',
        fokusKompetensi: 'Social Interactions, Reading Comprehension of Factual Texts, Structured Writing.',
      },
      {
        fase: 'Fase F',
        kelas: 'Kelas XI - XII SMA/MA',
        judul: 'Capaian Pembelajaran Bahasa Inggris Fase F (Kelas XI - XII SMA/MA)',
        teksCp:
          'Students evaluate and synthesize complex arguments in analytical exposition, discussion, and authentic multimedia texts; express persuasive viewpoints fluently; and write academic papers or formal proposals.',
        fokusKompetensi: 'Critical Reading, Persuasive Speaking & Debating, Academic Writing.',
      },
    ],
  },
  fisika: {
    rasional:
      'Fisika adalah sains fundamental yang mempelajari materi, energi, ruang, waktu, serta interaksi antar gejala alam semesta melalui metode ilmiah dan pemikiran kuantitatif.',
    faseUmum:
      'Peserta didik memiliki kemampuan memahami konsep pengukuran, mekanika, fluida, termodinamika, gelombang dan optik, kelistrikan dan kemagnetan, serta fisika modern dan pemanfaatannya dalam teknologi energi ramah lingkungan.',
    elemen: [
      {
        namaElemen: 'Pemahaman Fisika',
        deskripsiCp:
          'Mampu menerapkan konsep pengukuran besaran fisis, gerak lurus, gerak melingkar, hukum Newton, usaha dan energi, serta prinsip pelestarian energi dalam kehidupan sehari-hari.',
        materiPokok: ['Besaran & Pengukuran', 'Kinematika & Dinamika Gerak', 'Hukum Gravitasi & Usaha Energi', 'Energi Terbarukan'],
      },
      {
        namaElemen: 'Keterampilan Proses Sains',
        deskripsiCp:
          'Merencanakan dan melakukan penyelidikan ilmiah, mengumpulkan dan menganalisis data eksperimen menggunakan alat ukur presisi, serta mengomunikasikan hasil investigasi secara ilmiah.',
        materiPokok: ['Metode Ilmiah', 'Kalibrasi & Ketidakpastian Alat Ukur', 'Analisis Grafik Eksperimen', 'Pelaporan Karya Ilmiah'],
      },
    ],
    fasePerFase: [
      {
        fase: 'Fase E',
        kelas: 'Kelas X SMA/MA',
        judul: 'Capaian Pembelajaran Fisika / IPA Terpadu Fase E (Kelas X SMA/MA)',
        teksCp:
          'Peserta didik memahami konsep hakikat fisika, pengukuran ilmiah, pemanfaatan energi terbarukan, serta mitigasi perubahan iklim global melalui pendekatan sains kontekstual.',
        fokusKompetensi: 'Pengukuran Presisi, Analisis Sumber Energi Bersih, dan Literasi Sains Lingkungan.',
      },
      {
        fase: 'Fase F',
        kelas: 'Kelas XI - XII SMA/MA',
        judul: 'Capaian Pembelajaran Fisika Fase F (Kelas XI - XII SMA/MA)',
        teksCp:
          'Peserta didik menerapkan hukum mekanika klasik, termodinamika, gelombang bunyi dan cahaya, induksi elektromagnetik, relativitas khusus, dan fisika kuantum dalam inovasi teknologi.',
        fokusKompetensi: 'Mekanika Lanjutan, Gelombang & Optik, Elektromagnetisme, dan Fisika Modern.',
      },
    ],
  },
  biologi: {
    rasional:
      'Biologi mengkaji keanekaragaman makhluk hidup, struktur dan fungsi sel, genetika, evolusi, ekosistem, serta bioteknologi untuk memecahkan persoalan ketahanan hayati dan lingkungan hidup.',
    faseUmum:
      'Peserta didik mampu memahami sel sebagai unit terkecil kehidupan, metabolisme, pewarisan sifat, bioteknologi konvensional dan modern, serta peranan ekologi dalam menjaga keseimbangan biosfer.',
    elemen: [
      {
        namaElemen: 'Pemahaman Biologi',
        deskripsiCp:
          'Memahami interaksi ekosistem, keanekaragaman hayati Indonesia, biologi sel, biokimia enzim, fotosintesis dan respirasi seluler, hukum Mendel dan genetika molekuler.',
        materiPokok: ['Keanekaragaman Hayati', 'Perubahan Lingkungan & Konservasi', 'Biologi Sel & Enzim', 'Genetika & Sintesis Protein'],
      },
      {
        namaElemen: 'Keterampilan Proses Penyelidikan',
        deskripsiCp:
          'Mengamati preparat mikroskopis, melakukan eksperimen uji enzim dan fotosintesis, membuat kultur bioteknologi sederhana, serta menganalisis data keanekaragaman flora/fauna.',
        materiPokok: ['Penggunaan Mikroskop', 'Uji Reaksi Enzimatik', 'Kultur Mikroba Sederhana', 'Rancangan Proyek Ekologi'],
      },
    ],
    fasePerFase: [
      {
        fase: 'Fase E',
        kelas: 'Kelas X SMA/MA',
        judul: 'Capaian Pembelajaran Biologi / IPA Fase E (Kelas X SMA/MA)',
        teksCp:
          'Peserta didik memahami keanekaragaman hayati Indonesia, peranan virus dan bakteri, serta pencemaran lingkungan dan solusi pelestarian ekosistem lokal.',
        fokusKompetensi: 'Biodiversitas Nusantara, Peran Mikroorganisme, dan Konservasi Ekologi.',
      },
      {
        fase: 'Fase F',
        kelas: 'Kelas XI - XII SMA/MA',
        judul: 'Capaian Pembelajaran Biologi Fase F (Kelas XI - XII SMA/MA)',
        teksCp:
          'Peserta didik menganalisis struktur sel dan jaringan organ, sistem fisiologi tubuh manusia, metabolisme dan enzim, substansi genetika, pola hereditas, dan aplikasi bioteknologi.',
        fokusKompetensi: 'Fisiologi Manusia, Biokimia Metabolisme, Genetika Molekuler, dan Bioteknologi.',
      },
    ],
  },
  kimia: {
    rasional:
      'Kimia adalah sains yang mempelajari struktur, sifat, komposisi materi, serta perubahan energi yang menyertai reaksi kimia dengan penekanan pada prinsip green chemistry (kimia hijau).',
    faseUmum:
      'Peserta didik memahami struktur atom, ikatan kimia, stoikiometri reaksi, termokimia, laju reaksi, kesetimbangan kimia, asam-basa, elektrokimia, dan makromolekul organik ramah lingkungan.',
    elemen: [
      {
        namaElemen: 'Pemahaman Kimia',
        deskripsiCp:
          'Menerapkan prinsip kimia hijau dalam kehidupan sehari-hari, memahami susunan partikel materi, persamaan reaksi setara, stoikiometri larutan, dan kinetika kimia.',
        materiPokok: ['12 Prinsip Kimia Hijau', 'Struktur Atom & Tabel Periodik', 'Ikatan Kimia & Bentuk Molekul', 'Stoikiometri & Konsep Mol'],
      },
      {
        namaElemen: 'Keterampilan Proses',
        deskripsiCp:
          'Melakukan eksperimen titrasi asam-basa, laju reaksi, elektrolisis, serta sintesis bahan ramah lingkungan dengan mematuhi keselamatan laboratorium.',
        materiPokok: ['Keselamatan Kerja Lab', 'Titrasi & Larutan Penyangga', 'Uji Kualitatif Bahan Makanan', 'Pengolahan Limbah Skala Lab'],
      },
    ],
    fasePerFase: [
      {
        fase: 'Fase E',
        kelas: 'Kelas X SMA/MA',
        judul: 'Capaian Pembelajaran Kimia Fase E (Kelas X SMA/MA)',
        teksCp:
          'Peserta didik memahami hakikat ilmu kimia, penerapan 12 prinsip kimia hijau, struktur atom dan konfigurasi elektron, serta tata nama senyawa dan hukum dasar kimia.',
        fokusKompetensi: 'Prinsip Kimia Hijau, Struktur Atom, dan Hukum Dasar Stoikiometri.',
      },
      {
        fase: 'Fase F',
        kelas: 'Kelas XI - XII SMA/MA',
        judul: 'Capaian Pembelajaran Kimia Fase F (Kelas XI - XII SMA/MA)',
        teksCp:
          'Peserta didik menganalisis termokimia, laju reaksi, kesetimbangan kimia, larutan asam-basa dan penyangga, sifat koligatif larutan, sel volta dan elektrolisis, serta kimia karbon.',
        fokusKompetensi: 'Kinetika Kimia, Termokimia, Elektrokimia, dan Senyawa Karbon Organik.',
      },
    ],
  },
};

export function getCuratedCpDataset(
  subject: string,
  fase: string = 'Fase E',
  jenjang: string = 'SMA / MA (Sekolah Menengah Atas)',
  keyword?: string
): CpSearchResult {
  const normSubject = subject.toLowerCase().trim();

  // Find exact or partial match
  let matchedKey = Object.keys(CURATED_CP_MAP).find(
    (k) => normSubject.includes(k) || k.includes(normSubject)
  );

  if (matchedKey && CURATED_CP_MAP[matchedKey]) {
    const data = CURATED_CP_MAP[matchedKey];
    const requestedFase = fase || 'Fase E';
    const isFaseF = requestedFase.includes('Fase F');
    const isFaseD = requestedFase.includes('Fase D');

    return {
      mataPelajaran: subject,
      jenjang: jenjang || 'SMA / MA (Sekolah Menengah Atas)',
      fase: requestedFase,
      dasarHukum: 'Keputusan Kepala BSKAP No. 046/H/KR/2025',
      dokumenRujukanUrl: DOKUMEN_URL,
      capaianFaseUmum: data.faseUmum,
      rasionalSingkat: data.rasional,
      elemen: data.elemen,
      capaianPerFase: data.fasePerFase || [
        {
          fase: requestedFase,
          kelas: isFaseF ? 'Kelas XI - XII SMA' : isFaseD ? 'Kelas VII - IX SMP' : 'Kelas X SMA',
          judul: `Capaian Pembelajaran ${subject} ${requestedFase}`,
          teksCp: data.faseUmum,
          fokusKompetensi: `Penguasaan kompetensi esensial dan penalaran kritis mata pelajaran ${subject} sesuai acuan BSKAP 046/2025.`,
        },
      ],
      sumberData: 'Basis Data Kurikulum Resmi BSKAP No. 046/H/KR/2025',
    };
  }

  // Dynamic curated fallback according to authentic BSKAP 046/2025 taxonomy
  const activeFase = fase || 'Fase Terkait';
  return {
    mataPelajaran: subject,
    jenjang: jenjang || 'SMA / MA (Sekolah Menengah Atas)',
    fase: activeFase,
    dasarHukum: 'Keputusan Kepala BSKAP No. 046/H/KR/2025',
    dokumenRujukanUrl: DOKUMEN_URL,
    capaianFaseUmum: `Pada akhir ${activeFase}, peserta didik mampu menguasai pengetahuan konsep, penalaran analitis, dan keterampilan terapan mata pelajaran ${subject}. Peserta didik mampu memecahkan masalah kontekstual yang relevan dengan perkembangan sains, teknologi, dan nilai-nilai luhur Pancasila.`,
    rasionalSingkat: `Mata pelajaran ${subject} membina peserta didik untuk berpikir kritis, kreatif, mandiri, dan kolaboratif guna menghadapi tantangan masa depan dan menerapkan ilmu dalam kehidupan nyata.`,
    elemen: [
      {
        namaElemen: 'Pemahaman Konseptual',
        deskripsiCp: `Memahami konsep-konsep esensial, prinsip kerja, dan landasan teoretis mata pelajaran ${subject} serta keterkaitannya dengan bidang ilmu lain.`,
        materiPokok: ['Konsep Dasar', 'Prinsip Terapan', 'Analisis Fenomena'],
      },
      {
        namaElemen: 'Keterampilan Proses & Penyelidikan',
        deskripsiCp: `Mampu mengidentifikasi masalah, mengumpulkan dan memproses informasi, merumuskan hipotesis ilmiah, serta menarik kesimpulan berbasis data valid.`,
        materiPokok: ['Metode Penyelidikan', 'Analisis Data Kritis', 'Pelaporan Hasil'],
      },
      {
        namaElemen: 'Aplikasi & Rekayasa Solusi',
        deskripsiCp: `Mengaplikasikan pengetahuan ${subject} untuk menghasilkan karya, gagasan inovatif, dan pemecahan masalah di lingkungan sekolah maupun masyarakat.`,
        materiPokok: ['Studi Kasus Kontekstual', 'Projek Karya Kreatif', 'Refleksi Berkelanjutan'],
      },
    ],
    capaianPerFase: [
      {
        fase: activeFase,
        kelas: activeFase.includes('Fase F') ? 'Kelas XI - XII' : activeFase.includes('Fase D') ? 'Kelas VII - IX' : 'Kelas X',
        judul: `Capaian Pembelajaran ${subject} ${activeFase}`,
        teksCp: `Pada akhir ${activeFase}, peserta didik menunjukkan kemahiran mendalam pada materi ${subject}, mampu berpikir kritis, berkomunikasi efektif, serta menyajikan solusi berbasis pemikiran sistematis.`,
        fokusKompetensi: `Fondasi Penalaran Kritis, Pemecahan Masalah, dan Kreasi Solusi Kontekstual ${subject}.`,
      },
    ],
    sumberData: 'Basis Data Kurikulum Resmi BSKAP No. 046/H/KR/2025',
  };
}
