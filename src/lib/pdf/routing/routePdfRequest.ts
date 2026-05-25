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
import { printQuotationHtmlPdf } from '../printQuotationHtmlPdf';
import { printPurchaseOrderHtmlPdf } from '../printPurchaseOrderHtmlPdf';
import { printStatementHtmlPdf } from '../printStatementHtmlPdf';
import type { SupportedDocType } from '../templates/templateRegistry';
import type { PdfConfigInput } from '../config/pdfConfigSchema';
import { resolvePdfConfig } from '../services/PdfRenderService';

/** Extended doc-type set for routing — includes statements (v2-only). */
export type RoutableDocType = SupportedDocType | 'statement';

export interface RoutePdfRequestOptions {
  docType: RoutableDocType;
  data: Record<string, unknown> & { items?: unknown[] };
  tenantId?: string | null;
  /** Force a specific engine — used by tests and admin overrides. */
  forceEngine?: 'v1' | 'v2';
  /** Override resolved profile config (tests / admin previews). */
  configOverride?: PdfConfigInput;
}

export interface RoutePdfRequestResult {
  engine: 'v1' | 'v2';
  fellBack: boolean;
  durationMs: number;
  /** true لو طُبِّق profile (إعدادات تصيير مخصصة) من قاعدة البيانات. */
  appliedProfile: boolean;
}

/** Indirection so tests can stub the legacy import without touching disk. */
async function callLegacy(
  docType: RoutableDocType,
  data: Record<string, unknown> & { items?: unknown[] },
): Promise<void> {
  if (docType === 'statement') {
    const mod = await import('@/lib/statementPdfGenerator');
    await mod.generateStatementPdf(data as never);
    return;
  }
  const mod = await import('@/lib/pdfGeneratorLazy');
  await mod.generateDocumentPDF(docType as never, data as never);
}

/** Doc types that have a v2 (HTML) implementation available. */
const V2_SUPPORTED: ReadonlySet<RoutableDocType> = new Set<RoutableDocType>([
  'invoice',
  'quotation',
  'purchase_order',
  'statement',
]);

async function tryV2(
  docType: RoutableDocType,
  data: Record<string, unknown> & { items?: unknown[] },
  config?: PdfConfigInput,
): Promise<void> {
  if (!V2_SUPPORTED.has(docType)) {
    throw new Error(`v2 template not yet available for "${docType}"`);
  }
  const opts = config ? { config } : undefined;
  if (docType === 'invoice') {
    const res = await printInvoiceHtmlPdf(data as never, opts);
    if (res.ok === false) throw new Error(res.message);
    return;
  }
  if (docType === 'quotation') {
    const res = await printQuotationHtmlPdf(data as never, opts);
    if (res.ok === false) throw new Error(res.message);
    return;
  }
  if (docType === 'purchase_order') {
    const res = await printPurchaseOrderHtmlPdf(data as never, opts);
    if (res.ok === false) throw new Error(res.message);
    return;
  }
  if (docType === 'statement') {
    const res = await printStatementHtmlPdf(data as never, opts);
    if (res.ok === false) throw new Error(res.message);
    return;
  }
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
