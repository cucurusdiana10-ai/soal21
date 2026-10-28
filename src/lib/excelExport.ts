import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Universal safe workbook downloader that functions properly in
 * desktop browsers, mobile devices (Safari / Chrome), and sandboxed iframes.
 */
export function saveWorkbookSafely(wb: XLSX.WorkBook, fileName: string) {
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    if (typeof saveAs === 'function') {
      saveAs(blob, fileName);
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.warn('Blob export failed, fallback to XLSX.writeFile:', err);
    XLSX.writeFile(wb, fileName);
  }
}

interface ExportTaskGradesOptions {
  task: any;
  items: Array<{ student: any; submission: any | null }>;
  calculateCombinedScore?: (
    answers: any,
    essayScores: any,
    questions: any[],
    weightPg?: number,
    weightEssay?: number
  ) => { pgScore: number; essayPoints: number; totalScore: number };
}

/**
 * Exports complete grade records of a task / exam to a pristine Microsoft Excel (.xlsx) file
 */
export function exportTaskGradesToExcel({
  task,
  items,
  calculateCombinedScore
}: ExportTaskGradesOptions) {
  if (!task) {
    throw new Error('Paket soal tidak ditemukan.');
  }

  const wb = XLSX.utils.book_new();

  const className = task.class?.name || 'Semua_Kelas';
  const taskTitle = task.title || 'Evaluasi';
  const subjectName = task.subject_name || '-';
  const taskKkm = Number(task.kkm !== undefined && task.kkm !== null ? task.kkm : 75);
  const weightPg = Number(task.weight_pg !== undefined && task.weight_pg !== null ? task.weight_pg : 70);
  const weightEssay = Number(task.weight_essay !== undefined && task.weight_essay !== null ? task.weight_essay : 30);
  const totalQuestions = Array.isArray(task.content) ? task.content.length : 0;
  const examTypeLabel =
    task.type === 'pg'
      ? 'Pilihan Ganda'
      : task.type === 'essay'
      ? 'Esai'
      : 'Campuran (PG & Esai)';

  // 1. Build Header & Info rows
  const sheetData: any[][] = [
    ['LAPORAN REKAPITULASI NILAI UJIAN & EVALUASI PEMBELAJARAN'],
    ['SMAN 21 GARUT - SISTEM CBT & PEMBELAJARAN'],
    [''],
    ['Mata Pelajaran', subjectName, '', 'Kelas', className],
    ['Paket Soal / Tugas', taskTitle, '', 'Tipe Soal', examTypeLabel],
    ['Standar KKM', taskKkm, '', 'Bobot Nilai', `PG: ${weightPg}% | Esai: ${weightEssay}%`],
    ['Jumlah Butir Soal', `${totalQuestions} Butir`, '', 'Waktu Cetak', new Date().toLocaleString('id-ID')],
    [''],
    // Table Header (Row index 8)
    [
      'No',
      'NISN',
      'Nama Lengkap Siswa',
      'Kelas',
      'Status Pengerjaan',
      'Nilai PG (0-100)',
      'Bobot PG',
      'Nilai Esai (0-100)',
      'Bobot Esai',
      'Nilai Akhir',
      'KKM',
      'Status Kelulusan',
      'Progres Jawaban',
      'Waktu Selesai'
    ]
  ];

  let completedScores: number[] = [];
  let passedCount = 0;
  let remedialCount = 0;

  // 2. Append student rows
  items.forEach((item, idx) => {
    const st = item.student || {};
    const sub = item.submission;
    const isCompleted = sub && (sub.status === 'graded' || sub.status === 'submitted');
    const isInProgress = sub && sub.status === 'in_progress';

    let pgScoreVal: any = '-';
    let essayScoreVal: any = '-';

    if (sub && calculateCombinedScore && Array.isArray(task.content) && task.content.length > 0) {
      const breakdown = calculateCombinedScore(
        sub.answers || {},
        sub.essay_scores || {},
        task.content,
        weightPg,
        weightEssay
      );
      pgScoreVal = breakdown.pgScore;
      essayScoreVal = breakdown.essayPoints;
    }

    let finalScoreVal: any = '-';
    let kelulusan = '-';

    if (sub && sub.score !== null && sub.score !== undefined && !isInProgress) {
      const numScore = Number(sub.score);
      finalScoreVal = numScore;
      completedScores.push(numScore);
      if (numScore >= taskKkm) {
        kelulusan = 'TUNTAS';
        passedCount++;
      } else {
        kelulusan = 'REMEDIAL';
        remedialCount++;
      }
    }

    let statusText = 'Belum Mulai';
    if (sub) {
      if (sub.status === 'graded') statusText = 'Sudah Dinilai';
      else if (sub.status === 'in_progress') statusText = 'Sedang Ujian';
      else statusText = 'Perlu Koreksi Esai';
    }

    let answeredText = '-';
    if (sub && sub.answers && typeof sub.answers === 'object') {
      const answeredCount = Object.values(sub.answers).filter(
        v => v !== null && v !== undefined && String(v).trim() !== ''
      ).length;
      answeredText = `${answeredCount}/${totalQuestions}`;
    }

    let finishedAtText = '-';
    if (sub?.updated_at || sub?.created_at) {
      try {
        finishedAtText = new Date(sub.updated_at || sub.created_at).toLocaleString('id-ID');
      } catch {
        finishedAtText = '-';
      }
    }

    sheetData.push([
      idx + 1,
      String(st.username || '-'),
      st.name || '-',
      className,
      statusText,
      pgScoreVal,
      `${weightPg}%`,
      essayScoreVal,
      `${weightEssay}%`,
      finalScoreVal,
      taskKkm,
      kelulusan,
      answeredText,
      finishedAtText
    ]);
  });

  // 3. Add summary block at the end
  const totalStudents = items.length;
  const assessedStudents = completedScores.length;
  const avgScore =
    assessedStudents > 0
      ? Math.round((completedScores.reduce((a, b) => a + b, 0) / assessedStudents) * 10) / 10
      : 0;
  const highestScore = assessedStudents > 0 ? Math.max(...completedScores) : 0;
  const lowestScore = assessedStudents > 0 ? Math.min(...completedScores) : 0;
  const passRate = assessedStudents > 0 ? Math.round((passedCount / assessedStudents) * 100) : 0;

  sheetData.push(
    [''],
    ['RINGKASAN STATISTIK EVALUASI KELAS'],
    ['Total Siswa Terdaftar', totalStudents],
    ['Siswa Sudah Dinilai', assessedStudents],
    ['Nilai Rata-Rata Kelas', avgScore],
    ['Nilai Tertinggi', highestScore],
    ['Nilai Terendah', lowestScore],
    ['Jumlah Siswa Tuntas (≥ KKM)', passedCount],
    ['Jumlah Siswa Remedial (< KKM)', remedialCount],
    ['Persentase Ketuntasan Belajar', `${passRate}%`]
  );

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set professional column widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 18 }, // NISN
    { wch: 32 }, // Nama Siswa
    { wch: 12 }, // Kelas
    { wch: 20 }, // Status Pengerjaan
    { wch: 16 }, // Nilai PG
    { wch: 12 }, // Bobot PG
    { wch: 16 }, // Nilai Esai
    { wch: 12 }, // Bobot Esai
    { wch: 14 }, // Nilai Akhir
    { wch: 10 }, // KKM
    { wch: 18 }, // Status Kelulusan
    { wch: 16 }, // Progres Jawaban
    { wch: 22 }  // Waktu Selesai
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'REKAP_NILAI');

  const safeTitle = (taskTitle || 'Nilai').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  const safeClass = (className || 'Kelas').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Rekap_Nilai_${safeClass}_${safeTitle}.xlsx`;

  saveWorkbookSafely(wb, fileName);
  return fileName;
}

/**
 * Exports student personal grade transcripts to Excel (.xlsx)
 */
export function exportStudentTranscriptToExcel({
  studentName,
  studentUsername,
  className,
  submissions
}: {
  studentName: string;
  studentUsername: string;
  className?: string;
  submissions: any[];
}) {
  const wb = XLSX.utils.book_new();

  const sheetData: any[][] = [
    ['TRANSKRIP HASIL BELAJAR & NILAI SISWA'],
    ['SMAN 21 GARUT - CBT & PEMBELAJARAN'],
    [''],
    ['Nama Siswa', studentName, '', 'NISN / Username', studentUsername],
    ['Kelas', className || '-', '', 'Tanggal Cetak', new Date().toLocaleString('id-ID')],
    [''],
    [
      'No',
      'Mata Pelajaran',
      'Judul Tugas / Ujian',
      'Tipe Ujian',
      'KKM',
      'Nilai PG',
      'Nilai Esai',
      'Nilai Akhir',
      'Status Kelulusan',
      'Tanggal Pengerjaan',
      'Catatan / Feedback Guru'
    ]
  ];

  let completedScores: number[] = [];
  let passedCount = 0;

  submissions.forEach((sub, idx) => {
    const task = sub.task || {};
    const taskKkm = Number(task.kkm !== undefined && task.kkm !== null ? task.kkm : 75);
    const scoreVal = sub.score !== null && sub.score !== undefined ? Number(sub.score) : null;
    const isPass = scoreVal !== null && scoreVal >= taskKkm;

    if (scoreVal !== null) {
      completedScores.push(scoreVal);
      if (isPass) passedCount++;
    }

    const examTypeLabel =
      task.type === 'pg'
        ? 'Pilihan Ganda'
        : task.type === 'essay'
        ? 'Esai'
        : 'Campuran';

    const dateStr = sub.created_at
      ? new Date(sub.created_at).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      : '-';

    sheetData.push([
      idx + 1,
      task.subject_name || '-',
      task.title || '-',
      examTypeLabel,
      taskKkm,
      sub.pg_score ?? '-',
      sub.essay_score ?? '-',
      scoreVal !== null ? scoreVal : 'Menunggu',
      scoreVal !== null ? (isPass ? 'TUNTAS' : 'REMEDIAL') : 'Diproses',
      dateStr,
      sub.feedback || '-'
    ]);
  });

  const avg =
    completedScores.length > 0
      ? Math.round((completedScores.reduce((a, b) => a + b, 0) / completedScores.length) * 10) / 10
      : 0;

  sheetData.push(
    [''],
    ['RINGKASAN TRANSKRIP'],
    ['Total Tugas/Ujian Terdata', submissions.length],
    ['Total Tugas Selesai Dinilai', completedScores.length],
    ['Rata-Rata Nilai Keseluruhan', avg],
    ['Jumlah Tugas Tuntas', passedCount]
  );

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 22 }, // Mapel
    { wch: 32 }, // Judul
    { wch: 16 }, // Tipe
    { wch: 8 },  // KKM
    { wch: 12 }, // PG
    { wch: 12 }, // Esai
    { wch: 12 }, // Akhir
    { wch: 16 }, // Status
    { wch: 18 }, // Tanggal
    { wch: 35 }  // Feedback
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'TRANSKRIP_NILAI');

  const safeName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const fileName = `Transkrip_Nilai_${safeName}.xlsx`;

  saveWorkbookSafely(wb, fileName);
  return fileName;
}
