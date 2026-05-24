import type { PageConfig } from '../config/PageConfig';
import type { PdfTheme } from '../config/ThemeConfig';

/**
 * Engine-agnostic contract. JsPdfEngine and HtmlPdfEngine both
 * implement this so the rest of the system stays decoupled.
 */
export interface PdfRenderContext {
  page: PageConfig;
  theme: PdfTheme;
}

export interface PdfRenderResult {
  blob: Blob;
  filename: string;
  pages: number;
  engine: 'jspdf' | 'html2pdf' | 'edge';
  durationMs: number;
}

export interface IPdfEngine {
  readonly id: 'jspdf' | 'html2pdf' | 'edge';
  /** Returns true if this engine can run in the current environment. */
  isAvailable(): boolean | Promise<boolean>;
  render(ctx: PdfRenderContext, payload: unknown, filename: string): Promise<PdfRenderResult>;
}
