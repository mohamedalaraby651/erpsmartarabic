/**
 * Phase 2 router: dispatches PDF generation to v2 (HTML engine) when the
 * canary opts the tenant in, and falls back to the legacy v1 engine
 * (`pdfGeneratorLazy.generateDocumentPDF`) on any failure. Every attempt —
 * success or failure, v1 or v2 — is recorded in the telemetry sink so the
 * health panel can compare error rates and latency between engines.
 *
 * This is the single integration point UI surfaces should call instead of
 * importing `pdfGeneratorLazy` directly.
 */
import { decideCanary } from './canaryRollout';
import { startTimer, logPdfSuccess, logPdfFailure } from '../diagnostics/PdfLogger';
import { printInvoiceHtmlPdf } from '../printInvoiceHtmlPdf';
import type { SupportedDocType } from '../templates/templateRegistry';

export interface RoutePdfRequestOptions {
  docType: SupportedDocType;
  data: Record<string, unknown> & { items?: unknown[] };
  tenantId?: string | null;
  /** Force a specific engine — used by tests and admin overrides. */
  forceEngine?: 'v1' | 'v2';
}

export interface RoutePdfRequestResult {
  engine: 'v1' | 'v2';
  fellBack: boolean;
  durationMs: number;
}

/** Indirection so tests can stub the legacy import without touching disk. */
async function callLegacy(
  docType: SupportedDocType,
  data: Record<string, unknown> & { items?: unknown[] },
): Promise<void> {
  const mod = await import('@/lib/pdfGeneratorLazy');
  await mod.generateDocumentPDF(docType as never, data as never);
}

async function tryV2(
  docType: SupportedDocType,
  data: Record<string, unknown> & { items?: unknown[] },
): Promise<void> {
  // v2 currently ships an invoice-grade HTML pipeline. Other doc types
  // remain v1-only until their templates land in Phase 3.
  if (docType !== 'invoice') {
    throw new Error(`v2 template not yet available for "${docType}"`);
  }
  await printInvoiceHtmlPdf(data as never);
}

export async function routePdfRequest(
  opts: RoutePdfRequestOptions,
): Promise<RoutePdfRequestResult> {
  const { docType, data, tenantId, forceEngine } = opts;
  const decision = forceEngine
    ? { useV2: forceEngine === 'v2' }
    : decideCanary({ tenantId, docType });

  const stop = startTimer(docType);

  if (decision.useV2) {
    try {
      await tryV2(docType, data);
      const durationMs = stop();
      logPdfSuccess({ docType, engine: 'html2pdf', durationMs, ...{ engine: 'v2' as never } });
      return { engine: 'v2', fellBack: false, durationMs };
    } catch (error) {
      const v2Duration = stop();
      logPdfFailure({ docType, engine: 'html2pdf', durationMs: v2Duration, error, ...{ engine: 'v2' as never } });
      // Safe fallback to legacy.
      const stopV1 = startTimer(docType);
      try {
        await callLegacy(docType, data);
        const durationMs = stopV1();
        logPdfSuccess({ docType, engine: 'jspdf', durationMs, ...{ engine: 'v1' as never } });
        return { engine: 'v1', fellBack: true, durationMs };
      } catch (fallbackError) {
        const durationMs = stopV1();
        logPdfFailure({ docType, engine: 'jspdf', durationMs, error: fallbackError, ...{ engine: 'v1' as never } });
        throw fallbackError;
      }
    }
  }

  // v1 path.
  try {
    await callLegacy(docType, data);
    const durationMs = stop();
    logPdfSuccess({ docType, engine: 'jspdf', durationMs, ...{ engine: 'v1' as never } });
    return { engine: 'v1', fellBack: false, durationMs };
  } catch (error) {
    const durationMs = stop();
    logPdfFailure({ docType, engine: 'jspdf', durationMs, error, ...{ engine: 'v1' as never } });
    throw error;
  }
}
