'use client';

// "PDF 다운로드": saves the whole report as an A4 PDF file.
// Each report block (the report's header and every direct child of its <main>) is drawn to an image with html2canvas-pro
// (it supports Tailwind v4's oklch colours; the classic html2canvas crashes on them) and placed on A4 pages with jsPDF.
// Blocks are drawn at desktop width (windowWidth) so a phone also gets the full, unscrolled tables. Anything marked
// data-pdf-hide (buttons, the 데이터 추가 box) is left out; folded <details> are opened so the PDF shows everything.
// Both libraries load only when the button is pressed.

const PAGE_W = 210; // mm (A4)
const PAGE_H = 297;
const MARGIN = 10;
const GAP = 4; // mm between blocks
const CAPTURE_WIDTH = 1100; // px, desktop layout
const BG = '#f8f7f2';

export async function downloadReportPdf(root: HTMLElement, fileName: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
  const blocks = Array.from(root.querySelectorAll<HTMLElement>(':scope > header, :scope > main > *')).filter((el) => el.dataset.pdfHide === undefined);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const contentW = PAGE_W - MARGIN * 2;
  const paint = () => {
    pdf.setFillColor(BG);
    pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');
  };
  paint();
  let y = MARGIN;

  for (const block of blocks) {
    const canvas = await html2canvas(block, {
      scale: 2,
      backgroundColor: BG,
      windowWidth: CAPTURE_WIDTH,
      useCORS: true,
      logging: false,
      ignoreElements: (el) => el instanceof HTMLElement && el.dataset.pdfHide !== undefined,
      onclone: (doc) => {
        doc.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''));
      },
    });
    const mmPerPx = contentW / canvas.width;
    const fullH = canvas.height * mmPerPx;

    if (fullH <= PAGE_H - MARGIN * 2) {
      // fits on one page: start a new page when it does not fit on this one
      if (y + fullH > PAGE_H - MARGIN) {
        pdf.addPage();
        paint();
        y = MARGIN;
      }
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN, y, contentW, fullH);
      y += fullH + GAP;
      continue;
    }

    // taller than a page (a long table): cut it into page-high slices
    if (y > MARGIN) {
      pdf.addPage();
      paint();
      y = MARGIN;
    }
    const slicePx = Math.floor((PAGE_H - MARGIN * 2) / mmPerPx);
    for (let top = 0; top < canvas.height; top += slicePx) {
      const h = Math.min(slicePx, canvas.height - top);
      const part = document.createElement('canvas');
      part.width = canvas.width;
      part.height = h;
      part.getContext('2d')!.drawImage(canvas, 0, top, canvas.width, h, 0, 0, canvas.width, h);
      if (top > 0) {
        pdf.addPage();
        paint();
        y = MARGIN;
      }
      pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN, y, contentW, h * mmPerPx);
      y += h * mmPerPx + GAP;
    }
  }

  pdf.save(fileName);
}
