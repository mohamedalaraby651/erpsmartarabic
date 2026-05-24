// Public surface of the v2 PDF engine. Additive — does not replace the
// legacy `src/lib/pdfGenerator.ts` yet; that migration happens in phase 3.
export * from './config/PageConfig';
export * from './config/ThemeConfig';
export * from './diagnostics/errors';
export * from './diagnostics/DataValidator';
export * from './diagnostics/PdfLogger';
export * from './diagnostics/resilience';
export * from './diagnostics/telemetrySink';
export * from './utils/filename';
export * from './utils/formatters';
export * from './featureFlags';
export * from './fonts/fontRegistry';
export * from './arabic/bidi';
export * from './templates/BaseTemplate';
export * from './templates/templateRegistry';
export { jsPdfEngine, JsPdfEngine, type JsPdfDocumentPayload } from './engine/JsPdfEngine';
export type { IPdfEngine, PdfRenderContext, PdfRenderResult } from './engine/IPdfEngine';
