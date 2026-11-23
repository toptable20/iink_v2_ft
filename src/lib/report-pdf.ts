'use client';

// Export the on-screen result sheet (report-sheet.tsx) as one full-bleed A4 page. The sheet is a fixed 952 x 1347 px
// design scaled with its width, so the clone is set to 952px wide and 10px base font before it is drawn.

const PAGE_W = 210;
const PAGE_H = 297;
const SHEET_W = 952;

export async function downloadReportPdf(sheet: HTMLElement, fileName: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
  await document.fonts?.ready;
  const canvas = await html2canvas(sheet, {
    scale: 2,
    backgroundColor: '#fcfcfa',
    windowWidth: SHEET_W + 40,
    useCORS: true,
    logging: false,
    onclone: (doc) => {
      const stage = doc.querySelector<HTMLElement>('[data-report-pdf-stage]');
      if (stage) {
        stage.style.left = '0';
        stage.style.top = '0';
        stage.style.opacity = '1';
        stage.style.pointerEvents = 'auto';
        stage.style.zIndex = '1';
      }
      const root = doc.querySelector<HTMLElement>('[data-report-sheet]');
      const inner = root?.querySelector<HTMLElement>('.rs-in');
      if (root && inner) {
        root.style.width = `${SHEET_W}px`;
        root.style.minWidth = `${SHEET_W}px`;
        root.style.maxWidth = 'none';
        inner.style.width = `${SHEET_W}px`;
        inner.style.setProperty('--u', '10px');
      }
    },
  });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, PAGE_W, PAGE_H);
  pdf.save(fileName);
}
