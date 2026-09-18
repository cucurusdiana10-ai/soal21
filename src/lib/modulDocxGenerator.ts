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
  BorderStyle,
  ImageRun
} from 'docx';
import { parseKepsek, getDetailedPendahuluan, getDetailedPenutup, getStoredTtdKepsek } from './schoolSettings';

async function urlOrBase64ToUint8Array(input: string): Promise<Uint8Array | null> {
  try {
    if (!input || typeof input !== 'string') return null;
    if (input.startsWith('data:image/')) {
      const parts = input.split(',');
      if (parts.length < 2) return null;
      const binary = atob(parts[1]);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } else if (input.startsWith('http://') || input.startsWith('https://')) {
      const res = await fetch(input);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    }
    return null;
  } catch (e) {
    console.warn('Gagal memproses gambar TTD untuk Word (.docx):', e);
    return null;
  }
}

export async function exportModulAjarToDocx(data: any, fileName?: string) {
  const identitas = data.identitas || {};
  const schoolName = identitas.namaSekolah || 'SMAN 21 Garut';
  const npsn = identitas.npsn || '20209194';
  const schoolAddress = identitas.alamatSekolah || 'Jl. Raya Talegong No. 21, Kec. Talegong, Kab. Garut, Jawa Barat 44167';
  const teacherName = identitas.namaGuru || 'Guru Pengampu';
  const teacherNip = identitas.nipGuru || '-';
  const parsedKepsek = parseKepsek(identitas.namaKepsek);
  const headmasterName = parsedKepsek.nama || 'Agus Supriatna, S.Pd., M.Si.';
  const headmasterNip = identitas.nipKepsek || parsedKepsek.nip || '';
  const subjectName = identitas.mataPelajaran || data.subject_name || 'Mata Pelajaran';
  const grade = identitas.fase || data.grade || 'Fase E (Kelas X)';
  const totalMeetings = identitas.jumlahPertemuan || (data.pertemuan ? data.pertemuan.length : 2);
  const timeAlloc = identitas.alokasiWaktu || '2 x 45 Menit per Pertemuan';
  const academicYear = identitas.tahunPelajaran || '2026/2027';
  const semester = identitas.semester || 'Ganjil';
  const methodName = data.modelMetode?.nama || data.metode || 'Problem-Based Learning (PBL)';

  const tableBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
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

  const children: any[] = [];

  // 1. KOP SURAT / HEADER
  children.push(
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
          size: 28,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Alamat: ${schoolAddress} | NPSN: ${npsn}`,
          size: 18,
          italics: true,
          font: 'Calibri'
        })
      ],
      spacing: { after: 180 }
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: '========================================================================',
          size: 16,
          color: '666666'
        })
      ],
      spacing: { after: 240 }
    })
  );

  // 2. JUDUL DOKUMEN
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'MODUL AJAR PEMBELAJARAN MENDALAM (DEEP LEARNING)',
          bold: true,
          size: 26,
          color: '1E40AF',
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `MATA PELAJARAN: ${subjectName.toUpperCase()}`,
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
          text: `TAHUN PELAJARAN ${academicYear} - SEMESTER ${semester.toUpperCase()}`,
          size: 20,
          font: 'Calibri'
        })
      ],
      spacing: { after: 300 }
    })
  );

  // 3. I. IDENTITAS MODUL
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: 'I. INFORMASI UMUM & IDENTITAS MODUL',
          bold: true,
          size: 22,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ],
      spacing: { before: 200, after: 120 }
    })
  );

  const identityRows = [
    ['Nama Satuan Pendidikan', schoolName],
    ['Nomor Pokok Sekolah Nasional (NPSN)', npsn],
    ['Alamat Sekolah', schoolAddress],
    ['Nama Penyusun (Guru)', teacherName],
    ['NIP / NUPTK / ID Guru', teacherNip],
    ['Mata Pelajaran', subjectName],
    ['Jenjang / Fase / Kelas', grade],
    ['Alokasi Waktu', timeAlloc],
    ['Jumlah Pertemuan', `${totalMeetings} Pertemuan`],
    ['Model & Metode Pembelajaran', data.identitas?.metodeGabungan || methodName],
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: identityRows.map(([label, val]) =>
        new TableRow({
          children: [
            createCell(label, true, 38, 'F1F5F9'),
            createCell(val, false, 62)
          ]
        })
      )
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // 4. II. KOMPONEN INTI & PRINSIP PEMBELAJARAN MENDALAM
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: 'II. KOMPONEN INTI & PEMBELAJARAN MENDALAM (DEEP LEARNING)',
          bold: true,
          size: 22,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ],
      spacing: { before: 240, after: 120 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'A. Capaian Pembelajaran (CP):', bold: true, size: 20, font: 'Calibri' })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: data.capaianPembelajaran || data.cp || '-', size: 20, font: 'Calibri' })
      ],
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'B. Elemen / Domain CP:', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: ` ${data.elemenCp || 'Pemahaman Konsep dan Keterampilan Proses'}`, size: 20, font: 'Calibri' })
      ],
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'C. Tujuan Pembelajaran (TP):', bold: true, size: 20, font: 'Calibri' })
      ]
    })
  );

  if (data.tujuanPembelajaran && Array.isArray(data.tujuanPembelajaran)) {
    data.tujuanPembelajaran.forEach((tp: string, idx: number) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${idx + 1}. ${tp}`, size: 20, font: 'Calibri' })
          ],
          indent: { left: 360 }
        })
      );
    });
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'D. Prinsip Pembelajaran Mendalam (Deep Learning Framework):', bold: true, size: 20, font: 'Calibri' })
      ],
      spacing: { before: 140 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Mindful (Berkesadaran): ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: data.prinsipPembelajaranMendalam?.mindful || 'Peserta didik sadar tujuan belajar, fokus, dan aktif merefleksikan proses berpikirnya.', size: 20, font: 'Calibri' })
      ],
      indent: { left: 360 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Meaningful (Bermakna): ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: data.prinsipPembelajaranMendalam?.meaningful || 'Menghubungkan konsep secara mendalam dengan konteks nyata di lingkungan siswa dan studi kasus otentik.', size: 20, font: 'Calibri' })
      ],
      indent: { left: 360 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '• Joyful (Menyenangkan): ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: data.prinsipPembelajaranMendalam?.joyful || 'Suasana belajar menggugah antusiasme, eksploratif, tanpa tekanan intimidatif, dan merayakan proses bertumbuh.', size: 20, font: 'Calibri' })
      ],
      indent: { left: 360 },
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'E. Pemahaman Bermakna (Enduring Understanding):', bold: true, size: 20, font: 'Calibri' })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: data.pemahamanBermakna || '-', size: 20, font: 'Calibri', italics: true })
      ],
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'F. Pertanyaan Pemantik (Driving Questions):', bold: true, size: 20, font: 'Calibri' })
      ]
    })
  );

  if (data.pertanyaanPemantik && Array.isArray(data.pertanyaanPemantik)) {
    data.pertanyaanPemantik.forEach((q: string, idx: number) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${idx + 1}. ${q}`, size: 20, font: 'Calibri' })
          ],
          indent: { left: 360 }
        })
      );
    });
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'G. Dimensi Profil Lulusan (8 Dimensi Lulusan):', bold: true, size: 20, font: 'Calibri' })
      ],
      spacing: { before: 140 }
    })
  );

  const dimensiList: string[] = (data.dimensiProfilLulusan && Array.isArray(data.dimensiProfilLulusan) && data.dimensiProfilLulusan.length > 0)
    ? data.dimensiProfilLulusan
    : (data.dimensiProfilPelajarPancasila && Array.isArray(data.dimensiProfilPelajarPancasila) && data.dimensiProfilPelajarPancasila.length > 0)
    ? data.dimensiProfilPelajarPancasila
    : [
        'Keimanan dan Ketakwaan terhadap Tuhan YME: Mengamalkan nilai spiritual dan integritas dalam proses belajar',
        'Kewargaan: Memiliki kepedulian sosial, kebangsaan, dan kelestarian lingkungan',
        'Penalaran Kritis: Memproses informasi secara logis, analitis, dan memecahkan persoalan nyata',
        'Kreativitas: Menghasilkan gagasan inovatif dan solusi orisinal',
        'Kolaborasi: Bekerja sama secara sinergis, gotong royong, dan berbagi peran',
        'Kemandirian: Bertanggung jawab atas proses dan hasil belajar secara mandiri',
        'Kesehatan: Menjaga kebugaran jasmani dan kesejahteraan mental (well-being)',
        'Komunikasi: Mengartikulasikan pemikiran secara santun, terstruktur, dan dialogis'
      ];

  dimensiList.forEach((dim: string, dIdx: number) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${dIdx + 1}. ${dim}`, size: 20, font: 'Calibri' })
        ],
        indent: { left: 360 }
      })
    );
  });

  // 5. III. KEGIATAN PEMBELAJARAN SESUAI SINTAKS PER PERTEMUAN
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: 'III. RINCIAN KEGIATAN PEMBELAJARAN',
          bold: true,
          size: 22,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ],
      spacing: { before: 240, after: 120 }
    })
  );

  if (data.pertemuan && Array.isArray(data.pertemuan)) {
    data.pertemuan.forEach((ptm: any) => {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: `PERTEMUAN KE-${ptm.nomor}: ${ptm.topik || `Materi Pertemuan ${ptm.nomor}`}`,
              bold: true,
              size: 21,
              color: '0369A1',
              font: 'Calibri'
            })
          ],
          spacing: { before: 160, after: 60 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Alokasi Waktu: ${ptm.alokasiWaktu || timeAlloc} | Target: ${ptm.tujuanPertemuan || 'Pencapaian Indikator Pembelajaran'}`, size: 19, italics: true, font: 'Calibri' })
          ],
          spacing: { after: 100 }
        })
      );

      // Kegiatan Pendahuluan
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `1. Kegiatan Pendahuluan (${ptm.kegiatanPendahuluan?.durasi || '15 Menit'})`, bold: true, size: 20, font: 'Calibri' })
          ]
        })
      );
      const pendahuluanSteps = getDetailedPendahuluan(ptm.kegiatanPendahuluan?.langkah);
      pendahuluanSteps.forEach((step: string) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${step}`, size: 20, font: 'Calibri' })],
            indent: { left: 360 }
          })
        );
      });

      // Kegiatan Inti (Sintaks Table)
      const currentMeetingMethod = ptm.metode || methodName;
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `2. Kegiatan Inti (${ptm.kegiatanInti?.durasi || '60 Menit'}) - Sintaks ${currentMeetingMethod}`, bold: true, size: 20, font: 'Calibri' })
          ],
          spacing: { before: 100, after: 80 }
        })
      );

      const tableHeaders = new TableRow({
        children: [
          createCell('Tahap Sintaks', true, 25, 'E2E8F0'),
          createCell('Aktivitas Fasilitasi Guru', true, 35, 'E2E8F0'),
          createCell('Aktivitas Aktif Peserta Didik & Pembelajaran Mendalam', true, 40, 'E2E8F0')
        ]
      });

      const syntaxRows = (ptm.kegiatanInti?.sintaks || []).map((stx: any) =>
        new TableRow({
          children: [
            createCell(stx.tahap || 'Tahap Sintaks', true, 25, 'F8FAFC'),
            createCell(stx.aktivitasGuru || '-', false, 35),
            createCell(`${stx.aktivitasSiswa || '-'}\n[Fokus: ${stx.fokusMendalam || 'Deep Learning'}]`, false, 40)
          ]
        })
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [tableHeaders, ...syntaxRows]
        }),
        new Paragraph({ spacing: { after: 100 } })
      );

      // Kegiatan Penutup
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `3. Kegiatan Penutup (${ptm.kegiatanPenutup?.durasi || '15 Menit'})`, bold: true, size: 20, font: 'Calibri' })
          ]
        })
      );
      const penutupSteps = getDetailedPenutup(ptm.kegiatanPenutup?.langkah);
      penutupSteps.forEach((step: string) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${step}`, size: 20, font: 'Calibri' })],
            indent: { left: 360 }
          })
        );
      });

      children.push(new Paragraph({ spacing: { after: 180 } }));
    });
  }

  // 6. IV. ASESMEN & RUBRIK PENILAIAN
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: 'IV. RANCANGAN ASESMEN & RUBRIK PENILAIAN MENDALAM',
          bold: true,
          size: 22,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ],
      spacing: { before: 240, after: 120 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '1. Asesmen Diagnostik (Awal): ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: `${data.asesmen?.diagnostik?.teknik || '-'} (${data.asesmen?.diagnostik?.instrumen || '-'})`, size: 20, font: 'Calibri' })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '2. Asesmen Formatif (Proses): ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: `${data.asesmen?.formatif?.teknik || '-'} (${data.asesmen?.formatif?.instrumen || '-'})`, size: 20, font: 'Calibri' })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '3. Asesmen Sumatif (Akhir): ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: `${data.asesmen?.sumatif?.teknik || '-'} (${data.asesmen?.sumatif?.instrumen || '-'})`, size: 20, font: 'Calibri' })
      ],
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Tabel Rubrik Penilaian Ketercapaian Pembelajaran Mendalam:', bold: true, size: 20, font: 'Calibri' })
      ],
      spacing: { after: 80 }
    })
  );

  if (data.asesmen?.rubrik && Array.isArray(data.asesmen.rubrik)) {
    const rubrikHeader = new TableRow({
      children: [
        createCell('Aspek Penilaian', true, 24, 'E2E8F0'),
        createCell('Sangat Mahir (86-100)', true, 19, 'E2E8F0'),
        createCell('Mahir (71-85)', true, 19, 'E2E8F0'),
        createCell('Berkembang (56-70)', true, 19, 'E2E8F0'),
        createCell('Perlu Bimbingan (<56)', true, 19, 'E2E8F0')
      ]
    });

    const rubrikRows = data.asesmen.rubrik.map((rb: any) =>
      new TableRow({
        children: [
          createCell(rb.aspek || '-', true, 24, 'F8FAFC'),
          createCell(rb.sangatMahir || '-', false, 19),
          createCell(rb.mahir || '-', false, 19),
          createCell(rb.berkembang || '-', false, 19),
          createCell(rb.perluBimbingan || '-', false, 19)
        ]
      })
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [rubrikHeader, ...rubrikRows]
      }),
      new Paragraph({ spacing: { after: 180 } })
    );
  }

  // 7. V. PENGAYAAN DAN REMEDIAL
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: 'V. PENGAYAAN DAN REMEDIAL',
          bold: true,
          size: 22,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ],
      spacing: { before: 200, after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'A. Kegiatan Pengayaan: ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: data.pengayaanRemedial?.pengayaan || 'Diberikan penugasan tantangan dan eksplorasi materi lanjutan bagi peserta didik yang telah tuntas.', size: 20, font: 'Calibri' })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'B. Kegiatan Remedial: ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: data.pengayaanRemedial?.remedial || 'Bimbingan tutor sebaya atau pendampingan terfokus pada indikator yang belum dipahami.', size: 20, font: 'Calibri' })
      ],
      spacing: { after: 180 }
    })
  );

  // 8. VI. REFLEKSI GURU & SISWA
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: 'VI. REFLEKSI GURU DAN PESERTA DIDIK',
          bold: true,
          size: 22,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ],
      spacing: { before: 200, after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'A. Pertanyaan Refleksi Peserta Didik:', bold: true, size: 20, font: 'Calibri' })
      ]
    })
  );
  if (data.refleksi?.refleksiSiswa && Array.isArray(data.refleksi.refleksiSiswa)) {
    data.refleksi.refleksiSiswa.forEach((q: string, idx: number) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${idx + 1}. ${q}`, size: 20, font: 'Calibri' })],
          indent: { left: 360 }
        })
      );
    });
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'B. Pertanyaan Refleksi Guru:', bold: true, size: 20, font: 'Calibri' })
      ],
      spacing: { before: 100 }
    })
  );
  if (data.refleksi?.refleksiGuru && Array.isArray(data.refleksi.refleksiGuru)) {
    data.refleksi.refleksiGuru.forEach((q: string, idx: number) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${idx + 1}. ${q}`, size: 20, font: 'Calibri' })],
          indent: { left: 360 }
        })
      );
    });
  }

  // 9. VII. LAMPIRAN (LKPD, Glosarium, Daftar Pustaka)
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: 'VII. LAMPIRAN DOKUMEN PEMBELAJARAN',
          bold: true,
          size: 22,
          color: '1E3A8A',
          font: 'Calibri'
        })
      ],
      spacing: { before: 240, after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `A. ${data.lampiran?.lkpd?.judul || 'Lembar Kerja Peserta Didik (LKPD)'}`, bold: true, size: 20, font: 'Calibri' })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Petunjuk: ${data.lampiran?.lkpd?.petunjuk || '-'}`, size: 20, italics: true, font: 'Calibri' })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Tantangan/Kasus: ${data.lampiran?.lkpd?.studiKasusSoal || '-'}`, size: 20, font: 'Calibri' })
      ],
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'B. Glosarium Istilah:', bold: true, size: 20, font: 'Calibri' })
      ]
    })
  );

  if (data.lampiran?.glosarium && Array.isArray(data.lampiran.glosarium)) {
    data.lampiran.glosarium.forEach((g: any) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `• ${g.istilah}: `, bold: true, size: 20, font: 'Calibri' }),
            new TextRun({ text: g.definisi, size: 20, font: 'Calibri' })
          ],
          indent: { left: 360 }
        })
      );
    });
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'C. Daftar Pustaka:', bold: true, size: 20, font: 'Calibri' })
      ],
      spacing: { before: 120 }
    })
  );

  if (data.lampiran?.daftarPustaka && Array.isArray(data.lampiran.daftarPustaka)) {
    data.lampiran.daftarPustaka.forEach((dp: string) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `• ${dp}`, size: 20, font: 'Calibri' })],
          indent: { left: 360 }
        })
      );
    });
  }

  // 10. LEMBAR PENGESAHAN
  let titimangsaText = data.titimangsa || '';
  if (!titimangsaText) {
    const rawDate = data.tanggalCetak || (identitas && identitas.tanggalCetak);
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          titimangsaText = `Garut, ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        } else {
          titimangsaText = rawDate.startsWith('Garut') ? rawDate : `Garut, ${rawDate}`;
        }
      } catch {
        titimangsaText = `Garut, ${rawDate}`;
      }
    } else {
      const todayFormatted = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      titimangsaText = `Garut, ${todayFormatted}`;
    }
  }

  const ttdKepsekSource = identitas.ttdKepsek || getStoredTtdKepsek();
  const ttdBytes = ttdKepsekSource ? await urlOrBase64ToUint8Array(ttdKepsekSource) : null;

  children.push(
    new Paragraph({ spacing: { before: 400, after: 100 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'Mengetahui,', size: 20, font: 'Calibri' })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `Kepala Sekolah ${schoolName}`, bold: true, size: 20, font: 'Calibri' })]
                }),
                ttdBytes ? (
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        type: 'png',
                        data: ttdBytes,
                        transformation: { width: 130, height: 55 }
                      })
                    ],
                    spacing: { before: 80, after: 80 }
                  })
                ) : (
                  new Paragraph({ spacing: { after: 700 } })
                ),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: headmasterName, bold: true, underline: {}, size: 20, font: 'Calibri' })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: headmasterNip ? `NIP. ${headmasterNip}` : 'NIP. ........................................', size: 19, font: 'Calibri' })]
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
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: titimangsaText, size: 20, font: 'Calibri' })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'Guru Mata Pelajaran,', bold: true, size: 20, font: 'Calibri' })]
                }),
                new Paragraph({ spacing: { after: 700 } }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: teacherName, bold: true, underline: {}, size: 20, font: 'Calibri' })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `NIP/ID. ${teacherNip}`, size: 19, font: 'Calibri' })]
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
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const finalFileName = fileName || `Modul_Ajar_${subjectName.replace(/[^a-zA-Z0-9]/g, '_')}_SMAN21Garut.docx`;

  // Download directly in browser
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
