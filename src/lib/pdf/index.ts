// Public surface of the v2 PDF engine. Additive — does not replace the
// legacy `src/lib/pdfGenerator.ts` yet; that migration happens in phase 3.
export * from './config/PageConfig';
export * from './config/ThemeConfig';
export * from './diagnostics/errors';
export * from './diagnostics/DataValidator';
export * from './diagnostics/PdfLogger';
export * from './diagnostics/resilience';
export * from './diagnostics/telemetrySink';
export * from './diagnostics/telemetryFlush';
export * from './diagnostics/telemetryScheduler';
export * from './utils/filename';
export * from './utils/formatters';
export * from './featureFlags';
export * from './fonts/fontRegistry';
export * from './arabic/bidi';
export * from './arabic/arabicCss';
export * from './templates/BaseTemplate';
export * from './templates/InvoiceHtmlTemplate';
export * from './templates/templateRegistry';
export { jsPdfEngine, JsPdfEngine, type JsPdfDocumentPayload } from './engine/JsPdfEngine';
export { htmlPdfEngine, HtmlPdfEngine, loadHtml2Pdf, type HtmlPdfPayload } from './engine/HtmlPdfEngine';
export { pickEngine, isHtmlEngineEnabledFor, type PickEngineOptions } from './engine/pickEngine';
export type { IPdfEngine, PdfRenderContext, PdfRenderResult } from './engine/IPdfEngine';
