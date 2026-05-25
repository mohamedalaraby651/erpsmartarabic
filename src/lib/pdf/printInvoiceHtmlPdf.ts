/**
 * Unified one-call PDF entry point (Wave 15+16+17).
 *
 *   await printInvoiceHtmlPdf(data);                    // saves to disk
 *   await printInvoiceHtmlPdf(data, { config, output: 'blob' });
 *
 * Pipeline:
 *   1. preflight validation     → friendly errors, never trusts input
 *   2. buildPdfConfig           → fills defaults from user preferences
 *   3. renderInvoiceHtml + CSS  → Arabic-aware HTML
 *   4. HtmlPdfEngine            → html2canvas + jsPDF
 *   5. safeRender boundary      → timeout + classified errors
 */
import { buildPdfConfig, toPageConfig, type PdfConfigInput, type PdfConfig } from './config/pdfConfigSchema';
import { preflightInvoice } from './diagnostics/preflightValidator';
import { safeRender, type PdfBoundaryResult } from './diagnostics/PdfErrorBoundary';
import { buildTypographyRulesCss, detectTashkeel } from './arabic/typographyRules';
import { renderInvoiceHtml, INVOICE_HTML_CSS, type InvoiceHtmlData } from './templates/InvoiceHtmlTemplate';
import { htmlPdfEngine } from './engine/HtmlPdfEngine';
import { buildInvoiceFilename } from './utils/filename';

export type PrintOutput = 'save' | 'blob';

export interface PrintInvoicePdfOptions {
  config?: PdfConfigInput;
  output?: PrintOutput;
  filename?: string;
  timeoutMs?: number;
  /** Throw on preflight errors instead of returning a structured failure. */
  strict?: boolean;
}

export interface PrintInvoicePdfSuccess {
  ok: true;
  blob: Blob;
  filename: string;
  config: PdfConfig;
  durationMs: number;
  warnings: { field: string; message: string }[];
}

export interface PrintInvoicePdfFailure {
  ok: false;
  errorCode: string;
  message: string;
  details?: unknown;
  durationMs?: number;
}

export type PrintInvoicePdfResult = PrintInvoicePdfSuccess | PrintInvoicePdfFailure;

export async function printInvoiceHtmlPdf(
  raw: InvoiceHtmlData,
  opts: PrintInvoicePdfOptions = {},
): Promise<PrintInvoicePdfResult> {
  // 1. Preflight
  const pf = preflightInvoice(raw);
  if (!pf.valid) {
    const msg = pf.errors.map((e) => `${e.field}: ${e.message}`).join('؛ ');
    if (opts.strict) throw new Error(`Preflight failed — ${msg}`);
    return { ok: false, errorCode: 'invalid-payload', message: msg, details: pf.errors };
  }
  const data = pf.sanitized;

  // 2. Config
  const config = buildPdfConfig(opts.config);
  const pageCfg = toPageConfig(config);

  // 3. Compose HTML + CSS
  const tashkeel = detectTashkeel(
    [
      data.notes ?? '',
      ...data.items.map((i) => i.description),
    ].join(' '),
  );
  const typoCss = buildTypographyRulesCss(config, { hasTashkeel: tashkeel, descenderSafe: true });
  const css = `${typoCss}\n${INVOICE_HTML_CSS}`;
  const html = renderInvoiceHtml(data);

  // 4+5. Render under boundary
  const filename = opts.filename ?? buildInvoiceFilename(data.invoiceNumber, 'pdf');
  const result: PdfBoundaryResult<Blob> = await safeRender(
    async () => {
      const out = await htmlPdfEngine.render(
        { page: pageCfg, theme: { fontKey: config.typography.fontKey } as never },
        {
          html,
          css,
          dir: 'rtl',
          embedArabicFont: config.behavior.embedFonts,
          fontKey: config.typography.fontKey,
          documentType: 'invoice',
        },
        filename,
      );
      return out.blob;
    },
    { timeoutMs: opts.timeoutMs ?? 60_000 },
  );

  if (!result.ok) {
    return {
      ok: false,
      errorCode: result.error.code,
      message: result.error.message,
      details: result.error.cause,
      durationMs: result.durationMs,
    };
  }

  // 6. Deliver
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
