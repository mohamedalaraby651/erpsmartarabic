/**
 * Unified one-call PDF entry point for quotations (Wave 23).
 * Mirrors `printInvoiceHtmlPdf` but uses the quotation template + preflight.
 */
import { buildPdfConfig, toPageConfig, type PdfConfigInput, type PdfConfig } from './config/pdfConfigSchema';
import { preflightQuotation } from './diagnostics/preflightQuotation';
import { safeRender } from './diagnostics/PdfErrorBoundary';
import { buildTypographyRulesCss, detectTashkeel } from './arabic/typographyRules';
import {
  renderQuotationHtml,
  QUOTATION_HTML_CSS,
  buildWatermarkImageCss,
  withWatermarkImage,
  type QuotationHtmlData,
} from './templates/QuotationHtmlTemplate';
import { htmlPdfEngine } from './engine/HtmlPdfEngine';
import { buildDocFilename } from './utils/filename';

export type PrintQuotationOutput = 'save' | 'blob';

export interface PrintQuotationPdfOptions {
  config?: PdfConfigInput;
  output?: PrintQuotationOutput;
  filename?: string;
  timeoutMs?: number;
  strict?: boolean;
}

export interface PrintQuotationPdfSuccess {
  ok: true;
  blob: Blob;
  filename: string;
  config: PdfConfig;
  durationMs: number;
  warnings: { field: string; message: string }[];
}

export interface PrintQuotationPdfFailure {
  ok: false;
  errorCode: string;
  message: string;
  details?: unknown;
  durationMs?: number;
}

export type PrintQuotationPdfResult =
  | PrintQuotationPdfSuccess
  | PrintQuotationPdfFailure;

export async function printQuotationHtmlPdf(
  raw: QuotationHtmlData,
  opts: PrintQuotationPdfOptions = {},
): Promise<PrintQuotationPdfResult> {
  const pf = preflightQuotation(raw);
  if (!pf.valid) {
    const msg = pf.errors.map((e) => `${e.field}: ${e.message}`).join('؛ ');
    if (opts.strict) throw new Error(`Preflight failed — ${msg}`);
    return { ok: false, errorCode: 'invalid-payload', message: msg, details: pf.errors };
  }
  const data = pf.sanitized;

  const config = buildPdfConfig(opts.config);
  const pageCfg = toPageConfig(config);

  // Merge profile-driven branding (logo, tax) into template data.
  const enriched: QuotationHtmlData = {
    ...data,
    company: {
      ...data.company,
      logoUrl: data.company.logoUrl ?? config.header?.logoUrl,
      taxNumber: data.company.taxNumber ?? config.branding.taxNumber,
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
  const css = `${typoCss}\n${QUOTATION_HTML_CSS}\n${wmCss}`;
  const html = withWatermarkImage(
    renderQuotationHtml(enriched),
    wm.enabled ? wm.imageUrl : undefined,
    !!wm.tiled,
  );

  const filename = opts.filename ?? buildDocFilename('quotation', data.quotationNumber);
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
          documentType: 'quotation',
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
