/**
 * Katalog Resmi Capaian Pembelajaran (CP) Jenjang SMA
 * Berdasarkan Keputusan Kepala BSKAP Kemendikbudristek No. 046/H/KR/2025
 * Jenjang: SMA (Sekolah Menengah Atas) - Fase E (Kelas X) & Fase F (Kelas XI - XII)
 */

export interface OfficialSmaCp {
  id: string;
  mataPelajaran: string;
  jenjang: 'SMA';
  fase: 'Fase E' | 'Fase F';
  kelas: string;
  judul: string;
  teksCp: string;
  fokusKompetensi: string;
}

export const SMA_CP_CATALOG: OfficialSmaCp[] = [
  // --- INFORMATIKA ---
  {
    id: 'sma-inf-e',
    mataPelajaran: 'Informatika',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Informatika Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik mampu memahami peran sistem komputasi, menerapkan berpikir komputasional untuk menyelesaikan persoalan kompleks yang mengandung abstraksi, dekomposisi, pengenalan pola, dan perancangan algoritma; memanfaatkan aplikasi produktivitas dan kolaborasi digital; memahami jaringan komputer dan internet serta prinsip keamanan data; mengolah dan menganalisis data terstruktur; serta memahami dampak sosial informatika dan etika pemanfaatan kecerdasan buatan (AI).',
    fokusKompetensi: 'Berpikir komputasional, algoritma dasar, jaringan komputer, literasi digital, analisis data, etika AI.',
  },
  {
    id: 'sma-inf-f',
    mataPelajaran: 'Informatika',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Informatika Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu merancang dan mengimplementasikan program komputer berbasis pemrograman modular dan berorientasi objek; mengelola basis data relasional; menerapkan analisis data lanjutan; membangun antarmuka aplikasi interaktif; memahami konsep rekayasa perangkat lunak; serta merancang solusi berbasis teknologi kecerdasan artifisial secara kritis, etis, dan bertanggung jawab.',
    fokusKompetensi: 'Pemrograman modular/OOP, basis data relasional, visualisasi data, pengembangan perangkat lunak, integrasi AI.',
  },

  // --- KODING DAN KECERDASAN ARTIFISIAL ---
  {
    id: 'sma-ai-e',
    mataPelajaran: 'Koding dan Kecerdasan Artifisial',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Koding & AI Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik mampu memahami konsep fundamental algoritma, dasar pemrograman terstruktur dengan bahasa pemrograman modern (seperti Python/JavaScript); memahami prinsip kerja model kecerdasan artifisial, pemrosesan data latih (training data), prompt engineering, serta mengenali bias dan etika penggunaan AI dalam kehidupan sehari-hari.',
    fokusKompetensi: 'Dasar koding, logika percabangan/perulangan, konsep machine learning dasar, prompt engineering, etika AI.',
  },
  {
    id: 'sma-ai-f',
    mataPelajaran: 'Koding dan Kecerdasan Artifisial',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Koding & AI Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu merancang solusi komputasi cerdas menggunakan library machine learning dan generative AI; membangun pipeline data, melatih model klasifikasi/prediksi sederhana, mengintegrasikan API kecerdasan artifisial ke dalam aplikasi web/mobile, serta melakukan audit keamanan dan keadilan (fairness) pada sistem AI.',
    fokusKompetensi: 'Machine learning praktis, fine-tuning model, integrasi API AI, data preprocessing, evaluasi performa model AI.',
  },

  // --- MATEMATIKA ---
  {
    id: 'sma-mat-e',
    mataPelajaran: 'Matematika',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Matematika Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik mampu menggeneralisasi sifat-sifat bilangan berpangkat (eksponen) dan logaritma; menerapkan barisan dan deret aritmetika serta geometri untuk memodelkan situasi nyata; menyelesaikan sistem persamaan linear tiga variabel dan sistem pertidaksamaan linear dua variabel; menyelesaikan masalah menggunakan perbandingan trigonometri pada segitiga siku-siku; serta merepresentasikan dan menginterpretasi data menggunakan diagram pencar dan ukuran pemusatan/penyebaran data.',
    fokusKompetensi: 'Eksponen & logaritma, barisan & deret, SPLTV, trigonometri segitiga siku-siku, statistika analitis.',
  },
  {
    id: 'sma-mat-f',
    mataPelajaran: 'Matematika',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Matematika Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu memodelkan fenomena nyata menggunakan fungsi polinomial, fungsi rasional, fungsi eksponensial, dan fungsi trigonometri; menerapkan matriks dan transformasi geometri; memahami dan menerapkan konsep limit fungsi, turunan fungsi (diferensial), dan integral dalam pemecahan masalah optimasi dan laju perubahan; serta menerapkan prinsip peluang majemuk dan inferensi data.',
    fokusKompetensi: 'Fungsi lanjutan, matriks, kalkulus (limit, turunan, integral), peluang majemuk, pemodelan matematis.',
  },

  // --- BAHASA INDONESIA ---
  {
    id: 'sma-bind-e',
    mataPelajaran: 'Bahasa Indonesia',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Bahasa Indonesia Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik memiliki kemampuan berbahasa untuk berkomunikasi dan bernalar sesuai dengan tujuan, konteks sosial, akademis, dan dunia kerja. Peserta didik mampu mengevaluasi informasi berupa gagasan, pikiran, pandangan, atau pesan dari berbagai teks (laporan hasil observasi, anekdot, negosiasi, biografi, dan puisi); mengapresiasi teks sastra; serta menyajikan gagasan secara kritis, logis, dan santun dalam bentuk lisan maupun tulisan.',
    fokusKompetensi: 'Evaluasi kritis teks LHO, teks negosiasi, analisis struktur anekdot, penulisan esai argumen, apresiasi sastra.',
  },
  {
    id: 'sma-bind-f',
    mataPelajaran: 'Bahasa Indonesia',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Bahasa Indonesia Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu menganalisis, mengevaluasi, dan mengkreasi informasi berupa gagasan, pikiran, perasaan, dan pesan dari berbagai tipe teks kompleks (teks argumentasi, karya ilmiah, cerpen, novel, teks editorial/opini, drama); menggunakan kaidah kebahasaan baku dan teknik sitasi ilmiah; serta menyajikan orasi, debat, dan karya ilmiah yang orisinal dan bernilai aplikatif.',
    fokusKompetensi: 'Penulisan karya ilmiah, esai opini/editorial, kritik sastra, retorika debat, publikasi karya kreatif.',
  },

  // --- BAHASA INGGRIS ---
  {
    id: 'sma-bing-e',
    mataPelajaran: 'Bahasa Inggris',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Bahasa Inggris Fase E (Kelas X SMA)',
    teksCp: 'By the end of Phase E, students use English to communicate with teachers, peers, and others in a range of contexts for a variety of purposes. They identify the context, purpose, and main ideas of spoken and written texts (descriptive, recount, narrative, procedure); produce and respond to oral and written texts using appropriate sentence structures, vocabulary, and digital communication tools.',
    fokusKompetensi: 'Interactive speaking, descriptive & recount texts, procedural comprehension, vocabulary mastery in real contexts.',
  },
  {
    id: 'sma-bing-f',
    mataPelajaran: 'Bahasa Inggris',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Bahasa Inggris Fase F (Kelas XI - XII SMA)',
    teksCp: 'By the end of Phase F, students use spoken and written English smoothly and accurately to engage in debate, critical discussions, analytical exposition, report texts, and argumentative essays. They analyze and synthesize implicit and explicit arguments across diverse genres, present persuasive presentations, and express informed perspectives on global issues.',
    fokusKompetensi: 'Analytical exposition, argumentative writing, academic discussion, presentation skills, critical text analysis.',
  },

  // --- BIOLOGI ---
  {
    id: 'sma-bio-e',
    mataPelajaran: 'Biologi',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Biologi Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik memiliki kemampuan menciptakan solusi atas permasalahan lingkungan hidup di sekitarnya melalui pemahaman keanekaragaman hayati dan peranannya; virus dan peranannya dalam kehidupan; ekosistem dan interaksi antar komponennya; serta perubahan lingkungan dan pemanasan global. Peserta didik mampu melakukan penyelidikan ilmiah dan mengomunikasikan hasilnya secara kolaboratif.',
    fokusKompetensi: 'Keanekaragaman hayati Indonesia, peranan virus, keseimbangan ekosistem, konservasi lingkungan dan perubahan iklim.',
  },
  {
    id: 'sma-bio-f',
    mataPelajaran: 'Biologi',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Biologi Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik memahami struktur dan fungsi sel, mekanisme transpor membran, serta sintesis protein; keterkaitan struktur jaringan pada organ hewan dan tumbuhan; sistem organ tubuh manusia (sirkulasi, pencernaan, respirasi, ekskresi, koordinasi, reproduksi, dan imun); metabolisme sel (katabolisme dan anabolisme); hereditas dan pola-pola pewarisan sifat; evolusi; serta prinsip-prinsip bioteknologi modern.',
    fokusKompetensi: 'Biologi seluler, sistem organ fisiologi manusia, metabolisme & enzim, genetika molekuler, bioteknologi.',
  },

  // --- FISIKA ---
  {
    id: 'sma-fis-e',
    mataPelajaran: 'Fisika',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Fisika Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik mampu menerapkan prinsip pengukuran, besaran, dan satuan dengan ketepatan alat ukur; memahami hukum kekekalan energi, bentuk-bentuk energi alternatif terbarukan, efisiensi energi dalam kehidupan sehari-hari; serta mengidentifikasi dampak pemanasan global dan merancang proyek solusi energi hijau berkelanjutan.',
    fokusKompetensi: 'Ketelitian pengukuran ilmiah, analisis dimensi, hukum kekekalan energi, inovasi energi terbarukan ramah lingkungan.',
  },
  {
    id: 'sma-fis-f',
    mataPelajaran: 'Fisika',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Fisika Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu menerapkan konsep kinematika dan dinamika gerak (hukum Newton, gerak melingkar, gravitasi); momentum dan impuls; dinamika rotasi dan fluida; termodinamika; gelombang mekanik dan bunyi; optika geometri dan fisis; kelistrikan statis dan dinamis; induksi elektromagnetik; serta konsep dasar fisika modern dan relativitas khusus.',
    fokusKompetensi: 'Mekanika analitis, mekanika fluida, termodinamika, gelombang & optik, elektromagnetisme, fisika kuantum.',
  },

  // --- KIMIA ---
  {
    id: 'sma-kim-e',
    mataPelajaran: 'Kimia',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Kimia Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik mampu memahami struktur atom dan aplikasinya dalam tabel periodik unsur; memahami konsep ikatan kimia dan hubungannya dengan sifat fisis zat; menerapkan hukum-hukum dasar kimia dalam perhitungan stoikiometri sederhana; serta memahami prinsip dasar kimia hijau (green chemistry) untuk pelestarian lingkungan hidup.',
    fokusKompetensi: 'Struktur atom & tabel periodik, ikatan kimia, hukum dasar kimia, stoikiometri, 12 prinsip green chemistry.',
  },
  {
    id: 'sma-kim-f',
    mataPelajaran: 'Kimia',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Kimia Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu menerapkan konsep termokimia dan laju reaksi; menganalisis kesetimbangan kimia dan faktor-faktor pergeserannya; menguji sifat larutan asam-basa, larutan penyangga (buffer), dan hidrolisis garam; merancang sel elektrokimia (sel Volta dan elektrolisis); serta memahami struktur, tata nama, sifat, dan reaksi senyawa karbon (organik) dan makromolekul.',
    fokusKompetensi: 'Termokimia, kinetika & kesetimbangan kimia, larutan asam-basa & buffer, elektrokimia, senyawa karbon & polimer.',
  },

  // --- SEJARAH ---
  {
    id: 'sma-sej-e',
    mataPelajaran: 'Sejarah',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Sejarah Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik mampu memahami konsep dasar ilmu sejarah (manusia, ruang, waktu, diakronis, sinkronis); melakukan penelitian sejarah sederhana melalui pencarian sumber (heuristik), verifikasi (kritik sumber), interpretasi, dan historiografi; serta menganalisis perkembangan kehidupan masyarakat praaksara dan masuknya kebudayaan Hindu-Buddha serta Islam di Nusantara.',
    fokusKompetensi: 'Konsep ruang & waktu sejarah, metodologi penelitian sejarah, sejarah masa praaksara, kerajaan maritim Hindu-Buddha & Islam.',
  },
  {
    id: 'sma-sej-f',
    mataPelajaran: 'Sejarah',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Sejarah Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu menganalisis dinamika kolonialisme dan imperialisme barat di Indonesia; kebangkitan kesadaran nasional dan pergerakan kemerdekaan; proklamasi dan perjuangan mempertahankan kemerdekaan RI; dinamika politik masa Demokrasi Parlementer, Demokrasi Terpimpin, Orde Baru, hingga era Reformasi serta peranan Indonesia dalam perdamaian dunia.',
    fokusKompetensi: 'Kolonialisme & perlawanan bangsa, pergerakan nasional, diplomasi kemerdekaan, sejarah Orde Baru & Reformasi.',
  },

  // --- GEOGRAFI ---
  {
    id: 'sma-geo-e',
    mataPelajaran: 'Geografi',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Geografi Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik mampu memahami konsep dasar geografi, objek studi, prinsip, dan pendekatan geografi; membaca dan membuat peta dasar, memanfaatkan citra penginderaan jauh dan Sistem Informasi Geografis (SIG) sederhana; menganalisis dinamika litosfer, pedosfer, atmosfer, dan hidrosfer serta dampaknya terhadap kehidupan dan mitigasi bencana alam di Indonesia.',
    fokusKompetensi: 'Prinsip & pendekatan spasial, kartografi & SIG dasar, dinamika geosfer (litosfer, atmosfer, hidrosfer), mitigasi bencana.',
  },
  {
    id: 'sma-geo-f',
    mataPelajaran: 'Geografi',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Geografi Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu menganalisis sebaran flora dan fauna di Indonesia dan dunia; mengkaji pengelolaan sumber daya alam berwawasan lingkungan berkelanjutan; dinamika kependudukan dan bonus demografi; interaksi keruangan desa dan kota; serta pengembangan wilayah dan kerjasama antarnegara secara komprehensif.',
    fokusKompetensi: 'Biogeografi, AMDAL & keberlanjutan SDA, demografi spasial, tata ruang wilayah desa-kota, geopolitik global.',
  },

  // --- SOSIOLOGI ---
  {
    id: 'sma-sos-e',
    mataPelajaran: 'Sosiologi',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Sosiologi Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik mampu memahami fungsi sosiologi sebagai ilmu pengkaji masyarakat; mengidentifikasi identitas diri dalam pembentukan kelompok sosial; memahami ragam gejala sosial, interaksi sosial, nilai dan norma sosial; serta melakukan pengamatan sosial partisipatif untuk menganalisis keteraturan dan ketertiban sosial dalam keragaman masyarakat Indonesia.',
    fokusKompetensi: 'Identitas diri & kelompok, interaksi sosial, nilai & norma, gejala sosial kontemporer, observasi sosiologis.',
  },
  {
    id: 'sma-sos-f',
    mataPelajaran: 'Sosiologi',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Sosiologi Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu mengkaji struktur sosial, stratifikasi sosial, dan diferensiasi sosial; menganalisis dinamika kelompok sosial, konflik sosial dan resolusinya secara damai; memahami perubahan sosial, modernisasi, dan globalisasi; serta merancang aksi sosial dan advokasi berbasis riset untuk mengatasi ketimpangan sosial di masyarakat.',
    fokusKompetensi: 'Stratifikasi & diferensiasi sosial, manajemen & resolusi konflik, perubahan sosial & globalisasi, aksi advokasi sosial.',
  },

  // --- EKONOMI ---
  {
    id: 'sma-eko-e',
    mataPelajaran: 'Ekonomi',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Ekonomi Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik mampu memahami konsep kelangkaan, pilihan, dan skala prioritas; menganalisis peran pelaku ekonomi dalam diagram arus melingkar (circular flow diagram); memahami mekanisme pasar (permintaan, penawaran, dan harga keseimbangan); memahami fungsi bank dan lembaga keuangan non-bank; serta memiliki kecakapan literasi keuangan digital.',
    fokusKompetensi: 'Kelangkaan & biaya peluang, circular flow diagram, elastisitas pasar, sistem perbankan & uang digital.',
  },
  {
    id: 'sma-eko-f',
    mataPelajaran: 'Ekonomi',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Ekonomi Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu menganalisis pendapatan nasional, pertumbuhan dan pembangunan ekonomi, ketenagakerjaan, inflasi, serta kebijakan moneter dan fiskal; memahami peran APBN/APBD; menganalisis perdagangan internasional dan pasar bebas; serta menyusun tahapan siklus akuntansi perusahaan jasa dan dagang secara teliti.',
    fokusKompetensi: 'Makroekonomi (pendapatan nasional, inflasi, fiskal/moneter), APBN, perdagangan internasional, siklus akuntansi.',
  },

  // --- PENDIDIKAN PANCASILA (PPKn) ---
  {
    id: 'sma-ppkn-e',
    mataPelajaran: 'Pendidikan Pancasila (PPKn)',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Pendidikan Pancasila Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik mampu menganalisis cara pandang para pendiri bangsa tentang rumusan Pancasila; menerapkan nilai-nilai Pancasila dalam kehidupan berbangsa; memahami norma, hak, dan kewajiban warga negara sesuai UUD NRI Tahun 1945; mengidentifikasi dan mengapresiasi keberagaman suku, agama, ras, dan antargolongan; serta menjaga keutuhan NKRI.',
    fokusKompetensi: 'Historisitas Pancasila, pengamalan sila-sila Pancasila, konstitusi UUD 1945, Bhinneka Tunggal Ika, integritas NKRI.',
  },
  {
    id: 'sma-ppkn-f',
    mataPelajaran: 'Pendidikan Pancasila (PPKn)',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Pendidikan Pancasila Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu menganalisis kedudukan Pancasila sebagai ideologi terbuka; mengkaji dinamika demokrasi Pancasila dan sistem peradilan di Indonesia; mengevaluasi penegakan hak asasi manusia (HAM); mengkritisi ancaman terhadap ideologi dan integrasi nasional; serta berperan aktif sebagai warga negara global yang berkarakter Pancasila.',
    fokusKompetensi: 'Ideologi terbuka, supremasi hukum & penegakan HAM, sistem demokrasi, ketahanan nasional di era global.',
  },

  // --- PJOK ---
  {
    id: 'sma-pjok-e',
    mataPelajaran: 'PJOK',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'PJOK Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik mampu merancang, memodifikasi, dan menerapkan keterampilan gerak spesifik dalam permainan bola besar/kecil, atletik, dan beladiri; menganalisis konsep kebugaran jasmani terkait kesehatan dan keterampilan; serta mempraktikkan gaya hidup sehat, pencegahan penyakit menular, dan pertolongan pertama pada kecelakaan (P3K).',
    fokusKompetensi: 'Teknik gerak cabang olahraga, kebugaran jasmani terukur, budaya hidup sehat, pertolongan pertama.',
  },
  {
    id: 'sma-pjok-f',
    mataPelajaran: 'PJOK',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'PJOK Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu menyusun program peningkatan kebugaran jasmani pribadi; merancang strategi dan taktik beregu dalam berbagai aktivitas fisik; memimpin aktivitas jasmani secara sportif dan bertanggung jawab; serta menganalisis dampak aktivitas fisik terhadap kesehatan mental dan kesejahteraan hidup (wellness).',
    fokusKompetensi: 'Manajemen program kebugaran, taktik & kepemimpinan olahraga, kesehatan mental & kebugaran holistik.',
  },

  // --- PRAKARYA DAN KEWIRAUSAHAAN ---
  {
    id: 'sma-pkwu-e',
    mataPelajaran: 'Prakarya dan Kewirausahaan',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Prakarya & Kewirausahaan Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik mampu mengeksplorasi desain produk kerajinan/pengolahan/budidaya/rekayasa berbasis potensi kearifan lokal; merancang prototipe produk; menghitung biaya produksi dan harga jual; serta mempraktikkan teknik pemasaran digital ramah lingkungan.',
    fokusKompetensi: 'Eksplorasi bahan lokal, perancangan prototipe produk, analisis BEP/HPP, strategi pemasaran digital.',
  },
  {
    id: 'sma-pkwu-f',
    mataPelajaran: 'Prakarya dan Kewirausahaan',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Prakarya & Kewirausahaan Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu memproduksi karya inovatif bernilai ekonomi tinggi; menyusun business plan (rencana bisnis) terpadu; mengelola alur produksi dan standardisasi mutu; serta memasarkan produk melalui pameran kewirausahaan dan platform e-commerce.',
    fokusKompetensi: 'Inovasi produk skala wirausaha, penyusunan business plan, standardisasi mutu, scale-up bisnis kreatif.',
  },

  // --- SENI BUDAYA ---
  {
    id: 'sma-seni-e',
    mataPelajaran: 'Seni Budaya',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'Seni Budaya Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik mampu mengeksplorasi medium, teknik, dan gagasan dalam berkarya seni (seni rupa, musik, tari, atau teater) dengan mengangkat tema kebudayaan lokal Garut dan Nusantara; mengapresiasi karya seni secara kritis dan estetis; serta memamerkan atau mementaskan karya secara kolaboratif.',
    fokusKompetensi: 'Eksplorasi medium seni, apresiasi estetika nusantara, pameran/pementasan karya kolaboratif.',
  },
  {
    id: 'sma-seni-f',
    mataPelajaran: 'Seni Budaya',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'Seni Budaya Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu menciptakan karya seni konseptual yang orisinal dan kontekstual; melakukan kurasi karya dan manajemen pameran/pertunjukan; menganalisis relasi seni dengan isu sosial kontemporer; serta mendokumentasikan proses berkarya dalam portofolio digital.',
    fokusKompetensi: 'Kreasi seni konseptual, kurasi & manajemen pementasan, kritik seni mendalam, portofolio karya seni.',
  },

  // --- PENDIDIKAN AGAMA ISLAM DAN BUDI PEKERTI ---
  {
    id: 'sma-pai-e',
    mataPelajaran: 'Pendidikan Agama Islam dan Budi Pekerti',
    jenjang: 'SMA',
    fase: 'Fase E',
    kelas: 'Kelas X SMA',
    judul: 'PAI & Budi Pekerti Fase E (Kelas X SMA)',
    teksCp: 'Pada akhir Fase E, peserta didik mampu menganalisis ayat Al-Qur’an dan hadis tentang berpikir kritis, kontrol diri, dan toleransi beragama; memahami cabang-cabang iman (syu’abul iman); menerapkan prinsip muamalah (jual beli, asuransi syariah, perbankan syariah); meneladani keteladanan ulama Nusantara; serta mewujudkan akhlak mulia dalam interaksi sosial.',
    fokusKompetensi: 'Kajian ayat Al-Qur’an kritis, syu’abul iman, fiqih muamalah kontemporer, sejarah ulama Nusantara.',
  },
  {
    id: 'sma-pai-f',
    mataPelajaran: 'Pendidikan Agama Islam dan Budi Pekerti',
    jenjang: 'SMA',
    fase: 'Fase F',
    kelas: 'Kelas XI - XII SMA',
    judul: 'PAI & Budi Pekerti Fase F (Kelas XI - XII SMA)',
    teksCp: 'Pada akhir Fase F, peserta didik mampu menganalisis ayat Al-Qur’an tentang iptek, etos kerja, dan pelestarian alam; memahami konsep hukum waris (mawaris) dan munakahat (pernikahan); mengkaji gerakan pembaharuan Islam modern; serta menginternalisasi nilai-nilai Islam rahmatan lil ‘alamin dalam kehidupan bermasyarakat majemuk.',
    fokusKompetensi: 'Integrasi Islam & Iptek, fiqih munakahat & mawaris, sejarah pembaharuan Islam modern, moderasi beragama.',
  }
];

/**
 * Filter catalog by subject name and optional grade/phase
 */
export function getOfficialSmaCps(subjectName: string, gradeOrPhase?: string): OfficialSmaCp[] {
  const normSub = (subjectName || '').toLowerCase().trim();
  
  return SMA_CP_CATALOG.filter((item) => {
    const itemSub = item.mataPelajaran.toLowerCase();
    const matchSub =
      !normSub ||
      itemSub === normSub ||
      itemSub.includes(normSub) ||
      normSub.includes(itemSub);

    if (!matchSub) return false;

    if (!gradeOrPhase) return true;
    const normGrade = gradeOrPhase.toLowerCase();

    if (normGrade.includes('x') && !normGrade.includes('xi') && !normGrade.includes('xii')) {
      return item.fase === 'Fase E';
    }
    if (normGrade.includes('xi') || normGrade.includes('xii') || normGrade.includes('11') || normGrade.includes('12')) {
      return item.fase === 'Fase F';
    }
    if (normGrade.includes('e')) return item.fase === 'Fase E';
    if (normGrade.includes('f')) return item.fase === 'Fase F';

    return true;
  });
}
