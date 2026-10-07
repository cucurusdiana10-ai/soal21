import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle
} from 'docx';
import { saveAs } from 'file-saver';
import { parseKepsek, getStoredTtdKepsek } from './schoolSettings';

export interface LkpdContent {
  identitas: {
    namaSekolah: string;
    npsn?: string;
    alamatSekolah?: string;
    mataPelajaran: string;
    fase: string;
    alokasiWaktu: string;
    pertemuanKe: string;
    judulLkpd: string;
    namaGuru: string;
    nipGuru?: string;
    tahunPelajaran?: string;
    semester?: string;
    tanggal?: string;
  };
  tujuanPembelajaran: string[];
  kriteriaKetercapaian?: string[];
  petunjukBelajar: string[];
  stimulusKontekstual: {
    judul: string;
    narasi: string;
    pertanyaanAwal?: string;
  };
  langkahInvestigasi: Array<{
    langkahKe: number;
    instruksi: string;
    fokusAktivitas?: string;
  }>;
  tabelPengamatan?: {
    judulTabel: string;
    kolom: string[];
    barisContoh?: string[][];
  };
  pertanyaanDiskusi: string[];
  kesimpulanDanRefleksi: {
    panduanKesimpulan: string;
    refleksiSiswa: string[];
  };
  rubrikPenilaian?: Array<{
    aspek: string;
    skor4: string;
    skor3: string;
    skor2: string;
    skor1: string;
  }>;
}

export async function exportLkpdToDocx(data: LkpdContent, customFileName?: string) {
  const ident = data.identitas || ({} as any);
  const schoolName = ident.namaSekolah || 'SMAN 21 Garut';
  const schoolAddress = ident.alamatSekolah || 'Jl. Raya Talegong No. 21, Kec. Talegong, Kab. Garut, Jawa Barat 44167';
  const npsn = ident.npsn || '20209194';

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
              size: 20, // 10pt
              font: 'Calibri'
            })
          ],
          spacing: { before: 60, after: 60 }
        })
      ],
      borders: tableBorder
    });
  };

  const docChildren: any[] = [];

  // 1. KOP SURAT
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
          text: schoolName.toUpperCase(),
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
          text: `Alamat: ${schoolAddress} • NPSN: ${npsn}`,
          italics: true,
          size: 18,
          color: '475569',
          font: 'Calibri'
        })
      ]
    })
  );

  // 2. JUDUL LKPD
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 40 },
      children: [
        new TextRun({
          text: 'LEMBAR KERJA PESERTA DIDIK (LKPD)',
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
          text: (ident.judulLkpd || 'PEMBELAJARAN MENDALAM').toUpperCase(),
          bold: true,
          size: 22,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ]
    })
  );

  // 3. TABEL IDENTITAS & ANGGOTA KELOMPOK
  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createCell('Mata Pelajaran', true, 22, 'F1F5F9'),
            createCell(ident.mataPelajaran || '-', false, 28),
            createCell('Nama Kelompok', true, 22, 'F1F5F9'),
            createCell('Kelompok: ................................', false, 28)
          ]
        }),
        new TableRow({
          children: [
            createCell('Fase / Kelas', true, 22, 'F1F5F9'),
            createCell(ident.fase || '-', false, 28),
            createCell('Anggota 1 (Ketua)', true, 22, 'F1F5F9'),
            createCell('1. ........................................', false, 28)
          ]
        }),
        new TableRow({
          children: [
            createCell('Alokasi Waktu', true, 22, 'F1F5F9'),
            createCell(ident.alokasiWaktu || '-', false, 28),
            createCell('Anggota 2', true, 22, 'F1F5F9'),
            createCell('2. ........................................', false, 28)
          ]
        }),
        new TableRow({
          children: [
            createCell('Pertemuan Ke-', true, 22, 'F1F5F9'),
            createCell(ident.pertemuanKe || 'Pertemuan 1', true, 28),
            createCell('Anggota 3', true, 22, 'F1F5F9'),
            createCell('3. ........................................', false, 28)
          ]
        }),
        new TableRow({
          children: [
            createCell('Guru Pengampu', true, 22, 'F1F5F9'),
            createCell(ident.namaGuru || '-', false, 28),
            createCell('Anggota 4 & 5', true, 22, 'F1F5F9'),
            createCell('4. ................... 5. ...................', false, 28)
          ]
        })
      ]
    }),
    new Paragraph({ spacing: { after: 140 } })
  );

  // 4. A. TUJUAN PEMBELAJARAN
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 120, after: 60 },
      children: [
        new TextRun({
          text: 'A. TUJUAN PEMBELAJARAN',
          bold: true,
          size: 22,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ]
    })
  );

  if (Array.isArray(data.tujuanPembelajaran) && data.tujuanPembelajaran.length > 0) {
    data.tujuanPembelajaran.forEach((tp, idx) => {
      docChildren.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `${idx + 1}. ${tp}`, size: 20, font: 'Calibri' })
          ]
        })
      );
    });
  }

  // 5. B. PETUNJUK PENGERJAAN
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 120, after: 60 },
      children: [
        new TextRun({
          text: 'B. PETUNJUK PENGERJAAN LKPD',
          bold: true,
          size: 22,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ]
    })
  );

  const petunjuk = data.petunjukBelajar || [
    'Bacalah stimulus kontekstual dan instruksi dengan saksama bersama kelompok.',
    'Bagi peran secara adil dan kolaboratif di antara anggota kelompok.',
    'Lakukan investigasi atau analisis data berdasarkan panduan langkah kerja.',
    'Jawab pertanyaan diskusi secara kritis dan argumentatif pada lembar yang disediakan.',
    'Persiapkan diri untuk mempresentasikan hasil temuan di depan kelas.'
  ];

  petunjuk.forEach((ptk, idx) => {
    docChildren.push(
      new Paragraph({
        indent: { left: 360 },
        spacing: { after: 40 },
        children: [
          new TextRun({ text: `${idx + 1}. ${ptk}`, size: 20, font: 'Calibri' })
        ]
      })
    );
  });

  // 6. C. STIMULUS / ORIENTASI MASALAH KONTEKSTUAL
  if (data.stimulusKontekstual) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 140, after: 60 },
        children: [
          new TextRun({
            text: 'C. STIMULUS & ORIENTASI MASALAH NYATA (DEEP LEARNING)',
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
            text: `Topik Studi Kasus: ${data.stimulusKontekstual.judul || 'Fenomena Kehidupan Nyata'}`,
            bold: true,
            size: 20,
            font: 'Calibri'
          })
        ]
      }),
      new Paragraph({
        indent: { left: 360 },
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: data.stimulusKontekstual.narasi || '-',
            size: 20,
            font: 'Calibri',
            italics: true
          })
        ]
      })
    );

    if (data.stimulusKontekstual.pertanyaanAwal) {
      docChildren.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 120 },
          children: [
            new TextRun({ text: 'Pertanyaan Pemantik: ', bold: true, size: 20, font: 'Calibri' }),
            new TextRun({ text: data.stimulusKontekstual.pertanyaanAwal, size: 20, font: 'Calibri' })
          ]
        })
      );
    }
  }

  // 7. D. LANGKAH INVESTIGASI & AKTIVITAS KELOMPOK
  if (Array.isArray(data.langkahInvestigasi) && data.langkahInvestigasi.length > 0) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 140, after: 60 },
        children: [
          new TextRun({
            text: 'D. LANGKAH INVESTIGASI & PENYELIDIKAN KOLABORATIF',
            bold: true,
            size: 22,
            color: '1E3A8A',
            font: 'Calibri'
          })
        ]
      })
    );

    data.langkahInvestigasi.forEach(langkah => {
      docChildren.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `Langkah ${langkah.langkahKe}: `,
              bold: true,
              size: 20,
              font: 'Calibri'
            }),
            new TextRun({
              text: langkah.instruksi,
              size: 20,
              font: 'Calibri'
            })
          ]
        })
      );
    });
  }

  // 8. E. TABEL LEMBAR PENGAMATAN / PENGUMPULAN DATA
  if (data.tabelPengamatan && Array.isArray(data.tabelPengamatan.kolom) && data.tabelPengamatan.kolom.length > 0) {
    const colCount = data.tabelPengamatan.kolom.length;
    const colWidthPct = Math.floor(100 / colCount);

    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 140, after: 60 },
        children: [
          new TextRun({
            text: 'E. LEMBAR PENGAMATAN & PENGUMPULAN DATA',
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
            text: data.tabelPengamatan.judulTabel || 'Tabel Hasil Pengamatan & Data Investigasi Kelompok:',
            bold: true,
            size: 20,
            font: 'Calibri'
          })
        ]
      })
    );

    const headerRow = new TableRow({
      children: data.tabelPengamatan.kolom.map(col =>
        createCell(col, true, colWidthPct, 'E2E8F0')
      )
    });

    const dataRows = (
      data.tabelPengamatan.barisContoh && data.tabelPengamatan.barisContoh.length > 0
        ? data.tabelPengamatan.barisContoh
        : [
            data.tabelPengamatan.kolom.map((_, i) => (i === 0 ? '1' : '........................................')),
            data.tabelPengamatan.kolom.map((_, i) => (i === 0 ? '2' : '........................................')),
            data.tabelPengamatan.kolom.map((_, i) => (i === 0 ? '3' : '........................................')),
            data.tabelPengamatan.kolom.map((_, i) => (i === 0 ? '4' : '........................................'))
          ]
    ).map(rowVals =>
      new TableRow({
        children: rowVals.map((val, i) =>
          createCell(val, i === 0, colWidthPct)
        )
      })
    );

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows]
      }),
      new Paragraph({ spacing: { after: 120 } })
    );
  }

  // 9. F. PERTANYAAN DISKUSI & ANALISIS KRITIS
  if (Array.isArray(data.pertanyaanDiskusi) && data.pertanyaanDiskusi.length > 0) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 140, after: 60 },
        children: [
          new TextRun({
            text: 'F. PERTANYAAN DISKUSI & ANALISIS NALAR KRITIS',
            bold: true,
            size: 22,
            color: '1E3A8A',
            font: 'Calibri'
          })
        ]
      })
    );

    data.pertanyaanDiskusi.forEach((q, idx) => {
      docChildren.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({
              text: `${idx + 1}. ${q}`,
              bold: true,
              size: 20,
              font: 'Calibri'
            })
          ]
        }),
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 20 },
          children: [
            new TextRun({
              text: 'Jawaban:',
              italics: true,
              size: 18,
              color: '64748B',
              font: 'Calibri'
            })
          ]
        }),
        new Paragraph({
          indent: { left: 360 },
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
          indent: { left: 360 },
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
    });
  }

  // 10. G. KESIMPULAN & REFLEKSI MANDIRI
  if (data.kesimpulanDanRefleksi) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 140, after: 60 },
        children: [
          new TextRun({
            text: 'G. KESIMPULAN & REFLEKSI BELAJAR SISWA',
            bold: true,
            size: 22,
            color: '1E3A8A',
            font: 'Calibri'
          })
        ]
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: 'Kesimpulan Bersama Kelompok:',
            bold: true,
            size: 20,
            font: 'Calibri'
          })
        ]
      }),
      new Paragraph({
        indent: { left: 360 },
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
        indent: { left: 360 },
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: '_________________________________________________________________________________',
            color: 'CBD5E1',
            size: 18
          })
        ]
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: 'Refleksi Diri (Mindful & Joyful Learning):',
            bold: true,
            size: 20,
            font: 'Calibri'
          })
        ]
      })
    );

    const refleksi = data.kesimpulanDanRefleksi.refleksiSiswa || [
      'Konsep apa yang paling bermakna dan kamu pahami hari ini?',
      'Bagian mana yang paling menantang dan bagaimana kelompokmu mengatasinya?'
    ];

    refleksi.forEach((rf, idx) => {
      docChildren.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 30 },
          children: [
            new TextRun({ text: `• ${rf}`, size: 20, font: 'Calibri', italics: true })
          ]
        }),
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: '.......................................................................................................................................',
              color: '94A3B8',
              size: 18
            })
          ]
        })
      );
    });
  }

  // 11. H. RUBRIK PENILAIAN LKPD
  if (Array.isArray(data.rubrikPenilaian) && data.rubrikPenilaian.length > 0) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 160, after: 80 },
        children: [
          new TextRun({
            text: 'H. RUBRIK PENILAIAN KINERJA LKPD',
            bold: true,
            size: 22,
            color: '1E3A8A',
            font: 'Calibri'
          })
        ]
      })
    );

    const rubrikHeader = new TableRow({
      children: [
        createCell('Aspek Penilaian', true, 28, 'E2E8F0'),
        createCell('Sangat Baik (4)', true, 18, 'E2E8F0'),
        createCell('Baik (3)', true, 18, 'E2E8F0'),
        createCell('Cukup (2)', true, 18, 'E2E8F0'),
        createCell('Perlu Bimbingan (1)', true, 18, 'E2E8F0')
      ]
    });

    const rubrikRows = data.rubrikPenilaian.map(rb =>
      new TableRow({
        children: [
          createCell(rb.aspek || '-', true, 28, 'F8FAFC'),
          createCell(rb.skor4 || '-', false, 18),
          createCell(rb.skor3 || '-', false, 18),
          createCell(rb.skor2 || '-', false, 18),
          createCell(rb.skor1 || '-', false, 18)
        ]
      })
    );

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [rubrikHeader, ...rubrikRows]
      }),
      new Paragraph({ spacing: { after: 140 } })
    );
  }

  // 12. KOLOM TANDA TANGAN
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  docChildren.push(
    new Paragraph({ spacing: { before: 180 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Mengetahui / Memeriksa,', size: 20, font: 'Calibri' })]
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'Guru Pengampu Mata Pelajaran,', bold: true, size: 20, font: 'Calibri' })]
                }),
                new Paragraph({ spacing: { before: 480 } }),
                new Paragraph({
                  children: [new TextRun({ text: ident.namaGuru || '( ............................................... )', bold: true, size: 20, font: 'Calibri' })]
                }),
                new Paragraph({
                  children: [new TextRun({ text: `NIP. ${ident.nipGuru || '-'}`, size: 18, font: 'Calibri' })]
                })
              ],
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              }
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: `Garut, ${ident.tanggal || today}`, size: 20, font: 'Calibri' })]
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: 'Ketua / Perwakilan Kelompok,', bold: true, size: 20, font: 'Calibri' })]
                }),
                new Paragraph({ spacing: { before: 480 } }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: '( ............................................... )', bold: true, size: 20, font: 'Calibri' })]
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: 'NISN: .......................................', size: 18, font: 'Calibri' })]
                })
              ],
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              }
            })
          ]
        })
      ]
    })
  );

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
  const cleanTitle = (ident.judulLkpd || 'LKPD').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanPertemuan = (ident.pertemuanKe || 'Pertemuan').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = customFileName || `[LKPD]_${cleanTitle}_${cleanPertemuan}.docx`;
  saveAs(blob, fileName);
}
