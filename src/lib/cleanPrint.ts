import html2pdf from 'html2pdf.js';

export interface DownloadPdfOptions {
  elementId?: string;
  element?: HTMLElement | null;
  filename?: string;
  documentTitle?: string;
}

/**
 * Directly generates and downloads a clean, formal PDF document file
 * without scrollbars, headers, sidebars, or browser print dialog issues.
 */
export async function downloadElementAsPdf(options: DownloadPdfOptions): Promise<boolean> {
  const target = options.element || (options.elementId ? document.getElementById(options.elementId) : null);
  if (!target) {
    console.warn('Target element not found for PDF generation, falling back to window.print():', options);
    window.print();
    return false;
  }

  const rawFilename = options.filename || options.documentTitle || 'Modul_Ajar_SMAN21Garut.pdf';
  const cleanFilename = rawFilename.endsWith('.pdf') ? rawFilename : `${rawFilename}.pdf`;

  const opt = {
    margin: [10, 12, 10, 12] as [number, number, number, number],
    filename: cleanFilename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollY: 0,
      windowWidth: 1024
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  try {
    // Clone node so we can sanitize styling for pure A4 PDF rendering
    const clone = target.cloneNode(true) as HTMLElement;
    clone.style.margin = '0';
    clone.style.padding = '0';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    clone.style.maxWidth = '100%';
    clone.style.width = '100%';
    clone.style.background = '#ffffff';

    // Remove buttons or unwanted interactive widgets from the cloned DOM
    clone.querySelectorAll('button, .print\\:hidden, [data-print-hidden="true"]').forEach(el => el.remove());

    // Execute html2pdf rendering and direct download
    await html2pdf().set(opt).from(clone).save();
    return true;
  } catch (err) {
    console.error('html2pdf generation error, falling back to print dialog:', err);
    window.print();
    return false;
  }
}

/**
 * Native print handler with CSS print isolation.
 * Temporarily sets document.title so "Simpan sebagai PDF" dialog gets a clean name.
 */
export function printElementDirectly(title?: string): void {
  const originalTitle = document.title;
  if (title) {
    document.title = title;
  }
  try {
    window.print();
  } finally {
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  }
}

// Backward-compatible alias for existing callers
export const printElementCleanly = downloadElementAsPdf;
