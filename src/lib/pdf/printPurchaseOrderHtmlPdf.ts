/**
 * Unified one-call PDF entry point for purchase orders (Wave 24).
 */
import { buildPdfConfig, toPageConfig, type PdfConfigInput, type PdfConfig } from './config/pdfConfigSchema';
import { preflightPurchaseOrder } from './diagnostics/preflightPurchaseOrder';
import { safeRender } from './diagnostics/PdfErrorBoundary';
import { detectTashkeel } from './arabic/typographyRules';
import {
  renderPurchaseOrderHtml,
  PURCHASE_ORDER_HTML_CSS,
  type PurchaseOrderHtmlData,
} from './templates/PurchaseOrderHtmlTemplate';
import { composeRenderPayload } from './templates/TemplateComposer';
import { htmlPdfEngine } from './engine/HtmlPdfEngine';
import { buildDocFilename } from './utils/filename';

export type PrintPoOutput = 'save' | 'blob';

export interface PrintPurchaseOrderPdfOptions {
  config?: PdfConfigInput;
  output?: PrintPoOutput;
  filename?: string;
  timeoutMs?: number;
  strict?: boolean;
}

export interface PrintPurchaseOrderPdfSuccess {
  ok: true;
  blob: Blob;
  filename: string;
  config: PdfConfig;
  durationMs: number;
  warnings: { field: string; message: string }[];
}

export interface PrintPurchaseOrderPdfFailure {
  ok: false;
  errorCode: string;
  message: string;
  details?: unknown;
  durationMs?: number;
}

export type PrintPurchaseOrderPdfResult =
  | PrintPurchaseOrderPdfSuccess
  | PrintPurchaseOrderPdfFailure;

export async function printPurchaseOrderHtmlPdf(
  raw: PurchaseOrderHtmlData,
  opts: PrintPurchaseOrderPdfOptions = {},
): Promise<PrintPurchaseOrderPdfResult> {
  const pf = preflightPurchaseOrder(raw);
  if (!pf.valid) {
    const msg = pf.errors.map((e) => `${e.field}: ${e.message}`).join('؛ ');
    if (opts.strict) throw new Error(`Preflight failed — ${msg}`);
    return { ok: false, errorCode: 'invalid-payload', message: msg, details: pf.errors };
  }
  const data = pf.sanitized;

  const config = buildPdfConfig(opts.config);
  const pageCfg = toPageConfig(config);

  // Merge profile-driven branding (logo, tax) into buyer block.
  const enriched: PurchaseOrderHtmlData = {
    ...data,
    buyer: {
      ...data.buyer,
      logoUrl: data.buyer.logoUrl ?? config.header?.logoUrl,
      taxNumber: data.buyer.taxNumber ?? config.branding.taxNumber,
    },
  };

  const tashkeel = detectTashkeel(
    [
      enriched.notes ?? '',
      enriched.paymentTerms ?? '',
      ...enriched.items.map((i) => i.description),
    ].join(' '),
  );
  const typoCss = buildTypographyRulesCss(config, { hasTashkeel: tashkeel, descenderSafe: true });
  const wm = config.watermark;
  const wmCss = wm.enabled && wm.imageUrl
    ? buildWatermarkImageCss({
        imageUrl: wm.imageUrl,
        opacity: wm.opacity,
        rotation: wm.rotation,
        tiled: wm.tiled,
      })
    : '';
  const css = `${typoCss}\n${PURCHASE_ORDER_HTML_CSS}\n${wmCss}`;
  const html = withWatermarkImage(
    renderPurchaseOrderHtml(enriched),
    wm.enabled ? wm.imageUrl : undefined,
    !!wm.tiled,
  );

  const filename = opts.filename ?? buildDocFilename('purchase_order', data.orderNumber);
  const result = await safeRender<Blob>(
    async () => {
      const out = await htmlPdfEngine.render(
        { page: pageCfg, theme: { fontKey: config.typography.fontKey } as never },
        {
          html,
          css,
          dir: 'rtl',
          embedArabicFont: config.behavior.embedFonts,
          fontKey: config.typography.fontKey,
          documentType: 'purchase_order',
        },
        filename,
      );
      return out.blob;
    },
    { timeoutMs: opts.timeoutMs ?? 60_000 },
  );

  if (result.ok === false) {
    return {
      ok: false,
      errorCode: result.error.code,
      message: result.error.message,
      details: result.error.cause,
      durationMs: result.durationMs,
    };
  }

  if ((opts.output ?? 'save') === 'save') {
    triggerDownload(result.value, filename);
  }

  return {
    ok: true,
    blob: result.value,
    filename,
    config,
    durationMs: result.durationMs,
    warnings: pf.warnings.map(({ field, message }) => ({ field, message })),
  };
}

function triggerDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
