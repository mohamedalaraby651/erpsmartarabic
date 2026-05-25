/**
 * Unified one-call PDF entry point for statements of account (Wave 24).
 */
import { buildPdfConfig, toPageConfig, type PdfConfigInput, type PdfConfig } from './config/pdfConfigSchema';
import { preflightStatement } from './diagnostics/preflightStatement';
import { safeRender } from './diagnostics/PdfErrorBoundary';
import { buildTypographyRulesCss, detectTashkeel } from './arabic/typographyRules';
import {
  renderStatementHtml,
  STATEMENT_HTML_CSS,
  buildWatermarkImageCss,
  withWatermarkImage,
  type StatementHtmlData,
} from './templates/StatementHtmlTemplate';
import { htmlPdfEngine } from './engine/HtmlPdfEngine';
import { buildDocFilename } from './utils/filename';

export type PrintStatementOutput = 'save' | 'blob';

export interface PrintStatementPdfOptions {
  config?: PdfConfigInput;
  output?: PrintStatementOutput;
  filename?: string;
  timeoutMs?: number;
  strict?: boolean;
}

export interface PrintStatementPdfSuccess {
  ok: true;
  blob: Blob;
  filename: string;
  config: PdfConfig;
  durationMs: number;
  warnings: { field: string; message: string }[];
}

export interface PrintStatementPdfFailure {
  ok: false;
  errorCode: string;
  message: string;
  details?: unknown;
  durationMs?: number;
}

export type PrintStatementPdfResult =
  | PrintStatementPdfSuccess
  | PrintStatementPdfFailure;

export async function printStatementHtmlPdf(
  raw: StatementHtmlData,
  opts: PrintStatementPdfOptions = {},
): Promise<PrintStatementPdfResult> {
  const pf = preflightStatement(raw);
  if (!pf.valid) {
    const msg = pf.errors.map((e) => `${e.field}: ${e.message}`).join('؛ ');
    if (opts.strict) throw new Error(`Preflight failed — ${msg}`);
    return { ok: false, errorCode: 'invalid-payload', message: msg, details: pf.errors };
  }
  const data = pf.sanitized;

  const config = buildPdfConfig(opts.config);
  const pageCfg = toPageConfig(config);

  // Merge profile-driven branding into company block.
  const enriched: StatementHtmlData = {
    ...data,
    company: {
      ...data.company,
      logoUrl: data.company.logoUrl ?? config.header?.logoUrl,
      taxNumber: data.company.taxNumber ?? config.branding.taxNumber,
    },
  };

  const tashkeel = detectTashkeel(
    [enriched.notes ?? '', ...enriched.transactions.map((t) => t.description ?? '')].join(' '),
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
  const css = `${typoCss}\n${STATEMENT_HTML_CSS}\n${wmCss}`;
  const html = withWatermarkImage(
    renderStatementHtml(enriched),
    wm.enabled ? wm.imageUrl : undefined,
    !!wm.tiled,
  );

  const filename = opts.filename ?? buildDocFilename('statement', data.statementNumber);
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
          documentType: 'statement' as never,
        },
        filename,
      );
      return out.blob;
    },
    { timeoutMs: opts.timeoutMs ?? 90_000 },
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
