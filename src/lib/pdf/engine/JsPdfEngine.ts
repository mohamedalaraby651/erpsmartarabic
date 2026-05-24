import type { IPdfEngine, PdfRenderContext, PdfRenderResult } from './IPdfEngine';
import { withPdfTelemetry } from '../diagnostics/PdfLogger';
import { PdfEngineError, toArabicErrorMessage } from '../diagnostics/errors';
import { validateDocumentForPdf } from '../diagnostics/DataValidator';

/**
 * Thin adapter that exposes the legacy `pdfGenerator.ts` behind the
 * engine-agnostic `IPdfEngine` contract.
 *
 * It does NOT re-render anything itself — it lazy-loads the existing
 * generator (keeping jsPDF + Amiri out of the initial bundle) and wraps
 * the call with telemetry + Arabic error mapping. This lets the rest of
 * the v2 stack (templateRegistry, future HtmlPdfEngine) stay decoupled
 * from the concrete implementation while we migrate templates over.
 */
export interface JsPdfDocumentPayload {
  /** One of the legacy DocumentType strings (invoice, quotation, ...). */
  documentType: string;
  /** Document data shaped for the legacy generator. */
  data: Record<string, unknown> & { items?: unknown[] };
}

export class JsPdfEngine implements IPdfEngine {
  readonly id = 'jspdf' as const;

  isAvailable(): boolean {
    return typeof window !== 'undefined';
  }

  async render(
    _ctx: PdfRenderContext,
    payload: unknown,
    filename: string,
  ): Promise<PdfRenderResult> {
    const start = performance.now();
    const p = payload as JsPdfDocumentPayload;
    if (!p || typeof p !== 'object' || !p.documentType) {
      throw new PdfEngineError('invalid payload: documentType missing');
    }
    // Pre-flight validation — fast failure before loading the heavy chunk.
    validateDocumentForPdf(p.data);

    return withPdfTelemetry(p.documentType, 'jspdf', async () => {
      try {
        const { generateDocumentPDF } = await import('../../pdfGenerator');
        await generateDocumentPDF(p.documentType as never, p.data as never);
        return {
          // Legacy generator triggers a direct download and does not
          // return a Blob; expose an empty placeholder so callers that
          // only care about telemetry/filename keep working.
          blob: new Blob([], { type: 'application/pdf' }),
          filename,
          pages: 0,
          engine: 'jspdf' as const,
          durationMs: performance.now() - start,
        };
      } catch (e) {
        throw new PdfEngineError(toArabicErrorMessage(e), e);
      }
    });
  }
}

export const jsPdfEngine = new JsPdfEngine();
