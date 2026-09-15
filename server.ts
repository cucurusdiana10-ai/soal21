import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

function parseJsonSafely(text: string) {
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
    throw new Error('Gagal mengurai respon AI ke format JSON.');
  }
}

// Resilient Gemini Generation with Model Fallback
async function generateContentWithFallback(ai: GoogleGenAI, prompt: string) {
  const models = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          }
        });

        const text = response.text;
        if (text) {
          return parseJsonSafely(text);
        }
      } catch (err: any) {
        console.warn(`Model ${model} attempt ${attempt + 1} gagal atau sibuk:`, err.message);
        lastError = err;
        if (err?.message?.includes('503') || err?.message?.includes('429') || err?.status === 503 || err?.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error('Gagal memproses permintaan ke AI Gemini.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS and preflight headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '20mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Handler for Material Generation
  const handleMaterialGen = async (req: express.Request, res: express.Response) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return res.json({ status: 'ready', endpoint: req.path });
    }
    if (req.method !== 'POST') {
      return res.status(200).json({ status: 'ready', endpoint: req.path });
    }
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing.' });
      }

      const { subject, grade, topic, description } = req.body || {};
      if (!subject || !grade || !topic) {
        return res.status(400).json({ error: 'Missing required fields: subject, grade, topic' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      const fullTopic = topic + (description ? ` - Petunjuk Khusus Guru: ${description}` : '');
      
      const prompt = `Sebagai asisten guru ahli pembelajaran digital interaktif dan menyenangkan untuk siswa SMA di SMAN 21 Garut, buatkan bahan ajar interaktif, seru, dan mudah dipahami untuk:
Mata Pelajaran: ${subject}
Kelas/Tingkat: ${grade}
Capaian Pembelajaran / Topik: "${fullTopic}"

Bahan ajar harus memuat elemen visual/media (Gambar dan/atau Rekomendasi Video Pembelajaran YouTube yang relevan).
Kembalikan respon DALAM FORMAT JSON MURNI yang valid dengan struktur persis berikut:
{
  "imageUrl": "URL foto Unsplash berkualitas tinggi dan relevan dengan topik, contoh: https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80",
  "videoUrl": "URL video pembelajaran YouTube yang relevan dengan topik (contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ atau https://youtu.be/xxx atau link embed edukasi sains/matematika/sosial relevan)",
  "mediaType": "both",
  "mindMap": [
    "Konsep Inti 1",
    "Konsep Inti 2",
    "Konsep Inti 3",
    "Aplikasi Nyata"
  ],
  "funFact": "1 fakta mengejutkan / unik / 'tahukah kamu' yang memicu rasa penasaran siswa SMA tentang topik ini.",
  "realWorldApplication": "Studi kasus / penerapan seru topik ini di kehidupan sehari-hari atau dunia kerja/teknologi.",
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

      const parsedData = await generateContentWithFallback(ai, prompt);
      res.json(parsedData);
    } catch (error: any) {
      console.error('Error generating material:', error);
      res.status(500).json({ error: error.message || 'Gagal meracik bahan ajar AI' });
    }
  };

  app.all('/api/generate-material', handleMaterialGen);
  app.all('/api/ai/material', handleMaterialGen);
  app.all('/api/material', handleMaterialGen);

  // Handler for Question Generation
  const handleQuestionsGen = async (req: express.Request, res: express.Response) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return res.json({ status: 'ready', endpoint: req.path });
    }
    if (req.method !== 'POST') {
      return res.status(200).json({ status: 'ready', endpoint: req.path });
    }
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing.' });
      }

      const { topic, type, count } = req.body || {};
      if (!topic || !type || !count) {
        return res.status(400).json({ error: 'Missing required fields: topic, type, count' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      
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

      const parsedData = await generateContentWithFallback(ai, prompt);
      res.json(parsedData);
    } catch (error: any) {
      console.error('Error generating questions:', error);
      res.status(500).json({ error: error.message || 'Gagal meracik soal dari AI' });
    }
  };

  app.all('/api/generate-questions', handleQuestionsGen);
  app.all('/api/ai/questions', handleQuestionsGen);
  app.all('/api/questions', handleQuestionsGen);

  // Handler for Essay Grading
  const handleGradeEssay = async (req: express.Request, res: express.Response) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return res.json({ status: 'ready', endpoint: req.path });
    }
    if (req.method !== 'POST') {
      return res.status(200).json({ status: 'ready', endpoint: req.path });
    }
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing.' });
      }

      const { question, answerKey, studentAnswer } = req.body || {};
      
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      
      const prompt = `Sebagai guru SMAN 21 Garut yang bijak dan teliti, tolong koreksi jawaban esai siswa berikut.
Pertanyaan: ${question}
Kunci Jawaban yang Diharapkan: ${answerKey}
Jawaban Siswa: ${studentAnswer}

Berikan penilaian dalam format JSON dengan struktur:
{
  "score": <angka_0_sampai_100_untuk_soal_ini>,
  "feedback": "<komentar_pendek_memotivasi_mengapa_nilainya_demikian>"
}`;

      const parsedData = await generateContentWithFallback(ai, prompt);
      res.json(parsedData);
    } catch (error: any) {
      console.error('Error grading essay:', error);
      res.status(500).json({ error: error.message || 'Failed to grade essay' });
    }
  };

  app.all('/api/grade-essay', handleGradeEssay);
  app.all('/api/ai/grade-essay', handleGradeEssay);
  app.all('/api/grade', handleGradeEssay);

  // Handler for Modul Ajar Pembelajaran Mendalam Generation
  const handleModulGen = async (req: express.Request, res: express.Response) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return res.json({ status: 'ready', endpoint: req.path });
    }
    if (req.method !== 'POST') {
      return res.status(200).json({ status: 'ready', endpoint: req.path });
    }
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing.' });
      }

      const {
        subject,
        cp,
        grade,
        metode,
        pertemuanMetode,
        pertemuanCount,
        alokasiWaktu,
        tanggalCetak,
        namaGuru,
        nipGuru,
        namaSekolah,
        npsn,
        alamatSekolah,
        tahunPelajaran,
        semester,
        namaKepsek,
        nipKepsek
      } = req.body;

      if (!subject || !cp) {
        return res.status(400).json({ error: 'Mata pelajaran dan Capaian Pembelajaran wajib diisi.' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const schoolName = namaSekolah || 'SMAN 21 Garut';
      const schoolNpsn = npsn || '20209194';
      const schoolAddress = alamatSekolah || 'Jl. Raya Talegong No. 21, Kec. Talegong, Kab. Garut, Jawa Barat 44167';
      const teacherName = namaGuru || 'Guru Pengampu';
      const teacherNip = nipGuru || '-';
      const totalMeetings = Number(pertemuanCount) || 2;
      const timeAllocation = alokasiWaktu || '2 x 45 Menit (2 JP)';
      const methodChosen = metode || 'Problem-Based Learning (PBL)';
      const targetGrade = grade || 'Fase E (Kelas X)';
      const academicYear = tahunPelajaran || '2026/2027';
      const currentSemester = semester || 'Ganjil';
      const headmaster = namaKepsek || 'Agus Supriatna, S.Pd., M.Si.';
      const headmasterNip = nipKepsek || '';

      const meetingMethods: string[] = Array.isArray(pertemuanMetode) && pertemuanMetode.length > 0
        ? pertemuanMetode.slice(0, totalMeetings)
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
- Mata Pelajaran: ${subject}
- Fase / Kelas: ${targetGrade}
- Capaian Pembelajaran (CP): "${cp}"
- Jumlah Pertemuan: Tepat ${totalMeetings} Pertemuan
- Alokasi Waktu: ${timeAllocation}
- Metode Pembelajaran Tiap Pertemuan (Bisa Berbeda Tiap Pertemuan):
${meetingMethods.map((m, idx) => `  * Pertemuan ${idx + 1}: ${m}`).join('\n')}
${tanggalCetak ? `- Tanggal Cetak Modul / Titimangsa: ${tanggalCetak}` : ''}

ATURAN KHUSUS ALOKASI WAKTU:
${is5JP ? `CATATAN KHUSUS ALOKASI 5 JP (5 x 45 Menit):
Pada RINCIAN KEGIATAN PEMBELAJARAN:
- Pertemuan 1: alokasiWaktu adalah '2 JP (2 x 45 Menit = 90 Menit)' (Kegiatan Pendahuluan 15 Menit, Kegiatan Inti 60 Menit, Kegiatan Penutup 15 Menit).
- Pertemuan 2: alokasiWaktu adalah '3 JP (3 x 45 Menit = 135 Menit)' (Kegiatan Pendahuluan 15 Menit, Kegiatan Inti 105 Menit, Kegiatan Penutup 15 Menit).
(Jika ada pertemuan berikutnya, distribusikan secara proporsional).` : `Setiap pertemuan memiliki alokasi waktu ${timeAllocation}.`}

ATURAN KHUSUS METODE PEMBELAJARAN & SINTAKS PER PERTEMUAN:
Setiap pertemuan di array "pertemuan" HARUS memiliki metode tersendiri sesuai pilihan guru di atas:
${meetingMethods.map((m, idx) => `- Pertemuan ${idx + 1}: Wajib menerapkan sintaks resmi dari metode "${m}" pada Kegiatan Inti.`).join('\n')}

ATURAN RINCIAN KEGIATAN PENDAHULUAN DAN PENUTUP (WAJIB DIJABARKAN LENGKAP PADA SETIAP PERTEMUAN):
Kegiatan pendahuluan dan penutup pada setiap pertemuan HARUS dijabarkan secara rinci dan operasional, dengan langkah-langkah konkret:
- Pada "kegiatanPendahuluan" (durasi: 15 Menit):
  Wajib memuat minimal 6 langkah konkret yang operasional pada setiap pertemuan:
  1. Orientasi & Penumbuhan Budi Pekerti: Guru membuka pembelajaran dengan salam hangat, sapaan ramah, memimpin doa bersama siswa sesuai keyakinan, serta memeriksa kebersihan dan kerapian ruang kelas.
  2. Presensi & Kesiapan Belajar: Guru memeriksa kehadiran siswa dan mengecek kesiapan fisik serta psikologis peserta didik untuk belajar.
  3. Mindfulness / Ice Breaking (Joyful Learning): Guru memandu latihan kesadaran penuh (Mindfulness / Teknik STOP) atau ice breaking singkat yang menggembirakan untuk menumbuhkan fokus dan suasana belajar positif.
  4. Apersepsi Kontekstual: Guru mengaitkan materi prasyarat atau pengalaman belajar pertemuan sebelumnya dengan topik yang akan dipelajari hari ini.
  5. Pertanyaan Pemantik & Motivasi (Meaningful): Guru mengajukan pertanyaan pemantik kontekstual yang merangsang daya nalar kritis dan rasa ingin tahu siswa serta memaparkan manfaat nyata materi dalam kehidupan sehari-hari.
  6. Penyampaian Tujuan Pembelajaran & Alur Asesmen: Guru menyampaikan Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP) spesifik pertemuan ini, garis besar skenario aktivitas belajar, dan kriteria penilaian.
  7. Pembagian Kelompok & Kontrak Belajar: Guru mengondisikan pembagian kelompok belajar heterogen (diferensiasi proses) dan menyepakati kontrak/kesepakatan kelas yang saling menghargai.

- Pada "kegiatanPenutup" (durasi: 15 Menit):
  Wajib memuat minimal 5-6 langkah konkret yang operasional pada setiap pertemuan:
  1. Simpulan Bersama: Peserta didik bersama guru merangkum dan menyimpulkan poin-poin kunci serta konsep esensial yang telah dipelajari hari ini.
  2. Refleksi Terbimbing Peserta Didik (Metakognisi): Peserta didik melakukan refleksi terbimbing (apa yang telah dipahami, tantangan yang dihadapi, serta perasaan dan pengalaman bermakna selama pembelajaran).
  3. Asesmen Formatif Cepat (Check for Understanding / Exit Ticket): Guru memberikan evaluasi pemahaman mandiri singkat (1-2 soal kuis cepat atau lembar exit ticket) untuk memantau capaian belajar seluruh siswa.
  4. Apresiasi & Penguatan Positif Guru: Guru memberikan apresiasi dan umpan balik konstruktif atas usaha, kreativitas, dan kerja sama aktif seluruh peserta didik.
  5. Tindak Lanjut & Informasi Pertemuan Berikutnya: Guru memberikan arahan tindak lanjut (remedial/pengayaan) serta menginformasikan persiapan materi/tugas untuk pertemuan berikutnya.
  6. Doa Penutup & Salam: Pembelajaran ditutup dengan doa bersama penuh syukur dan salam penutup yang santun.

ATURAN DIMENSI PROFIL LULUSAN (8 DIMENSI LULUSAN):
Ganti dan hilangkan istilah "Dimensi Profil Pelajar Pancasila". Gunakan "Dimensi Profil Lulusan" yang wajib memuat 8 Dimensi Lulusan berikut secara lengkap dan kontekstual:
1. Keimanan dan Ketakwaan terhadap Tuhan Yang Maha Esa
2. Kewargaan
3. Penalaran Kritis
4. Kreativitas
5. Kolaborasi
6. Kemandirian
7. Kesehatan
8. Komunikasi

CATATAN: Hapus dan jangan tampilkan atribut "targetPesertaDidik".

WAJIB MENGEMBALIKAN RESPONS DALAM FORMAT JSON MURNI YANG VALID (tanpa pembuka markdown atau teks pengantar lain).
Gunakan struktur JSON berikut:
{
  "identitas": {
    "namaSekolah": "${schoolName}",
    "npsn": "${schoolNpsn}",
    "alamatSekolah": "${schoolAddress}",
    "namaGuru": "${teacherName}",
    "nipGuru": "${teacherNip}",
    "mataPelajaran": "${subject}",
    "fase": "${targetGrade}",
    "alokasiWaktu": "${timeAllocation}",
    "jumlahPertemuan": ${totalMeetings},
    "tahunPelajaran": "${academicYear}",
    "semester": "${currentSemester}",
    "namaKepsek": "${headmaster}",
    "nipKepsek": "${headmasterNip}",
    "metodeGabungan": "${meetingMethodsDesc}",
    "tanggalCetak": "${tanggalCetak || ''}"
  },
  "capaianPembelajaran": "${cp}",
  "elemenCp": "Elemen/Domain konten utama CP",
  "tujuanPembelajaran": [
    "TP operasional 1 terukur dengan KKO",
    "TP operasional 2 terukur dengan KKO",
    "TP operasional 3 terukur dengan KKO"
  ],
  "pemahamanBermakna": "Intisari pemahaman bermakna yang bertahan lama dan relevan dengan kehidupan sehari-hari siswa SMA",
  "pertanyaanPemantik": [
    "Pertanyaan terbuka menantang 1?",
    "Pertanyaan terbuka menantang 2?",
    "Pertanyaan terbuka menantang 3?"
  ],
  "dimensiProfilLulusan": [
    "Keimanan dan Ketakwaan terhadap Tuhan YME: Uraian kontekstual spiritual dan etika pada materi ini",
    "Kewargaan: Uraian kontekstual kepedulian sosial, kebangsaan, dan lingkungan",
    "Penalaran Kritis: Uraian analisis logis, pengolahan data, dan evaluasi solusi",
    "Kreativitas: Uraian pengembangan ide inovatif dan solusi orisinal",
    "Kolaborasi: Uraian kerja tim sinergis, gotong royong, dan komunikasi",
    "Kemandirian: Uraian regulasi diri, ketekunan, dan inisiatif belajar",
    "Kesehatan: Uraian kesejahteraan fisik-mental (well-being) dalam proses belajar",
    "Komunikasi: Uraian artikulasi gagasan, dialog santun, dan presentasi"
  ],
  "prinsipPembelajaranMendalam": {
    "mindful": "Penerapan berkesadaran penuh dalam proses belajar topik ini",
    "meaningful": "Keterkaitan topik dengan realitas dan solusi masalah nyata di lingkungan siswa",
    "joyful": "Aktivitas eksploratif interaktif yang membangun kegembiraan belajar"
  },
  "saranaPrasarana": {
    "media": ["Media digital, infografis, video interaktif, presentasi"],
    "alatBahan": ["Laptop, proyektor, smartphone, papan tulis, LKPD"],
    "sumberBelajar": ["Buku teks Kurikulum Merdeka, modul ajar digital, sumber artikel online terpercaya"]
  },
  "modelMetode": {
    "nama": "${meetingMethodsDesc}",
    "alasanPemilihan": "Alasan pedagogis mengapa metode-metode ini optimal untuk mencapai CP topik ini",
    "sintaksUtama": [
      "Tahap 1 sintaks metode pertemuan 1",
      "Tahap 2 sintaks metode pertemuan 1",
      "Tahap lanjutan"
    ]
  },
  "pertemuan": [
    {
      "nomor": 1,
      "topik": "Topik spesifik pertemuan 1",
      "metode": "${meetingMethods[0] || methodChosen}",
      "alokasiWaktu": "${is5JP ? '2 x 45 Menit (2 JP)' : timeAllocation}",
      "tujuanPertemuan": "Tujuan spesifik yang dicapai pada pertemuan 1",
      "kegiatanPendahuluan": {
        "durasi": "15 Menit",
        "langkah": [
          "Orientasi & Penumbuhan Budi Pekerti: Guru membuka pembelajaran dengan salam pembuka, menyapa peserta didik dengan hangat, dan mengajak salah satu peserta didik memimpin doa bersama sesuai keyakinan masing-masing.",
          "Presensi & Kesiapan Ruang: Guru memeriksa kebersihan, kerapian meja kursi, serta sirkulasi ruang kelas, dilanjutkan memeriksa presensi kehadiran dan kesiapan fisik-mental peserta didik.",
          "Mindfulness & Ice Breaking: Guru memandu latihan kesadaran penuh (Mindfulness / Teknik STOP: Stop, Take a breath, Observe, Proceed) atau ice breaking singkat yang menggembirakan untuk memusatkan fokus belajar peserta didik.",
          "Apersepsi Kontekstual: Guru mengaitkan materi prasyarat atau pengalaman belajar sebelumnya dengan konsep materi yang akan dipelajari pada pertemuan ini melalui analogi konkret.",
          "Pertanyaan Pemantik & Motivasi: Guru melontarkan pertanyaan pemantik yang merangsang daya nalar kritis peserta didik dan menyampaikan manfaat praktis mempelajari materi ini dalam kehidupan sehari-hari.",
          "Penyampaian Tujuan & Asesmen: Guru menyampaikan Capaian Pembelajaran, Tujuan Pembelajaran (TP) spesifik hari ini, garis besar alur aktivitas, serta kriteria dan teknik penilaian yang akan diterapkan.",
          "Kontrak Belajar & Pembagian Kelompok: Guru mengondisikan pembagian kelompok belajar heterogen berdasarkan tingkat kesiapan belajar (diferensiasi) dan menegaskan kembali kesepakatan/kontrak kelas."
        ]
      },
      "kegiatanInti": {
        "durasi": "${is5JP ? '60 Menit' : '60 Menit'}",
        "metode": "${meetingMethods[0] || methodChosen}",
        "sintaks": [
          {
            "tahap": "Tahap 1 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Aktivitas fasilitasi konkret yang dilakukan guru",
            "aktivitasSiswa": "Aktivitas eksplorasi aktif mendalam yang dilakukan peserta didik",
            "fokusMendalam": "Aspek Deep Learning (Mindful/Meaningful/Joyful/Diferensiasi)"
          },
          {
            "tahap": "Tahap 2 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Aktivitas fasilitasi konkret yang dilakukan guru",
            "aktivitasSiswa": "Aktivitas eksplorasi aktif mendalam yang dilakukan peserta didik",
            "fokusMendalam": "Aspek Deep Learning"
          },
          {
            "tahap": "Tahap 3 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Aktivitas fasilitasi konkret yang dilakukan guru",
            "aktivitasSiswa": "Aktivitas eksplorasi aktif mendalam yang dilakukan peserta didik",
            "fokusMendalam": "Aspek Deep Learning"
          },
          {
            "tahap": "Tahap 4 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Aktivitas fasilitasi konkret yang dilakukan guru",
            "aktivitasSiswa": "Aktivitas eksplorasi aktif mendalam yang dilakukan peserta didik",
            "fokusMendalam": "Aspek Deep Learning"
          },
          {
            "tahap": "Tahap 5 sesuai sintaks ${meetingMethods[0] || methodChosen}",
            "aktivitasGuru": "Aktivitas fasilitasi konkret yang dilakukan guru",
            "aktivitasSiswa": "Aktivitas eksplorasi aktif mendalam yang dilakukan peserta didik",
            "fokusMendalam": "Aspek Deep Learning"
          }
        ]
      },
      "kegiatanPenutup": {
        "durasi": "15 Menit",
        "langkah": [
          "Rangkuman & Simpulan Bersama: Peserta didik difasilitasi guru untuk merangkum dan menyimpulkan poin-poin kunci serta konsep esensial yang telah dipelajari.",
          "Refleksi Terbimbing Peserta Didik: Peserta didik melakukan refleksi metakognitif menjawab pertanyaan pemandu (apa hal paling bermakna yang dipelajari, tantangan diskusi kelompok, dan perasaan belajar hari ini).",
          "Asesmen Formatif Cepat (Exit Ticket): Guru memberikan lembar evaluasi pemahaman mandiri singkat (1-2 soal kuis cepat atau exit ticket) untuk mengecek ketuntasan konsep.",
          "Apresiasi & Penguatan Positif: Guru memberikan apresiasi dan umpan balik yang konstruktif atas kreativitas, keaktifan, dan kolaborasi seluruh peserta didik dan kelompok.",
          "Tindak Lanjut & Info Pertemuan Berikutnya: Guru memberikan arahan tindak lanjut (pengayaan/pendampingan remedial) serta menginformasikan topik materi dan persiapan untuk pertemuan berikutnya.",
          "Doa Penutup & Salam: Pembelajaran ditutup dengan rasa syukur dan doa bersama yang dipimpin perwakilan siswa serta salam penutup hangat dari guru."
        ]
      }
    }
  ],
  "asesmen": {
    "diagnostik": {
      "teknik": "Tes diagnostik non-kognitif (kesiapan belajar) dan kognitif awal",
      "instrumen": "Daftar pertanyaan apersepsi dan kuis diagnostik cepat"
    },
    "formatif": {
      "teknik": "Observasi proses diskusi, kinerja kelompok, dan penilaian LKPD",
      "instrumen": "Lembar observasi profil pelajar pancasila dan ceklis ketercapaian tugas",
      "fokus": "Memberikan umpan balik langsung selama proses penyelidikan dan kolaborasi"
    },
    "sumatif": {
      "teknik": "Penilaian unjuk kerja produk presentasi / tes tertulis berbasis studi kasus",
      "instrumen": "Rubrik penilaian komprehensif dan soal uraian analisis",
      "fokus": "Mengukur kedalaman pemahaman konseptual dan kemampuan pemecahan masalah"
    },
    "rubrik": [
      {
        "aspek": "Penguasaan Konsep & Analisis Masalah",
        "sangatMahir": "Mampu menjelaskan konsep secara akurat, mendalam, dan menghubungkan dengan solusi nyata tanpa bantuan",
        "mahir": "Mampu menjelaskan konsep dan menganalisis masalah dengan baik dan tepat",
        "berkembang": "Menjelaskan konsep secara parsial dan memerlukan sedikit arahan analisis",
        "perluBimbingan": "Belum mampu menjelaskan konsep dasar dan membutuhkan bimbingan intensif"
      },
      {
        "aspek": "Kolaborasi & Partisipasi Aktif",
        "sangatMahir": "Memimpin diskusi secara konstruktif, menghargai pendapat rekan, dan sangat proaktif",
        "mahir": "Berpartisipasi aktif dalam kelompok dan menyelesaikan tanggung jawab dengan baik",
        "berkembang": "Cukup aktif namun terkadang pasif dalam kerja sama",
        "perluBimbingan": "Kurang terlibat dalam kelompok dan pasif dalam diskusi"
      },
      {
        "aspek": "Kreativitas & Komunikasi Hasil",
        "sangatMahir": "Menyajikan solusi yang orisinal, argumentatif, dan komunikatif secara memukau",
        "mahir": "Menyajikan solusi dengan runtut, jelas, dan percaya diri",
        "berkembang": "Menyajikan hasil namun belum sistematis",
        "perluBimbingan": "Penyampaian belum jelas dan membutuhkan panduan penuh"
      }
    ]
  },
  "pengayaanRemedial": {
    "pengayaan": "Peserta didik yang telah mencapai ketuntasan diberikan tugas tantangan eksplorasi kasus lanjutan atau peran tutor sebaya.",
    "remedial": "Bimbingan terfokus pada indikator yang belum tuntas melalui peninjauan konsep kunci dan pendampingan khusus."
  },
  "refleksi": {
    "refleksiSiswa": [
      "Bagian materi mana yang paling menarik dan bermakna bagi kamu hari ini?",
      "Tantangan apa yang kamu hadapi dalam proses penyelidikan/diskusi, dan bagaimana kamu mengatasinya?",
      "Bagaimana konsep ini dapat kamu terapkan dalam kehidupan sehari-harimu?"
    ],
    "refleksiGuru": [
      "Apakah seluruh peserta didik terlibat aktif dan antusias dalam pembelajaran mendalam hari ini?",
      "Apakah sintaks metode pembelajaran berjalan sesuai alokasi waktu yang direncanakan?",
      "Langkah apa yang perlu diperbaiki untuk pertemuan berikutnya agar pembelajaran lebih efektif?"
    ]
  },
  "lampiran": {
    "lkpd": {
      "judul": "Lembar Kerja Peserta Didik (LKPD) Pembelajaran Mendalam",
      "petunjuk": "Bacalah setiap instruksi dengan cermat, diskusikan secara kolaboratif dalam kelompok, dan rumuskan solusi terbaik.",
      "tugasLangkah": [
        "1. Cermati stimulus/studi kasus kontekstual yang disajikan.",
        "2. Identifikasi rumusan masalah dan fakta-fakta kunci.",
        "3. Kumpulkan data dan lakukan analisis mendalam.",
        "4. Rumuskan solusi inovatif dan susun bahan presentasi kelompok."
      ],
      "studiKasusSoal": "Tuliskan studi kasus nyata yang menarik dan relevan dengan topik ini yang menantang nalar kritis siswa SMA."
    },
    "bahanBacaan": "Uraian ringkas bahan bacaan guru dan siswa mengenai esensi konsep materi, prinsip dasar, dan keterkaitannya dengan kehidupan.",
    "glosarium": [
      {
        "istilah": "Istilah kunci 1",
        "definisi": "Definisi istilah kunci 1"
      },
      {
        "istilah": "Istilah kunci 2",
        "definisi": "Definisi istilah kunci 2"
      }
    ],
    "daftarPustaka": [
      "Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi. (2024). Buku Panduan Guru dan Buku Siswa SMA. Jakarta: Pusat Perbukuan.",
      "Jurnal dan artikel ilmiah pembelajaran terkini yang relevan dengan topik."
    ]
  }
}

PASTIKAN seluruh array pertemuan berjumlah ${totalMeetings} item, dengan alur runtut dari Pertemuan 1 sampai Pertemuan ${totalMeetings}.`;

      const parsedData = await generateContentWithFallback(ai, prompt);
      res.json(parsedData);
    } catch (error: any) {
      console.error('Error generating modul ajar:', error);
      res.status(500).json({ error: error.message || 'Gagal meracik Modul Ajar Pembelajaran Mendalam' });
    }
  };

  app.all('/api/generate-modul', handleModulGen);
  app.all('/api/ai/modul', handleModulGen);
  app.all('/api/modul', handleModulGen);

  // Fallback for any unhandled /api/* request to prevent Vite static handler 405
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.path} tidak ditemukan.` });
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
