import { GoogleGenAI } from '@google/genai';
import { getCuratedCpDataset } from './cpDatabase';
import { resolveRelevantYoutubeVideo } from './youtubeLibrary';

export function parseJsonSafely(text: string) {
  if (!text) throw new Error('Respon AI kosong');
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```.*$/s, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');

    if (firstBrace !== -1 && lastBrace > firstBrace && (firstBracket === -1 || firstBrace < firstBracket)) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    } else if (firstBracket !== -1 && lastBracket > firstBracket) {
      const candidate = cleaned.slice(firstBracket, lastBracket + 1);
      return JSON.parse(candidate);
    }
    throw new Error('Gagal mengurai format respon AI.');
  }
}

export function getClientGeminiApiKey(): string {
  const metaEnv = (import.meta as any).env || {};
  if (metaEnv.VITE_GEMINI_API_KEY && typeof metaEnv.VITE_GEMINI_API_KEY === 'string' && metaEnv.VITE_GEMINI_API_KEY.trim()) {
    return metaEnv.VITE_GEMINI_API_KEY.trim();
  }
  if (metaEnv.GEMINI_API_KEY && typeof metaEnv.GEMINI_API_KEY === 'string' && metaEnv.GEMINI_API_KEY.trim()) {
    return metaEnv.GEMINI_API_KEY.trim();
  }
  try {
    const local = localStorage.getItem('gemini_api_key') || localStorage.getItem('GEMINI_API_KEY');
    if (local && local.trim()) return local.trim();
  } catch {
    // Ignore localStorage issues
  }
  return '';
}

async function executeClientGemini(prompt: string) {
  const apiKey = getClientGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'Server backend Vercel belum merespons dan GEMINI_API_KEY belum terdeteksi. ' +
      'Pastikan Anda telah menambahkan "GEMINI_API_KEY" pada menu Project Settings -> Environment Variables di Dashboard Vercel lalu Redeploy.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const models = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest'
  ];
  let lastErr: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        const text = response.text;
        if (text) return parseJsonSafely(text);
      } catch (err: any) {
        console.warn(`[Client AI] Model ${model} attempt ${attempt + 1} gagal atau sibuk:`, err?.message);
        lastErr = err;
        const isUnavailable = err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE') || err?.message?.includes('high demand');
        const isQuotaOrRateLimit = err?.status === 429 || err?.message?.includes('429') || err?.message?.toLowerCase()?.includes('quota') || err?.message?.toLowerCase()?.includes('resource_exhausted');

        if (isUnavailable) {
          // Model 503 (high demand). Retrying after short delay before moving to next model
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            continue;
          }
          break;
        } else if (isQuotaOrRateLimit) {
          // Quota exhausted on this model, switch immediately to next available model
          break;
        } else {
          break;
        }
      }
    }
  }

  throw lastErr || new Error('Gagal menghubungi AI Gemini.');
}

// Client-side fallback for generating material with meetings & gamification
async function clientFallbackGenerateMaterial(
  subject: string,
  grade: string,
  topic: string,
  description?: string,
  pertemuanList?: any[],
  selectedMeetingIndex?: string
) {
  const fullTopic = topic + (description ? ` - Petunjuk Khusus Guru: ${description}` : '');
  const meetings = Array.isArray(pertemuanList) ? pertemuanList : [];
  const hasMultiple = meetings.length > 0 && selectedMeetingIndex === 'ALL';

  let prompt = `Sebagai asisten guru ahli pembelajaran digital interaktif, joyful & mindful learning, serta gamifikasi edukatif untuk siswa SMA di SMAN 21 Garut:
Mata Pelajaran: ${subject}
Jenjang / Tingkat: SMA Kelas ${grade}
Capaian Pembelajaran / Topik: "${fullTopic}"
`;

  if (hasMultiple) {
    prompt += `\nJUMLAH PERTEMUAN:
Bahan Ajar mengacu pada Modul Ajar dengan ${meetings.length} Pertemuan:
${meetings.map((m: any, idx: number) => `* Pertemuan ${idx + 1}: ${m.nama || `Pertemuan ${idx + 1}`}`).join('\n')}
Wajib buat array "pertemuanMateri" dengan TEPAT ${meetings.length} item sesuai pertemuan di atas!
`;
  }

  prompt += `
Buat bahan ajar dengan gamifikasi seru (Misi Siswa, Poin XP, Tantangan Aktif, Kuis Interaktif).
Kembalikan respon DALAM FORMAT JSON MURNI valid persis berikut:
{
  "imageUrl": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80",
  "videoUrl": "URL video YouTube edukasi yang relevan (misalnya dari Kok Bisa, Zenius, Ruangguru, Kemendikbud, atau format pencarian https://www.youtube.com/results?search_query=...)",
  "mediaType": "both",
  "mindMap": [
    "Konsep Inti 1",
    "Konsep Inti 2",
    "Konsep Inti 3",
    "Aplikasi Nyata"
  ],
  "petaKonsep": {
    "topikUtama": "Nama Topik Sentral",
    "ringkasan": "Intisari keterkaitan konsep dalam 1-2 kalimat pemantik",
    "cabang": [
      {
        "id": "cabang-1",
        "nama": "1. Konsep Dasar & Pondasi",
        "deskripsi": "Prinsip utama yang wajib dipahami siswa",
        "kataKunci": ["Poin A", "Poin B", "Poin C"],
        "warna": "blue"
      },
      {
        "id": "cabang-2",
        "nama": "2. Mekanisme & Contoh Nyata",
        "deskripsi": "Bagaimana konsep ini bekerja di kehidupan nyata",
        "kataKunci": ["Poin D", "Poin E"],
        "warna": "emerald"
      },
      {
        "id": "cabang-3",
        "nama": "3. Analisis Kritis & Solusi Masa Depan",
        "deskripsi": "Penerapan praktis, inovasi, dan tantangan yang harus dipecahkan siswa",
        "kataKunci": ["Poin F", "Poin G"],
        "warna": "purple"
      }
    ]
  },
  "gamifikasi": {
    "judulMisi": "Nama Misi Petualangan Siswa (contoh: 'Misi Detektif: Menguak Rahasia ...')",
    "skenario": "Latar belakang narasi misi yang seru untuk memicu antusiasme siswa SMA",
    "totalXp": 150,
    "badgeReward": {
      "nama": "Gelar Master Penjelajah",
      "icon": "🏆",
      "deskripsi": "Diberikan kepada siswa yang berhasil menuntaskan seluruh tantangan eksplorasi aktif"
    },
    "tantanganAktif": [
      {
        "level": 1,
        "judul": "Tantangan 1: Observasi Detektif",
        "instruksi": "Petunjuk aktivitas aktif mandiri/kelompok",
        "tekaTeki": "Teka-teki atau fenomena awal pemantik rasa ingin tahu",
        "aksiSiswa": "Aksi aktif yang harus dikerjakan siswa",
        "xp": 50
      },
      {
        "level": 2,
        "judul": "Tantangan 2: Uji Eksperimen & Logika",
        "instruksi": "Petunjuk eksplorasi konsep",
        "tekaTeki": "Kasus pemecahan masalah atau analogi kritis",
        "aksiSiswa": "Aksi kolaborasi aktif siswa",
        "xp": 50
      },
      {
        "level": 3,
        "judul": "Tantangan 3: Kreasi Solusi Cerdas",
        "instruksi": "Petunjuk aksi penutup",
        "tekaTeki": "Tantangan akhir untuk merumuskan ide kreatif",
        "aksiSiswa": "Presentasi kilat atau perumusan solusi tim",
        "xp": 50
      }
    ],
    "skenarioDebatKelas": "Pertanyaan dilematis atau mosi debat seru untuk memicu diskusi vokal dan aktif seluruh siswa di kelas"
  },
  "funFact": "1 fakta mengejutkan / unik / 'tahukah kamu' yang memicu rasa penasaran siswa SMA tentang topik ini.",
  "realWorldApplication": "Studi kasus / penerapan seru topik ini di kehidupan sehari-hari atau dunia kerja/teknologi.",
  "pertemuanMateri": [
    {
      "pertemuanKe": 1,
      "judulPertemuan": "Judul Pertemuan 1",
      "tujuanSingkat": "Tujuan pemahaman siswa",
      "materiInti": "Penjelasan konsep akrab dan analogi seru",
      "gamifikasi": {
        "misiSiswa": "Misi Eksplorasi Siswa",
        "instruksiMisi": "Langkah aktif bereksplorasi",
        "tantanganAktif": "Teka-teki atau studi kasus pemantik",
        "xpReward": 50,
        "badgeName": "Penjelajah Konsep",
        "badgeIcon": "🎯"
      },
      "skenarioDiskusi": "Dilema atau pertanyaan aktif untuk kelas"
    }
  ],
  "materials": [
    {
      "title": "1. Pengantar Konsep & Cerita / Analogi Seru",
      "content": "Jelaskan pembuka materi dengan bahasa akrab siswa SMA, gunakan analogi kehidupan sehari-hari yang mudah diingat."
    },
    {
      "title": "2. Pembahasan Inti & Konsep Kunci",
      "content": "Penjelasan mendalam, lengkap dengan poin-poin terstruktur, definisi, dan contoh konkret."
    },
    {
      "title": "3. Tips Cepat Paham & Rangkuman",
      "content": "Cara mudah mengingat / mnemonik / ringkasan intisari materi agar siswa tidak mudah lupa."
    }
  ],
  "interactiveQuestions": [
    {
      "question": "Pertanyaan pancingan / kuis pemahaman 1?",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "answer": "A",
      "explanation": "Penjelasan ringkas mengapa jawaban ini benar."
    },
    {
      "question": "Pertanyaan pancingan / kuis pemahaman 2?",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "answer": "B",
      "explanation": "Penjelasan ringkas mengapa jawaban ini benar."
    }
  ]
}`;

  const res = await executeClientGemini(prompt);
  if (res && typeof res === 'object') {
    const resolved = resolveRelevantYoutubeVideo(subject, topic, res.videoUrl);
    res.videoUrl = resolved.videoUrl;
    if (!res.videoTitle) res.videoTitle = resolved.videoTitle;
    if (!res.videoChannel) res.videoChannel = resolved.videoChannel;
  }
  return res;
}

// Client-side fallback for generating questions
async function clientFallbackGenerateQuestions(topic: string, type: string, count: number) {
  let prompt = `Sebagai asisten guru SMAN 21 Garut, buatkan paket soal evaluasi/ujian berkualitas tinggi, mendidik, dan jelas tentang materi: "${topic}".\n`;
  prompt += `Jumlah butir soal yang dibuat: Tepat ${count} butir soal.\n`;
  prompt += `Jenis soal: ${type === 'pg' ? 'Semua Pilihan Ganda (PG) 4 opsi (A, B, C, D)' : type === 'essay' ? 'Semua Esai / Uraian Terbuka' : 'Kombinasi Campuran (Pilihan Ganda & Esai)'}.\n`;
  prompt += `Berikan respons DALAM FORMAT JSON ARRAY murni dengan struktur tiap item:\n`;
  prompt += `[\n`;
  prompt += `  {\n`;
  prompt += `    "type": "pg",\n`;
  prompt += `    "question": "Kalimat pertanyaan pilihan ganda yang jelas?",\n`;
  prompt += `    "options": ["Teks pilihan A", "Teks pilihan B", "Teks pilihan C", "Teks pilihan D"],\n`;
  prompt += `    "answer": "A",\n`;
  prompt += `    "explanation": "Penjelasan singkat jawaban yang tepat."\n`;
  prompt += `  },\n`;
  prompt += `  {\n`;
  prompt += `    "type": "essay",\n`;
  prompt += `    "question": "Kalimat pertanyaan esai pemahaman konsep?",\n`;
  prompt += `    "answerKey": "Kunci jawaban dan poin kriteria penilaian guru."\n`;
  prompt += `  }\n`;
  prompt += `]`;

  return await executeClientGemini(prompt);
}

// Client-side fallback for grading essay
async function clientFallbackGradeEssay(question: string, answerKey: string, studentAnswer: string) {
  const prompt = `Sebagai guru penilai ahli SMAN 21 Garut, nilai jawaban esai siswa berikut secara objektif dan mendidik.
Pertanyaan: "${question}"
Kunci Jawaban / Kriteria Guru: "${answerKey}"
Jawaban Siswa: "${studentAnswer || '(Tidak menjawab)'}"

Berikan penilaian dalam FORMAT JSON murni berikut:
{
  "score": (nilai angka bulat skala 0-100),
  "feedback": "Umpan balik konstruktif, apresiasi terhadap pemahaman siswa, dan poin mana yang perlu disempurnakan."
}`;

  return await executeClientGemini(prompt);
}

// Client-side fallback for generating Modul Ajar
async function clientFallbackGenerateModulAjar(payload: ModulAjarPayload) {
  const schoolName = payload.namaSekolah || 'SMAN 21 Garut';
  const schoolNpsn = payload.npsn || '20209194';
  const schoolAddress = payload.alamatSekolah || 'Jl. Raya Talegong No. 21, Kec. Talegong, Kab. Garut, Jawa Barat 44167';
  const teacherName = payload.namaGuru || 'Guru Pengampu';
  const teacherNip = payload.nipGuru || '-';
  const totalMeetings = Number(payload.pertemuanCount) || 2;
  const timeAllocation = payload.alokasiWaktu || '2 x 45 Menit (2 JP)';
  const methodChosen = payload.metode || 'Problem-Based Learning (PBL)';
  const targetGrade = payload.grade || 'Fase E (Kelas X)';
  const academicYear = payload.tahunPelajaran || '2026/2027';
  const currentSemester = payload.semester || 'Ganjil';
  const headmaster = payload.namaKepsek || 'Agus Supriatna, S.Pd., M.Si.';
  const headmasterNip = payload.nipKepsek || '';

  const meetingMethods: string[] = Array.isArray(payload.pertemuanMetode) && payload.pertemuanMetode.length > 0
    ? payload.pertemuanMetode.slice(0, totalMeetings)
    : Array(totalMeetings).fill(methodChosen);

  while (meetingMethods.length < totalMeetings) {
    meetingMethods.push(methodChosen);
  }

  const meetingMethodsDesc = meetingMethods
    .map((m, idx) => `Pertemuan ${idx + 1}: ${m}`)
    .join('; ');

  const is5JP = (timeAllocation || '').includes('5 JP') || (timeAllocation || '').includes('5 jp') || (timeAllocation || '').includes('5 x 45');

  const prompt = `Anda adalah seorang ahli pengembang kurikulum nasional dan pakar Pembelajaran Mendalam (Deep Learning) serta Kurikulum Merdeka untuk jenjang SMA di ${schoolName}.
Tugas Anda adalah merancang "MODUL AJAR PEMBELAJARAN MENDALAM (DEEP LEARNING)" yang sangat komprehensif, operasional, berbobot tinggi, dan siap pakai.

DATA MASUKAN:
- Nama Satuan Pendidikan: ${schoolName}
- NPSN: ${schoolNpsn}
- Alamat Sekolah: ${schoolAddress}
- Nama Penyusun (Guru): ${teacherName}
- NIP/ID Guru: ${teacherNip}
- Kepala Sekolah: ${headmaster} ${headmasterNip ? `(NIP. ${headmasterNip})` : ''}
- Tahun Pelajaran: ${academicYear}
- Semester: ${currentSemester}
- Mata Pelajaran: ${payload.subject}
- Fase / Kelas: ${targetGrade}
- Capaian Pembelajaran (CP): "${payload.cp}"
- Jumlah Pertemuan: Tepat ${totalMeetings} Pertemuan
- Alokasi Waktu: ${timeAllocation}
- Metode Pembelajaran Tiap Pertemuan:
${meetingMethods.map((m, idx) => `  * Pertemuan ${idx + 1}: ${m}`).join('\n')}
${payload.tanggalCetak ? `- Tanggal Cetak Modul / Titimangsa: ${payload.tanggalCetak}` : ''}

ATURAN KHUSUS METODE PEMBELAJARAN & SINTAKS PER PERTEMUAN:
Setiap pertemuan di array "pertemuan" HARUS memiliki metode tersendiri sesuai pilihan guru di atas:
${meetingMethods.map((m, idx) => `- Pertemuan ${idx + 1}: Wajib menerapkan sintaks resmi dari metode "${m}" pada Kegiatan Inti.`).join('\n')}

ATURAN KRUSIAL & WAJIB: KEGIATAN INTI & AKTIVITAS GURU (HARUS SANGAT DETAIL & MENGACU PADA MATERI SPESIFIK):
Pada bagian "kegiatanInti", setiap pertemuan memuat array "sintaks" sesuai metode yang digunakan.
Untuk SETIAP tahap sintaks:
1. DESKRIPSI "aktivitasGuru" HARUS SANGAT DETAIL (MINIMAL 3-5 KALIMAT KOMPREHENSIF) DAN MENGACU LANGSUNG PADA SUB-MATERI SPESIFIK:
   - DILARANG KERAS menggunakan kalimat generik/singkat seperti "Guru memfasilitasi diskusi", "Guru membimbing siswa", "Guru menjelaskan materi", atau "Guru memberikan LKPD".
   - Guru HARUS menguraikan secara konkret dan kontekstual:
     a) Konsep esensial sub-materi apa yang dipaparkan atau dimodelkan guru (sebutkan istilah teknis ilmiah, dalil/teori/rumus/prinsip/studi kasus nyata yang relevan dengan topik mata pelajaran "${payload.subject}" dan CP "${payload.cp}").
     b) Pertanyaan penuntun mendalam (scaffolding question) apa yang dilontarkan guru untuk menuntun alur berpikir logis peserta didik dan mencegah miskonsepsi pada materi tersebut.
     c) Langkah konkret guru saat mendemonstrasikan fenomena materi, menampilkan stimulus visual/data/studi kasus, atau membagikan bahan ajar terkait topik tersebut.
     d) Bagaimana guru berkeliling membimbing kelompok yang mengalami kesulitan (diferensiasi proses), mengecek pemahaman, serta memberikan konfirmasi dan penguatan konsep materi secara ilmiah.
2. DESKRIPSI "aktivitasSiswa" HARUS MENGGAMBARKAN AKSI EKSPLORATIF NYATA SISWA TERHADAP MATERI:
   - Menjabarkan secara operasional (minimal 3-4 kalimat) bagaimana siswa menganalisis data materi, berdiskusi membedah kasus materi dalam kelompok, menguji hipotesis konsep, dan menyusun solusi atau kesimpulan materi.
3. "fokusMendalam": Tuliskan fokus dimensi Deep Learning yang dicapai (misal: Mindful Critical Inquiry, Meaningful Conceptual Understanding, Joyful Collaboration, atau Diferensiasi Konten/Proses).

ATURAN RINCIAN KEGIATAN PENDAHULUAN DAN PENUTUP:
- Pada "kegiatanPendahuluan" (durasi: 15 Menit):
  Wajib memuat minimal 6-7 langkah konkret:
  1. Orientasi & Penumbuhan Budi Pekerti (salam hangat, doa bersama, cek kebersihan/kerapian kelas).
  2. Presensi & Kesiapan Belajar fisik-psikologis.
  3. Mindfulness / Ice Breaking (Teknik STOP / Joyful Learning).
  4. Apersepsi Kontekstual materi prasyarat.
  5. Pertanyaan Pemantik & Motivasi bermakna.
  6. Penyampaian Capaian & Tujuan Pembelajaran serta skenario aktivitas & teknik penilaian.
  7. Pembagian kelompok heterogen (diferensiasi) dan kesepakatan kelas.

- Pada "kegiatanPenutup" (durasi: 15 Menit):
  Wajib memuat minimal 5-6 langkah konkret:
  1. Simpulan Bersama merangkum konsep esensial.
  2. Refleksi Terbimbing Peserta Didik (metakognisi).
  3. Asesmen Formatif Cepat (Exit ticket / kuis kilat).
  4. Apresiasi & Penguatan Positif Guru.
  5. Tindak Lanjut (remedial/pengayaan) dan info pertemuan berikutnya.
  6. Doa Penutup & Salam penuh syukur.

ATURAN DIMENSI PROFIL LULUSAN (8 DIMENSI LULUSAN):
Gunakan "Dimensi Profil Lulusan" yang wajib memuat 8 Dimensi Lulusan:
1. Keimanan dan Ketakwaan terhadap Tuhan YME
2. Kewargaan
3. Penalaran Kritis
4. Kreativitas
5. Kolaborasi
6. Kemandirian
7. Kesehatan
8. Komunikasi

WAJIB MENGEMBALIKAN RESPONS DALAM FORMAT JSON MURNI YANG VALID dengan struktur:
{
  "identitas": {
    "namaSekolah": "${schoolName}",
    "npsn": "${schoolNpsn}",
    "alamatSekolah": "${schoolAddress}",
    "namaGuru": "${teacherName}",
    "nipGuru": "${teacherNip}",
    "mataPelajaran": "${payload.subject}",
    "fase": "${targetGrade}",
    "alokasiWaktu": "${timeAllocation}",
    "jumlahPertemuan": ${totalMeetings},
    "tahunPelajaran": "${academicYear}",
    "semester": "${currentSemester}",
    "namaKepsek": "${headmaster}",
    "nipKepsek": "${headmasterNip}",
    "metodeGabungan": "${meetingMethodsDesc}",
    "tanggalCetak": "${payload.tanggalCetak || ''}"
  },
  "capaianPembelajaran": "${payload.cp}",
  "elemenCp": "Elemen/Domain konten utama CP",
  "tujuanPembelajaran": [
    "TP operasional 1 terukur dengan KKO",
    "TP operasional 2 terukur dengan KKO",
    "TP operasional 3 terukur dengan KKO"
  ],
  "pemahamanBermakna": "Intisari pemahaman bermakna yang bertahan lama",
  "pertanyaanPemantik": [
    "Pertanyaan pemantik terbuka 1?",
    "Pertanyaan pemantik terbuka 2?"
  ],
  "dimensiProfilLulusan": [
    "Keimanan dan Ketakwaan terhadap Tuhan YME: Uraian kontekstual spiritual",
    "Kewargaan: Uraian kontekstual kepedulian sosial",
    "Penalaran Kritis: Uraian analisis logis dan data",
    "Kreativitas: Uraian solusi inovatif",
    "Kolaborasi: Uraian gotong royong dan kerja tim",
    "Kemandirian: Uraian inisiatif dan regulasi diri",
    "Kesehatan: Uraian kesejahteraan fisik-mental",
    "Komunikasi: Uraian presentasi dan dialog"
  ],
  "prinsipPembelajaranMendalam": {
    "mindful": "Penerapan berkesadaran penuh",
    "meaningful": "Keterkaitan topik dengan realitas",
    "joyful": "Aktivitas eksploratif menggembirakan"
  },
  "saranaPrasarana": {
    "media": ["Media digital, infografis, video interaktif"],
    "alatBahan": ["Laptop, proyektor, smartphone, LKPD"],
    "sumberBelajar": ["Buku teks Kurikulum Merdeka, artikel terpercaya"]
  },
  "modelMetode": {
    "nama": "${meetingMethodsDesc}",
    "alasanPemilihan": "Alasan pedagogis pemilihan metode",
    "sintaksUtama": ["Tahap 1", "Tahap 2", "Tahap lanjutan"]
  },
  "pertemuan": [
    {
      "nomor": 1,
      "topik": "Topik spesifik pertemuan 1",
      "metode": "${meetingMethods[0] || methodChosen}",
      "alokasiWaktu": "${is5JP ? '2 x 45 Menit (2 JP)' : timeAllocation}",
      "tujuanPertemuan": "Tujuan spesifik pertemuan 1",
      "kegiatanPendahuluan": {
        "durasi": "15 Menit",
        "langkah": [
          "Orientasi & Penumbuhan Budi Pekerti: Guru membuka pembelajaran dengan salam hangat dan memimpin doa.",
          "Presensi & Kesiapan Ruang: Guru memeriksa kebersihan kelas dan mengecek kehadiran siswa.",
          "Mindfulness & Ice Breaking: Guru memandu teknik STOP untuk memusatkan fokus belajar.",
          "Apersepsi Kontekstual: Mengaitkan materi sebelumnya dengan topik hari ini.",
          "Pertanyaan Pemantik & Motivasi: Mengajukan pertanyaan pemantik kontekstual.",
          "Penyampaian Tujuan & Asesmen: Menyampaikan tujuan dan kriteria penilaian.",
          "Kontrak Belajar & Kelompok: Pembagian kelompok heterogen dan kesepakatan kelas."
        ]
      },
      "kegiatanInti": {
        "durasi": "${is5JP ? '60 Menit' : '60 Menit'}",
        "metode": "${meetingMethods[0] || methodChosen}",
        "sintaks": [
          {
            "tahap": "Tahap 1 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Guru menayangkan video kontekstual/studi kasus nyata mengenai fenomena [sub-materi topik], kemudian memaparkan konsep kunci dan terminologi materi secara interaktif. Guru melontarkan pertanyaan penuntun (scaffolding): '[Pertanyaan mendalam guru terkait konsep materi]', membimbing siswa mencermati variabel permasalahan, serta membagikan LKPD terstruktur seraya memitigasi miskonsepsi awal pada materi tersebut.",
            "aktivitasSiswa": "Peserta didik mengamati tayangan stimulus materi dengan saksama (Mindful), mencatat data/fakta kunci, merespons pertanyaan penuntun guru dengan nalar kritis, dan berdiskusi awal bersama anggota kelompok untuk merumuskan masalah utama.",
            "fokusMendalam": "Mindful Critical Inquiry & Kontekstualisasi Materi"
          },
          {
            "tahap": "Tahap 2 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Guru mengorganisasikan peserta didik ke dalam kelompok belajar heterogen, menjelaskan pembagian peran, dan memberikan pengarahan langkah investigasi pada LKPD [topik materi]. Guru memfasilitasi kelompok yang memerlukan pendampingan khusus (diferensiasi proses) dan memastikan tiap kelompok memahami alur eksplorasi konsep materi.",
            "aktivitasSiswa": "Peserta didik berkumpul dalam kelompok, membagi peran kerja tim, membaca literatur materi dari buku teks dan modul digital, serta menyusun rencana penyelidikan masalah materi secara kolaboratif.",
            "fokusMendalam": "Joyful Collaboration & Diferensiasi Proses"
          },
          {
            "tahap": "Tahap 3 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Guru berkeliling memantau jalannya diskusi kelompok, mengajukan pertanyaan penuntun saat siswa mengolah data/analisis kasus materi, memberikan bimbingan proporsional agar siswa mampu mengaitkan teori materi dengan temuan data, serta mengecek ketelitian penalaran konsep tiap kelompok.",
            "aktivitasSiswa": "Peserta didik melakukan penyelidikan, mengolah data materi pada LKPD, mendiskusikan hubungan sebab-akibat antar-konsep, memvalidasi temuan dengan teori rujukan, dan merumuskan solusi alternatif atas masalah materi.",
            "fokusMendalam": "Meaningful Problem Solving & Penalaran Kritis"
          },
          {
            "tahap": "Tahap 4 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Guru mengundi atau menentukan urutan presentasi karya, menetapkan tata tertib forum diskusi kelas, memfasilitasi jalannya sesi tanya jawab antar-kelompok, serta mencatat poin-poin argumen dan pertanyaan penting siswa terkait pemahaman konsep materi.",
            "aktivitasSiswa": "Perwakilan kelompok mempresentasikan hasil analisis studi kasus materi di depan kelas secara percaya diri, sedangkan peserta didik dari kelompok lain menyimak aktif, memberikan tanggapan konstruktif, dan mengajukan pertanyaan kritis.",
            "fokusMendalam": "Komunikasi Efektif & Kolaborasi Reflektif"
          },
          {
            "tahap": "Tahap 5 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Guru membimbing peserta didik mengonfirmasi kesahihan analisis materi dari tiap kelompok, meluruskan miskonsepsi yang sempat muncul selama presentasi, memberikan penguatan ilmiah komprehensif atas dalil/konsep kunci materi, serta memvalidasi kesimpulan akhir pembelajaran.",
            "aktivitasSiswa": "Peserta didik menyimak penguatan konsep materi dari guru, menyelaraskan catatan hasil investigasi dengan konsep ilmiah yang benar, merefleksikan proses penyelidikan kelompok, dan menyepakati rumusan simpulan bersama.",
            "fokusMendalam": "Penguatan Konseptual & Metakognisi Mendalam"
          }
        ]
      },
      "kegiatanPenutup": {
        "durasi": "15 Menit",
        "langkah": [
          "Simpulan Bersama: Menarik kesimpulan esensial konsep materi.",
          "Refleksi Terbimbing: Siswa menjawab pertanyaan refleksi metakognitif.",
          "Asesmen Formatif Cepat: Mengisi exit ticket pemahaman mandiri.",
          "Apresiasi & Penguatan Positif: Guru memberikan umpan balik apresiatif.",
          "Tindak Lanjut & Info Pertemuan Berikutnya: Pengarahan materi pertemuan depan.",
          "Doa Penutup & Salam: Penutupan dengan rasa syukur dan doa."
        ]
      }
    }
  ],
  "asesmen": {
    "diagnostik": {
      "teknik": "Tes diagnostik awal",
      "instrumen": "Daftar pertanyaan apersepsi"
    },
    "formatif": {
      "teknik": "Observasi proses diskusi kelompok dan LKPD",
      "instrumen": "Lembar observasi profil lulusan dan ceklis tugas",
      "fokus": "Umpan balik langsung selama pembelajaran"
    },
    "sumatif": {
      "teknik": "Penilaian karya presentasi / tes studi kasus",
      "instrumen": "Rubrik penilaian komprehensif",
      "fokus": "Kedalaman pemahaman dan nalar kritis"
    },
    "rubrik": [
      {
        "aspek": "Penguasaan Konsep & Analisis Masalah",
        "sangatMahir": "Mampu menjelaskan konsep secara akurat, mendalam, dan menghubungkan dengan solusi nyata",
        "mahir": "Mampu menjelaskan konsep dan menganalisis masalah dengan baik",
        "berkembang": "Menjelaskan konsep secara parsial dan memerlukan arahan",
        "perluBimbingan": "Belum mampu menjelaskan konsep dasar dan membutuhkan bimbingan"
      },
      {
        "aspek": "Kolaborasi & Partisipasi Aktif",
        "sangatMahir": "Memimpin diskusi secara konstruktif dan sangat proaktif",
        "mahir": "Berpartisipasi aktif dalam kelompok dengan baik",
        "berkembang": "Cukup aktif dalam kerja sama",
        "perluBimbingan": "Kurang terlibat dan pasif"
      },
      {
        "aspek": "Kreativitas & Komunikasi Hasil",
        "sangatMahir": "Menyajikan solusi yang orisinal, argumentatif, dan komunikatif memukau",
        "mahir": "Menyajikan solusi dengan runtut, jelas, dan percaya diri",
        "berkembang": "Menyajikan hasil namun belum sistematis",
        "perluBimbingan": "Penyampaian belum jelas dan butuh panduan penuh"
      }
    ]
  },
  "pengayaanRemedial": {
    "pengayaan": "Penugasan tantangan eksplorasi kasus lanjutan atau peran tutor sebaya.",
    "remedial": "Bimbingan terfokus pada indikator yang belum tuntas melalui peninjauan konsep kunci."
  },
  "refleksi": {
    "refleksiSiswa": [
      "Bagian materi mana yang paling menarik dan bermakna hari ini?",
      "Tantangan apa yang dihadapi dan bagaimana mengatasinya?",
      "Bagaimana konsep ini dapat kamu terapkan di kehidupan nyata?"
    ],
    "refleksiGuru": [
      "Apakah seluruh peserta didik terlibat aktif dalam pembelajaran?",
      "Apakah alokasi waktu berjalan sesuai rencana?",
      "Langkah apa yang perlu diperbaiki untuk pertemuan selanjutnya?"
    ]
  },
  "lampiran": {
    "lkpd": {
      "judul": "Lembar Kerja Peserta Didik (LKPD) Pembelajaran Mendalam",
      "petunjuk": "Bacalah instruksi dengan cermat, diskusikan dalam kelompok, dan rumuskan solusi terbaik.",
      "tugasLangkah": [
        "1. Cermati stimulus kontekstual yang disajikan.",
        "2. Identifikasi rumusan masalah dan fakta kunci.",
        "3. Kumpulkan data dan lakukan analisis mendalam.",
        "4. Rumuskan solusi inovatif dan presentasikan."
      ],
      "studiKasusSoal": "Studi kasus kontekstual nyata yang menantang nalar kritis siswa SMA."
    },
    "bahanBacaan": "Uraian ringkas bahan bacaan mengenai esensi konsep materi dan keterkaitannya dengan kehidupan.",
    "glosarium": [
      {
        "istilah": "Istilah kunci 1",
        "definisi": "Definisi istilah kunci 1"
      }
    ],
    "daftarPustaka": [
      "Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi. (2024). Buku Panduan Guru dan Siswa SMA. Jakarta: Pusat Perbukuan."
    ]
  }
}

PASTIKAN seluruh array pertemuan berjumlah ${totalMeetings} item, runtut dari Pertemuan 1 sampai Pertemuan ${totalMeetings}.`;

  return await executeClientGemini(prompt);
}

async function postApiWithFallback(
  endpoints: string[],
  payload: any,
  clientFallback?: () => Promise<any>
) {
  let lastErrorMsg = '';
  let attemptedServer = false;

  for (const url of endpoints) {
    try {
      console.log('[AI API] Mencoba POST ke server:', url);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      attemptedServer = true;
      const contentType = res.headers.get('content-type') || '';
      const rawText = await res.text();

      console.log('[AI API] Status respon:', url, res.status);

      if (res.ok) {
        if (contentType.includes('application/json')) {
          return JSON.parse(rawText);
        }
        return parseJsonSafely(rawText);
      }

      // If server returns 405 (Method Not Allowed) or 404 (Not Found):
      // This happens on hosting like Vercel when static rewrite triggers or serverless route is warming up.
      if (res.status === 405 || res.status === 404) {
        console.warn(`[AI API] Endpoint ${url} merespons ${res.status}. Beralih otomatis ke fallback...`);
        lastErrorMsg = `Server endpoint ${url} (${res.status})`;
        // Immediately try next endpoint or fallback
        continue;
      }

      if (contentType.includes('application/json')) {
        try {
          const errJson = JSON.parse(rawText);
          lastErrorMsg = errJson.error || `Server error (${res.status})`;
        } catch {
          lastErrorMsg = `Server error (${res.status})`;
        }
      } else {
        lastErrorMsg = `Server error (${res.status})`;
      }
    } catch (err: any) {
      console.warn('[AI API] Gagal terhubung ke endpoint:', url, err?.message);
      lastErrorMsg = err?.message || 'Koneksi ke backend gagal.';
    }
  }

  // If server endpoints failed, 405'd, or 404'd, automatically engage client fallback
  if (clientFallback) {
    try {
      console.log('[AI API] Mengaktifkan client-side AI generation...');
      return await clientFallback();
    } catch (err: any) {
      console.error('[AI API] Client-side fallback juga gagal:', err);
      // Only overwrite if lastErrorMsg is generic
      if (!lastErrorMsg || lastErrorMsg.includes('405') || lastErrorMsg.includes('404') || lastErrorMsg.includes('Server error')) {
        if (err?.message) {
          lastErrorMsg = err.message;
        }
      }
    }
  }

  if (!lastErrorMsg || lastErrorMsg.includes('405') || lastErrorMsg.includes('404')) {
    lastErrorMsg =
      'Gagal memproses AI. Jika Anda menggunakan hosting Vercel, pastikan variabel GEMINI_API_KEY telah ditambahkan di Vercel Dashboard (Settings -> Environment Variables) lalu lakukan REDEPLOY.';
  }

  throw new Error(lastErrorMsg);
}

export interface GenerateMaterialPayload {
  subject: string;
  grade: string;
  topic: string;
  description?: string;
  pertemuanList?: any[];
  pertemuanCount?: number;
  selectedMeetingIndex?: string;
}

export async function generateMaterialApi(payload: GenerateMaterialPayload) {
  const result = await postApiWithFallback(
    ['/api/generate-material', '/api/material', '/api/ai/material'],
    payload,
    () =>
      clientFallbackGenerateMaterial(
        payload.subject,
        payload.grade,
        payload.topic,
        payload.description,
        payload.pertemuanList,
        payload.selectedMeetingIndex
      )
  );

  if (result && typeof result === 'object') {
    const resolved = resolveRelevantYoutubeVideo(payload.subject, payload.topic, result.videoUrl);
    result.videoUrl = resolved.videoUrl;
    if (!result.videoTitle) result.videoTitle = resolved.videoTitle;
    if (!result.videoChannel) result.videoChannel = resolved.videoChannel;
  }
  return result;
}

export async function generateQuestionsApi(payload: { topic: string; type: string; count: number }) {
  return postApiWithFallback(
    ['/api/generate-questions', '/api/questions', '/api/ai/questions'],
    payload,
    () => clientFallbackGenerateQuestions(payload.topic, payload.type, payload.count)
  );
}

export async function gradeEssayApi(payload: { question: string; answerKey: string; studentAnswer: string }) {
  return postApiWithFallback(
    ['/api/grade-essay', '/api/grade', '/api/ai/grade-essay'],
    payload,
    () => clientFallbackGradeEssay(payload.question, payload.answerKey, payload.studentAnswer)
  );
}

export interface ModulAjarPayload {
  subject: string;
  cp: string;
  grade?: string;
  metode: string;
  pertemuanMetode?: string[];
  pertemuanCount: number;
  alokasiWaktu?: string;
  tanggalCetak?: string;
  namaGuru?: string;
  nipGuru?: string;
  namaSekolah?: string;
  npsn?: string;
  alamatSekolah?: string;
  tahunPelajaran?: string;
  semester?: string;
  namaKepsek?: string;
  nipKepsek?: string;
}

export async function generateModulAjarApi(payload: ModulAjarPayload) {
  return postApiWithFallback(
    ['/api/generate-modul', '/api/modul', '/api/ai/modul'],
    payload,
    () => clientFallbackGenerateModulAjar(payload)
  );
}

export interface CpSearchPayload {
  subject: string;
  fase?: string;
  keyword?: string;
  jenjang?: string;
}

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
}

async function clientFallbackSearchCp(payload: CpSearchPayload): Promise<CpSearchResult> {
  const targetJenjang = payload.jenjang || 'SMA / MA (Sekolah Menengah Atas)';
  const prompt = `Anda adalah pakar kurikulum nasional Kementerian Pendidikan Dasar dan Menengah RI yang menguasai naskah regulasi resmi terbaru:
"Keputusan Kepala Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP) Kementerian Pendidikan Dasar dan Menengah Nomor 046/H/KR/2025 tentang Capaian Pembelajaran pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah pada Kurikulum Merdeka".
Dokumen acuan resmi: https://vtjtunvkoicwdugnifxi.supabase.co/storage/v1/object/public/cp-documents/KepKaBSKAP-046_2025-ttg-CP.pdf.

Lakukan penelusuran dan ekstraksi Capaian Pembelajaran (CP) otentik, presisi, dan sesuai regulasi BSKAP 046/H/KR/2025 untuk:
- Jenjang Sekolah: ${targetJenjang}
- Mata Pelajaran: ${payload.subject}
- Fase / Kelas: ${payload.fase || 'Sesuai jenjang'}
- Fokus / Kata Kunci: ${payload.keyword || 'Capaian Pembelajaran'}

Keluarkan HANYA format JSON valid berikut:
{
  "mataPelajaran": "${payload.subject}",
  "jenjang": "${targetJenjang}",
  "fase": "${payload.fase || 'Fase Terkait'}",
  "dasarHukum": "Keputusan Kepala BSKAP No. 046/H/KR/2025",
  "dokumenRujukanUrl": "https://vtjtunvkoicwdugnifxi.supabase.co/storage/v1/object/public/cp-documents/KepKaBSKAP-046_2025-ttg-CP.pdf",
  "capaianFaseUmum": "Teks resmi capaian pembelajaran umum pada akhir fase yang dipilih sesuai dokumen BSKAP 046/2025...",
  "rasionalSingkat": "Rasional singkat mata pelajaran ini...",
  "elemen": [
    {
      "namaElemen": "Nama Elemen Resmi (sesuai BSKAP 046/2025)",
      "deskripsiCp": "Deskripsi capaian pembelajaran elemen ini...",
      "materiPokok": ["Topik 1", "Topik 2"]
    }
  ],
  "capaianPerFase": [
    {
      "fase": "Nama Fase (misal: Fase E atau Fase D)",
      "kelas": "Tingkat Kelas",
      "judul": "Capaian Pembelajaran ${payload.subject} Fase ...",
      "teksCp": "Teks resmi Capaian Pembelajaran fase ini...",
      "fokusKompetensi": "Ringkasan fokus kompetensi fase ini"
    }
  ]
}
Pastikan array 'elemen' dan 'capaianPerFase' selalu ada dan terisi data valid.`;

  try {
    const raw = await executeClientGemini(prompt);
    
    const safeElemen = Array.isArray(raw?.elemen) && raw.elemen.length > 0
      ? raw.elemen
      : getCuratedCpDataset(payload.subject, payload.fase, targetJenjang, payload.keyword).elemen;
    const safeCapaianPerFase = Array.isArray(raw?.capaianPerFase) && raw.capaianPerFase.length > 0
      ? raw.capaianPerFase
      : getCuratedCpDataset(payload.subject, payload.fase, targetJenjang, payload.keyword).capaianPerFase;
    const safeCapaianUmum = raw?.capaianFaseUmum || (safeCapaianPerFase && safeCapaianPerFase.length > 0 ? safeCapaianPerFase[0].teksCp : '') || '';

    return {
      mataPelajaran: raw?.mataPelajaran || payload.subject,
      jenjang: raw?.jenjang || targetJenjang,
      fase: raw?.fase || payload.fase || 'Fase E / F',
      dasarHukum: raw?.dasarHukum || 'Keputusan Kepala BSKAP No. 046/H/KR/2025',
      dokumenRujukanUrl: raw?.dokumenRujukanUrl || 'https://vtjtunvkoicwdugnifxi.supabase.co/storage/v1/object/public/cp-documents/KepKaBSKAP-046_2025-ttg-CP.pdf',
      capaianFaseUmum: safeCapaianUmum,
      rasionalSingkat: raw?.rasionalSingkat || '',
      elemen: safeElemen,
      capaianPerFase: safeCapaianPerFase,
    };
  } catch (err) {
    console.warn('[Client AI] Menampilkan basis data kurikulum resmi BSKAP 046/2025:', err);
    return getCuratedCpDataset(payload.subject, payload.fase, targetJenjang, payload.keyword);
  }
}

export async function searchCpApi(payload: CpSearchPayload): Promise<CpSearchResult> {
  try {
    return await postApiWithFallback(
      ['/api/cp/search', '/api/search-cp'],
      payload,
      () => clientFallbackSearchCp(payload)
    );
  } catch (err) {
    console.warn('[Search CP API] Gagal terhubung atau server 503, menggunakan basis data kurikulum BSKAP 046/2025:', err);
    return getCuratedCpDataset(payload.subject, payload.fase, payload.jenjang, payload.keyword);
  }
}

