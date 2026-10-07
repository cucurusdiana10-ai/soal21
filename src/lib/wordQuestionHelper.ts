import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType
} from 'docx';
import { saveAs } from 'file-saver';

export interface ImportedQuestion {
  type: 'pg' | 'essay';
  question: string;
  options: string[];
  answer: string;
  answerKey: string;
  explanation: string;
}

/**
 * Generates and downloads a ready-to-fill Microsoft Word (.docx) template for manual questions.
 */
export async function downloadWordQuestionTemplate(
  optionCount: number = 5,
  subjectName: string = 'Mata Pelajaran',
  topicTitle: string = 'Ulangan Harian'
) {
  const numOpts = Math.min(5, Math.max(3, Number(optionCount) || 5));
  const letters = Array.from({ length: numOpts }, (_, i) => String.fromCharCode(65 + i));

  const buildSampleOptions = (prefix: string) =>
    letters.map(
      letter =>
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: `${letter}. `, bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ text: `${prefix} pilihan jawaban ${letter}`, size: 22, font: 'Calibri' })
          ]
        })
    );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'TEMPLATE IMPORT SOAL MANUAL - SMAN 21 GARUT',
                bold: true,
                size: 28,
                font: 'Calibri'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            border: {
              bottom: { color: '334155', space: 6, style: BorderStyle.SINGLE, size: 12 }
            },
            children: [
              new TextRun({
                text: `Mata Pelajaran: ${subjectName || 'Umum'}  |  Topik: ${topicTitle || 'Evaluasi'}  |  Format PG: ${numOpts} Pilihan (${letters.join(', ')})`,
                size: 20,
                italics: true,
                color: '475569',
                font: 'Calibri'
              })
            ]
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 120, after: 100 },
            children: [
              new TextRun({
                text: 'PETUNJUK PENULISAN SOAL DI MICROSOFT WORD:',
                bold: true,
                size: 22,
                color: '1E3A8A',
                font: 'Calibri'
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: '1. Gunakan nomor urut (1., 2., 3., dst.) untuk memulai setiap butir pertanyaan baru.',
                size: 20,
                font: 'Calibri'
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `2. Untuk soal Pilihan Ganda (PG), tuliskan pilihan jawaban di bawah pertanyaan menggunakan huruf (${letters.map(l => `${l}.`).join(' ')}).`,
                size: 20,
                font: 'Calibri'
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: '3. Tuliskan "Kunci: A" (atau huruf kunci yang benar) di bawah pilihan jawaban. Untuk soal Esai, cukup tulis pertanyaan tanpa opsi A/B/C lalu tulis "Kunci: [Uraian Kunci Jawaban]".',
                size: 20,
                font: 'Calibri'
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 280 },
            children: [
              new TextRun({
                text: '4. Baris petunjuk ini akan diabaikan otomatis oleh sistem saat di-import. Silakan edit atau tambahkan soal di bawah garis "--- MULAI SOAL ---".',
                size: 20,
                font: 'Calibri'
              })
            ]
          }),

          new Paragraph({
            spacing: { before: 100, after: 200 },
            children: [
              new TextRun({
                text: '--- MULAI SOAL ---',
                bold: true,
                size: 22,
                color: '0F172A',
                font: 'Calibri'
              })
            ]
          }),

          // Sample Question 1 (PG)
          new Paragraph({
            spacing: { before: 120, after: 100 },
            children: [
              new TextRun({ text: '1. ', bold: true, size: 22, font: 'Calibri' }),
              new TextRun({
                text: 'Tuliskan teks pertanyaan pilihan ganda nomor 1 di sini sesuai materi yang diajarkan...',
                size: 22,
                font: 'Calibri'
              })
            ]
          }),
          ...buildSampleOptions('Contoh teks'),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Kunci: A', bold: true, size: 22, color: '15803D', font: 'Calibri' })
            ]
          }),
          new Paragraph({
            spacing: { after: 220 },
            children: [
              new TextRun({
                text: 'Pembahasan: Penjelasan singkat mengapa jawaban A benar (opsional).',
                italics: true,
                size: 20,
                color: '475569',
                font: 'Calibri'
              })
            ]
          }),

          // Sample Question 2 (PG)
          new Paragraph({
            spacing: { before: 120, after: 100 },
            children: [
              new TextRun({ text: '2. ', bold: true, size: 22, font: 'Calibri' }),
              new TextRun({
                text: 'Tuliskan teks pertanyaan pilihan ganda nomor 2 di sini...',
                size: 22,
                font: 'Calibri'
              })
            ]
          }),
          ...buildSampleOptions('Isi'),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Kunci: B', bold: true, size: 22, color: '15803D', font: 'Calibri' })
            ]
          }),
          new Paragraph({
            spacing: { after: 220 },
            children: [
              new TextRun({
                text: 'Pembahasan: Penjelasan singkat mengapa jawaban B benar (opsional).',
                italics: true,
                size: 20,
                color: '475569',
                font: 'Calibri'
              })
            ]
          }),

          // Sample Question 3 (Essay)
          new Paragraph({
            spacing: { before: 120, after: 100 },
            children: [
              new TextRun({ text: '3. ', bold: true, size: 22, font: 'Calibri' }),
              new TextRun({
                text: '[ESAI] Jelaskan secara ringkas konsep utama materi pembelajaran dan berikan contoh penerapannya dalam kehidupan sehari-hari!',
                size: 22,
                font: 'Calibri'
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'Kunci: Siswa menjelaskan definisi konsep dengan tepat serta menyebutkan minimal 2 contoh nyata di lingkungan sekitar.',
                bold: true,
                size: 22,
                color: 'B45309',
                font: 'Calibri'
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const safeSubject = (subjectName || 'Mapel').replace(/[^a-zA-Z0-9_-]/g, '_');
  saveAs(blob, `Template_Soal_Word_${safeSubject}_${numOpts}Opsi.docx`);
}

/**
 * Extracts plain text lines from a .docx (ZIP containing word/document.xml) or .doc/.txt file.
 */
export async function extractTextFromWordFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check if file is a ZIP archive (.docx starts with PK\x03\x04)
  if (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    const xmlText = await extractDocumentXmlFromDocxZip(buffer);
    if (xmlText) {
      return parseWordXmlToPlainText(xmlText);
    }
  }

  // Fallback for .doc (HTML/RTF/Plain text) or .txt
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let rawText = decoder.decode(buffer);

  // If HTML-based .doc file
  if (rawText.includes('<html') || rawText.includes('<body') || rawText.includes('<p')) {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(rawText, 'text/html');
    const paragraphs: string[] = [];
    htmlDoc.querySelectorAll('p, li, tr, div').forEach(el => {
      const t = (el.textContent || '').trim();
      if (t) paragraphs.push(t);
    });
    if (paragraphs.length > 0) {
      return paragraphs.join('\n');
    }
  }

  return rawText;
}

/**
 * Minimal browser-native ZIP reader to extract "word/document.xml" from a .docx ArrayBuffer
 */
async function extractDocumentXmlFromDocxZip(buffer: ArrayBuffer): Promise<string | null> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034b50) {
      break;
    }

    const generalFlag = view.getUint16(offset + 6, true);
    const compressionMethod = view.getUint16(offset + 8, true);
    let compressedSize = view.getUint32(offset + 18, true);
    const fileNameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLen);
    const fileName = new TextDecoder('utf-8').decode(fileNameBytes);
    const dataStart = offset + 30 + fileNameLen + extraLen;

    // If bit 3 of generalFlag is set, sizes might be in Central Directory instead of Local Header
    if (compressedSize === 0 && (generalFlag & 0x08) !== 0) {
      compressedSize = findCompressedSizeInCentralDir(view, bytes, fileName);
    }

    if (fileName === 'word/document.xml') {
      const compressedData = bytes.subarray(dataStart, dataStart + compressedSize);
      if (compressionMethod === 0) {
        return new TextDecoder('utf-8').decode(compressedData);
      } else if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compressedData);
        writer.close();
        const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
        return new TextDecoder('utf-8').decode(decompressedBuffer);
      }
    }

    if (compressedSize === 0) {
      break;
    }
    offset = dataStart + compressedSize;
  }

  // Fallback search in Central Directory if local headers had 0 sizes
  return extractFromCentralDirectory(view, bytes);
}

function findCompressedSizeInCentralDir(view: DataView, bytes: Uint8Array, targetName: string): number {
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      const cdOffset = view.getUint32(i + 16, true);
      const totalEntries = view.getUint16(i + 10, true);
      let ptr = cdOffset;
      for (let e = 0; e < totalEntries && ptr + 46 <= bytes.length; e++) {
        if (view.getUint32(ptr, true) !== 0x02014b50) break;
        const compSize = view.getUint32(ptr + 20, true);
        const nameLen = view.getUint16(ptr + 28, true);
        const extraLen = view.getUint16(ptr + 30, true);
        const commentLen = view.getUint16(ptr + 32, true);
        const name = new TextDecoder('utf-8').decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
        if (name === targetName) return compSize;
        ptr += 46 + nameLen + extraLen + commentLen;
      }
      break;
    }
  }
  return 0;
}

async function extractFromCentralDirectory(view: DataView, bytes: Uint8Array): Promise<string | null> {
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      const cdOffset = view.getUint32(i + 16, true);
      const totalEntries = view.getUint16(i + 10, true);
      let ptr = cdOffset;
      for (let e = 0; e < totalEntries && ptr + 46 <= bytes.length; e++) {
        if (view.getUint32(ptr, true) !== 0x02014b50) break;
        const compressionMethod = view.getUint16(ptr + 10, true);
        const compSize = view.getUint32(ptr + 20, true);
        const nameLen = view.getUint16(ptr + 28, true);
        const extraLen = view.getUint16(ptr + 30, true);
        const commentLen = view.getUint16(ptr + 32, true);
        const localHeaderOffset = view.getUint32(ptr + 42, true);
        const name = new TextDecoder('utf-8').decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));

        if (name === 'word/document.xml') {
          const localNameLen = view.getUint16(localHeaderOffset + 26, true);
          const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
          const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
          const compressedData = bytes.subarray(dataStart, dataStart + compSize);
          if (compressionMethod === 0) {
            return new TextDecoder('utf-8').decode(compressedData);
          } else if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            writer.write(compressedData);
            writer.close();
            const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
            return new TextDecoder('utf-8').decode(decompressedBuffer);
          }
        }
        ptr += 46 + nameLen + extraLen + commentLen;
      }
      break;
    }
  }
  return null;
}

function parseWordXmlToPlainText(xmlString: string): string {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
  const lines: string[] = [];

  const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'));
  for (const p of paragraphs) {
    const texts = Array.from(p.getElementsByTagName('w:t')).map(t => t.textContent || '');
    const line = texts.join('').trim();
    if (line) {
      lines.push(line);
    }
  }

  return lines.join('\n');
}

/**
 * Parses extracted Word text into structured Pilihan Ganda (PG) and Esai questions.
 */
export function parseQuestionsFromText(
  rawText: string,
  defaultOptionCount: number = 5
): ImportedQuestion[] {
  if (!rawText || !rawText.trim()) return [];

  // If text contains "--- MULAI SOAL ---", only parse after that marker
  let workingText = rawText;
  const startMarkerIdx = workingText.indexOf('--- MULAI SOAL ---');
  if (startMarkerIdx !== -1) {
    workingText = workingText.slice(startMarkerIdx + '--- MULAI SOAL ---'.length);
  }

  const lines = workingText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const questions: ImportedQuestion[] = [];
  let current: {
    questionLines: string[];
    options: Record<string, string>;
    answer: string;
    explanation: string;
    forcedEssay: boolean;
  } | null = null;

  const flushCurrent = () => {
    if (!current || current.questionLines.length === 0) return;
    let qText = current.questionLines.join('\n').trim();
    const isEssayTag = /^\[(ESAI|ESSAY|URAIAN)\]\s*/i.test(qText);
    if (isEssayTag) {
      qText = qText.replace(/^\[(ESAI|ESSAY|URAIAN)\]\s*/i, '').trim();
    }

    const optKeys = Object.keys(current.options).sort();
    const hasOptions = optKeys.length >= 2 && !current.forcedEssay && !isEssayTag;

    if (hasOptions) {
      const targetCount = Math.max(optKeys.length, Math.min(5, Math.max(3, defaultOptionCount)));
      const finalOptions: string[] = [];
      for (let i = 0; i < targetCount; i++) {
        const letter = String.fromCharCode(65 + i);
        if (current.options[letter] !== undefined) {
          finalOptions.push(current.options[letter]);
        } else if (i < optKeys.length) {
          finalOptions.push(current.options[optKeys[i]]);
        }
      }

      const cleanAns = (current.answer || 'A').trim().toUpperCase().charAt(0);
      const validAns = /^[A-E]$/.test(cleanAns) ? cleanAns : 'A';

      questions.push({
        type: 'pg',
        question: qText,
        options: finalOptions,
        answer: validAns,
        answerKey: validAns,
        explanation: current.explanation || ''
      });
    } else {
      questions.push({
        type: 'essay',
        question: qText,
        options: [],
        answer: current.answer || '',
        answerKey: current.answer || '',
        explanation: current.explanation || ''
      });
    }
    current = null;
  };

  for (const line of lines) {
    // Skip template header/instruction lines if marker wasn't used
    if (
      /^TEMPLATE IMPORT SOAL/i.test(line) ||
      /^PETUNJUK PENULISAN SOAL/i.test(line) ||
      /^Mata Pelajaran:/i.test(line)
    ) {
      continue;
    }

    // Check if line is Answer Key: "Kunci: A" or "Kunci Jawaban: B" or "Jawaban: C"
    const keyMatch = line.match(/^(?:kunci(?:\s*jawaban)?|jawaban|answer)\s*[:=]\s*(.+)$/i);
    if (keyMatch && current) {
      current.answer = keyMatch[1].trim();
      continue;
    }

    // Check if line is Explanation: "Pembahasan: ..."
    const expMatch = line.match(/^(?:pembahasan|penjelasan)\s*[:=]\s*(.+)$/i);
    if (expMatch && current) {
      current.explanation = expMatch[1].trim();
      continue;
    }

    // Check if line is an Option: "A. ...", "B) ...", "*C. ..." (asterisk denotes correct answer)
    const optMatch = line.match(/^(\*)?\s*([A-Ea-e])\s*[.)]\s*(.+)$/);
    if (optMatch && current) {
      const isStarred = Boolean(optMatch[1]);
      const letter = optMatch[2].toUpperCase();
      const optText = optMatch[3].trim();
      current.options[letter] = optText;
      if (isStarred) {
        current.answer = letter;
      }
      continue;
    }

    // Check if line starts a new numbered question: "1. ...", "2) ...", "Soal 1: ..."
    const qMatch = line.match(/^(?:soal\s*)?(\d+)\s*[.):-]\s*(.+)$/i);
    if (qMatch) {
      flushCurrent();
      const qBody = qMatch[2].trim();
      current = {
        questionLines: [qBody],
        options: {},
        answer: '',
        explanation: '',
        forcedEssay: /^\[(ESAI|ESSAY|URAIAN)\]/i.test(qBody)
      };
      continue;
    }

    // Continuation line for current question
    if (current) {
      if (Object.keys(current.options).length === 0 && !current.answer) {
        current.questionLines.push(line);
      }
    }
  }

  flushCurrent();
  return questions;
}

/**
 * Downloads a published task package as a complete Microsoft Word (.docx) document,
 * complete with Kop Surat SMAN 21 Garut, metadata (Mata Pelajaran, Kelas, KKM, Bentuk Soal),
 * petunjuk pengerjaan, naskah butir soal siswa, serta lampiran kunci jawaban guru.
 */
export async function downloadPublishedTaskAsWord(
  task: any,
  className?: string,
  kkmValue?: number,
  teacherName?: string
) {
  if (!task) return;

  const title = task.title || 'Naskah Soal';
  const subject = task.subject_name || 'Mata Pelajaran';
  const targetClass = className || (task.classes?.name ? `Kelas ${task.classes.name}` : 'Semua Kelas');
  const kkm = task.kkm !== undefined && task.kkm !== null ? task.kkm : (kkmValue || 75);
  const questions: any[] = Array.isArray(task.content) ? task.content : [];
  const typeText =
    task.type === 'pg'
      ? 'Pilihan Ganda (PG)'
      : task.type === 'essay'
      ? 'Esai / Uraian'
      : 'Campuran (Pilihan Ganda & Esai)';

  const tableBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }
  };

  const createCell = (text: string, isBold: boolean = false, widthPct: number = 50, bgColor?: string) => {
    return new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      shading: bgColor ? { fill: bgColor } : undefined,
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: isBold,
              size: 20,
              font: 'Calibri'
            })
          ],
          spacing: { before: 40, after: 40 }
        })
      ],
      borders: tableBorder
    });
  };

  const docChildren: any[] = [];

  // 1. KOP SURAT RESMI
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
          bold: true,
          size: 22,
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'DINAS PENDIDIKAN - CABANG DINAS PENDIDIKAN WILAYAH XI',
          bold: true,
          size: 22,
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'SMA NEGERI 21 GARUT',
          bold: true,
          size: 26,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      border: {
        bottom: { color: '1E3A8A', space: 6, style: BorderStyle.DOUBLE, size: 18 }
      },
      children: [
        new TextRun({
          text: 'Alamat: Jl. Raya Talegong No. 21, Kec. Talegong, Kab. Garut, Jawa Barat 44167 • NPSN: 20209194',
          italics: true,
          size: 18,
          color: '475569',
          font: 'Calibri'
        })
      ]
    }),

    // 2. JUDUL NASKAH SOAL
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [
        new TextRun({
          text: 'NASKAH SOAL EVALUASI PEMBELAJARAN',
          bold: true,
          size: 24,
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 22,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ]
    })
  );

  // 3. TABEL INFORMASI / IDENTITAS SOAL
  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createCell('Mata Pelajaran', true, 25, 'F1F5F9'),
            createCell(subject, false, 25),
            createCell('Kelas / Sasaran', true, 25, 'F1F5F9'),
            createCell(targetClass, false, 25)
          ]
        }),
        new TableRow({
          children: [
            createCell('Kriteria Ketuntasan (KKM)', true, 25, 'F1F5F9'),
            createCell(`${kkm} (Minimal Tuntas)`, true, 25),
            createCell('Bentuk Soal', true, 25, 'F1F5F9'),
            createCell(typeText, false, 25)
          ]
        }),
        new TableRow({
          children: [
            createCell('Jumlah Butir Soal', true, 25, 'F1F5F9'),
            createCell(`${questions.length} Butir Soal`, false, 25),
            createCell('Guru Pengampu', true, 25, 'F1F5F9'),
            createCell(teacherName || 'Guru Mata Pelajaran', false, 25)
          ]
        })
      ]
    }),
    new Paragraph({ spacing: { after: 140 } })
  );

  // 4. PETUNJUK PENGERJAAN
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({
          text: 'PETUNJUK UMUM PENGERJAAN:',
          bold: true,
          size: 20,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: '1. Berdoalah sebelum mulai mengerjakan naskah soal.',
          size: 20,
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: '2. Tuliskan Nama Lengkap, Nomor Induk Siswa (NISN), dan Kelas pada lembar pengerjaan.',
          size: 20,
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: '3. Periksa kelengkapan naskah dan bacalah setiap butir soal dengan cermat sebelum menjawab.',
          size: 20,
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: '4. Untuk soal Pilihan Ganda, silang (X) atau pilih salah satu huruf (A, B, C, D, atau E) yang paling tepat.',
          size: 20,
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: '5. Kerjakan terlebih dahulu butir soal yang Anda anggap mudah dengan jujur dan percaya diri.',
          size: 20,
          font: 'Calibri'
        })
      ]
    })
  );

  // 5. BUTIR-BUTIR SOAL SISWA
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 140, after: 100 },
      border: {
        bottom: { color: 'CCCCCC', space: 4, style: BorderStyle.SINGLE, size: 6 }
      },
      children: [
        new TextRun({
          text: 'DAFTAR PERTANYAAN SOAL',
          bold: true,
          size: 22,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ]
    })
  );

  questions.forEach((q, idx) => {
    // Soal Text
    docChildren.push(
      new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({
            text: `${idx + 1}. `,
            bold: true,
            size: 22,
            font: 'Calibri'
          }),
          new TextRun({
            text: q.question || '',
            size: 22,
            font: 'Calibri'
          })
        ]
      })
    );

    // If PG, render options
    if (q.type === 'pg' && Array.isArray(q.options) && q.options.length > 0) {
      q.options.forEach((opt: string, oIdx: number) => {
        const letter = String.fromCharCode(65 + oIdx);
        docChildren.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: `${letter}. `,
                bold: true,
                size: 20,
                font: 'Calibri'
              }),
              new TextRun({
                text: String(opt || ''),
                size: 20,
                font: 'Calibri'
              })
            ]
          })
        );
      });
    }

    // If Essay, render answer space lines
    if (q.type === 'essay') {
      docChildren.push(
        new Paragraph({
          indent: { left: 400 },
          spacing: { before: 60, after: 40 },
          children: [
            new TextRun({
              text: 'Lembar Jawaban Uraian:',
              italics: true,
              size: 18,
              color: '64748B',
              font: 'Calibri'
            })
          ]
        }),
        new Paragraph({
          indent: { left: 400 },
          spacing: { after: 30 },
          children: [
            new TextRun({
              text: '_________________________________________________________________________________',
              color: 'CBD5E1',
              size: 18
            })
          ]
        }),
        new Paragraph({
          indent: { left: 400 },
          spacing: { after: 30 },
          children: [
            new TextRun({
              text: '_________________________________________________________________________________',
              color: 'CBD5E1',
              size: 18
            })
          ]
        }),
        new Paragraph({
          indent: { left: 400 },
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: '_________________________________________________________________________________',
              color: 'CBD5E1',
              size: 18
            })
          ]
        })
      );
    }
  });

  // 6. LEMBAR KUNCI JAWABAN & PEMBAHASAN GURU
  docChildren.push(
    new Paragraph({
      spacing: { before: 360, after: 80 },
      border: {
        top: { color: '1E3A8A', space: 6, style: BorderStyle.DASHED, size: 8 }
      },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: '--- LEMBAR PEGANGAN GURU: KUNCI JAWABAN & PEMBAHASAN ---',
          bold: true,
          size: 22,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `Paket Soal: ${title} • KKM: ${kkm} • Target: ${targetClass}`,
          italics: true,
          size: 18,
          color: '475569',
          font: 'Calibri'
        })
      ]
    })
  );

  questions.forEach((q, idx) => {
    const isPg = q.type === 'pg';
    const key = isPg ? q.answer : q.answerKey || q.answer || '-';
    docChildren.push(
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({
            text: `Soal No. ${idx + 1} (${isPg ? 'Pilihan Ganda' : 'Esai'}): `,
            bold: true,
            size: 20,
            font: 'Calibri'
          }),
          new TextRun({
            text: `Kunci Jawaban: ${key}`,
            bold: true,
            color: '047857',
            size: 20,
            font: 'Calibri'
          })
        ]
      })
    );

    if (q.explanation) {
      docChildren.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `Pembahasan: ${q.explanation}`,
              italics: true,
              size: 18,
              color: '334155',
              font: 'Calibri'
            })
          ]
        })
      );
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000
            }
          }
        },
        children: docChildren
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const cleanTitle = (title || 'Soal').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanClass = (targetClass || 'Kelas').replace(/[^a-zA-Z0-9_-]/g, '_');
  saveAs(blob, `[Soal]_${cleanTitle}_${cleanClass}.docx`);
}

