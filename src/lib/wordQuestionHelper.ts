import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle
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
