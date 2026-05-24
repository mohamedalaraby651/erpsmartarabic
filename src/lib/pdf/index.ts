// Public surface of the v2 PDF engine. Additive — does not replace the
// legacy `src/lib/pdfGenerator.ts` yet; that migration happens in phase 3.
export * from './config/PageConfig';
export * from './config/ThemeConfig';
export * from './diagnostics/errors';
export * from './diagnostics/DataValidator';
export * from './diagnostics/PdfLogger';
export type { IPdfEngine, PdfRenderContext, PdfRenderResult } from './engine/IPdfEngine';
