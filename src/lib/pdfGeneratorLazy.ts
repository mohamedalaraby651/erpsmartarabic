/**
 * Lazy wrapper around the heavy pdfGenerator module (jsPDF + autoTable
 * + Arabic font assets, ~800KB).
 *
 * Importing this file does NOT pull jsPDF into the initial bundle.
 * The real module is loaded only on first call to generatePDF /
 * generateDocumentPDF — i.e. when the user actually clicks an export
 * button. Subsequent calls reuse the already-resolved module.
 */
type PdfGeneratorModule = typeof import('./pdfGenerator');

let _modulePromise: Promise<PdfGeneratorModule> | null = null;

function loadPdfGenerator(): Promise<PdfGeneratorModule> {
  if (!_modulePromise) {
    _modulePromise = import('./pdfGenerator');
  }
  return _modulePromise;
}

export async function generatePDF(
  ...args: Parameters<PdfGeneratorModule['generatePDF']>
): ReturnType<PdfGeneratorModule['generatePDF']> {
  const mod = await loadPdfGenerator();
  return mod.generatePDF(...args);
}

export async function generateDocumentPDF(
  ...args: Parameters<PdfGeneratorModule['generateDocumentPDF']>
): ReturnType<PdfGeneratorModule['generateDocumentPDF']> {
  const mod = await loadPdfGenerator();
  return mod.generateDocumentPDF(...args);
}

export async function getCompanySettings(
  ...args: Parameters<PdfGeneratorModule['getCompanySettings']>
): ReturnType<PdfGeneratorModule['getCompanySettings']> {
  const mod = await loadPdfGenerator();
  return mod.getCompanySettings(...args);
}
