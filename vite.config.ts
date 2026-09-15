import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
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

function apiDevPlugin(geminiApiKey: string): Plugin {
  const executeWithFallback = async (ai: GoogleGenAI, prompt: string) => {
    const models = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let lastErr = null;
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
        } catch (e: any) {
          console.warn(`Vite dev plugin model ${model} attempt ${attempt + 1} gagal/sibuk:`, e.message);
          lastErr = e;
          if (e?.message?.includes('503') || e?.message?.includes('429')) {
            await new Promise((r) => setTimeout(r, 800));
          } else {
            break;
          }
        }
      }
    }
    throw lastErr || new Error('Gagal menghubungi model Gemini');
  };

  const handleCors = (res: any) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  };

  return {
    name: 'api-gemini-server',
    configureServer(server) {
      // Middleware for CORS and routes
      server.middlewares.use((req, res, next) => {
        handleCors(res);
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          return res.end();
        }

        const url = req.url?.split('?')[0] || '';

        // 1. Generate Material endpoint
        if (url === '/api/generate-material' || url === '/api/ai/material') {
          if (req.method !== 'POST') {
            res.statusCode = 200;
            return res.end(JSON.stringify({ status: 'ready' }));
          }
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: 'GEMINI_API_KEY belum disetel di server environment.' }));
              }

              const data = body ? JSON.parse(body) : {};
              const { subject, grade, topic, description } = data;
              if (!subject || !grade || !topic) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Data subject, grade, dan topic wajib diisi.' }));
              }

              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
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
  "videoUrl": "URL video pembelajaran YouTube yang relevan dengan topik (contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ atau https://youtu.be/xxx atau link embed edukasi relevan)",
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

              const parsed = await executeWithFallback(ai, prompt);
              return res.end(JSON.stringify(parsed));
            } catch (err: any) {
              console.error('Error in /api/generate-material:', err);
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: err.message || 'Gagal meracik bahan ajar AI.' }));
            }
          });
          return;
        }

        // 2. Generate Questions endpoint
        if (url === '/api/generate-questions' || url === '/api/ai/questions') {
          if (req.method !== 'POST') {
            res.statusCode = 200;
            return res.end(JSON.stringify({ status: 'ready' }));
          }
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: 'GEMINI_API_KEY belum disetel di server environment.' }));
              }

              const data = body ? JSON.parse(body) : {};
              const { topic, type, count } = data;
              if (!topic || !type || !count) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Missing required fields: topic, type, count' }));
              }

              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
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

              const parsed = await executeWithFallback(ai, prompt);
              return res.end(JSON.stringify(parsed));
            } catch (err: any) {
              console.error('Error in /api/generate-questions:', err);
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: err.message || 'Gagal meracik soal dari AI.' }));
            }
          });
          return;
        }

        // 3. Grade Essay endpoint
        if (url === '/api/grade-essay' || url === '/api/ai/grade-essay') {
          if (req.method !== 'POST') {
            res.statusCode = 200;
            return res.end(JSON.stringify({ status: 'ready' }));
          }
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: 'GEMINI_API_KEY belum disetel di server environment.' }));
              }

              const data = body ? JSON.parse(body) : {};
              const { question, answerKey, studentAnswer } = data;

              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
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

              const parsed = await executeWithFallback(ai, prompt);
              return res.end(JSON.stringify(parsed));
            } catch (err: any) {
              console.error('Error in /api/grade-essay:', err);
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: err.message || 'Failed to grade essay' }));
            }
          });
          return;
        }

        // 4. Generate Modul Ajar Pembelajaran Mendalam endpoint
        if (url === '/api/generate-modul' || url === '/api/ai/modul') {
          if (req.method !== 'POST') {
            res.statusCode = 200;
            return res.end(JSON.stringify({ status: 'ready' }));
          }
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: 'GEMINI_API_KEY belum disetel di server environment.' }));
              }

              const data = body ? JSON.parse(body) : {};
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
                namaKepsek
              } = data;

              if (!subject || !cp) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Mata pelajaran dan Capaian Pembelajaran wajib diisi.' }));
              }

              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
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
- Kepala Sekolah: ${headmaster}
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
          "Orientasi: Guru membuka pembelajaran dengan salam hangat, berdoa bersama, memeriksa kehadiran dan kenyamanan ruang kelas.",
          "Apersepsi: Guru mengaitkan materi prasyarat dengan mengajukan fenomena kontekstual terkini.",
          "Motivasi & Mindful: Guru menyampaikan tujuan pembelajaran, pemahaman bermakna, serta alur kegiatan menyenangkan hari ini."
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
          "Kesimpulan & Refleksi: Peserta didik bersama guru menyimpulkan inti pembelajaran dan melakukan refleksi terbimbing.",
          "Umpan Balik: Guru memberikan apresiasi dan umpan balik positif atas kolaborasi peserta didik.",
          "Tindak Lanjut & Penutup: Guru menginformasikan materi pertemuan berikutnya dan menutup dengan doa bersama."
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

              const parsed = await executeWithFallback(ai, prompt);
              return res.end(JSON.stringify(parsed));
            } catch (err: any) {
              console.error('Error in /api/generate-modul:', err);
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: err.message || 'Gagal meracik Modul Ajar AI.' }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

  return {
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(apiKey),
      'import.meta.env.GEMINI_API_KEY': JSON.stringify(apiKey),
    },
    plugins: [react(), tailwindcss(), apiDevPlugin(apiKey)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
