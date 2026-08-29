import type { IPdfEngine, PdfRenderContext, PdfRenderResult } from './IPdfEngine';
import { withPdfTelemetry } from '../diagnostics/PdfLogger';
import { PdfEngineError, toArabicErrorMessage } from '../diagnostics/errors';
import { buildArabicCss } from '../arabic/arabicCss';
import type { PdfFontKey } from '@/lib/arabicFont';
import {
  renderChunkedHtmlPdf,
  shouldChunk,
  type ChunkedRenderOptions,
  type ChunkedRenderLoaders,
} from './chunkedRender';

/**
 * HTML-to-PDF engine. Renders rich HTML/CSS templates (RTL-friendly via
 * the browser's native bidi engine) using `html2pdf.js`, which wraps
 * html2canvas + jsPDF. Loaded lazily — never inflates the initial bundle.
 *
 * For large documents (statements, multi-page invoices) the engine
 * automatically switches to a streaming/chunked path (`chunkedRender.ts`)
 * that rasterises the document one virtual page at a time, keeping peak
 * memory below ~80MB on mobile browsers instead of the ~400MB spike of
 * a single full-DOM html2canvas pass.
 */
export interface HtmlPdfPayload {
  /** Raw HTML markup OR a live HTMLElement reference. */
  html: string | HTMLElement;
  /** Optional inline <style> block injected before render. */
  css?: string;
  /** Force direction. Defaults to 'rtl'. */
  dir?: 'rtl' | 'ltr';
  /** Auto-embed the Arabic font + RTL base CSS. Default true. */
  embedArabicFont?: boolean;
  /** Override the font (default: Amiri). */
  fontKey?: PdfFontKey;
  /** Document type for telemetry bucketing. */
  documentType?: string;
  /**
   * Chunked rendering controls. Omit to auto-detect (kicks in at ≥50 rows).
   * Set `enabled: false` to force the legacy single-pass path.
   */
  chunked?: ChunkedRenderOptions;
  /** Test seam: inject html2canvas / jsPDF loaders. */
  chunkedLoaders?: ChunkedRenderLoaders;
}

type Html2PdfFn = (el: HTMLElement, opts: unknown) => {
  outputPdf: (type: 'blob') => Promise<Blob>;
  save: () => Promise<void>;
};

/** Dynamically loads html2pdf.js. Isolated for testability. */
export async function loadHtml2Pdf(): Promise<Html2PdfFn> {
  try {
    const specifier = 'html2pdf.js';
    const mod = (await import(/* @vite-ignore */ specifier)) as {
      default?: Html2PdfFn;
    } & Html2PdfFn;
    const fn = (mod.default ?? mod) as unknown as Html2PdfFn;
    if (typeof fn !== 'function') {
      throw new Error('html2pdf module did not export a callable');
    }
    return fn;
  } catch (e) {
    throw new PdfEngineError(
      'html2pdf.js غير متاح — تعذّر تحميل المحرك البديل',
      e,
    );
  }
}

export class HtmlPdfEngine implements IPdfEngine {
  readonly id = 'html2pdf' as const;
  private _loader: () => Promise<Html2PdfFn>;

  constructor(loader: () => Promise<Html2PdfFn> = loadHtml2Pdf) {
    this._loader = loader;
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  async render(
    ctx: PdfRenderContext,
    payload: unknown,
    filename: string,
  ): Promise<PdfRenderResult> {
    const start = performance.now();
    const p = payload as HtmlPdfPayload;
    if (!p || (typeof p.html !== 'string' && !(p.html instanceof HTMLElement))) {
      throw new PdfEngineError('invalid payload: html missing');
    }
    if (!this.isAvailable()) {
      throw new PdfEngineError('HtmlPdfEngine requires a DOM environment');
    }

    const docType = p.documentType ?? 'html';
    const embed = p.embedArabicFont !== false;

    return withPdfTelemetry(docType, 'html2pdf' as never, async () => {
      let arabicCss = '';
      if (embed) {
        try {
          const built = await buildArabicCss({ fontKey: p.fontKey });
          arabicCss = built.css;
        } catch {
          // Non-fatal: continue without embedded font (browser fallback).
          arabicCss = '';
        }
      }
      const container = buildContainer(p, arabicCss);
      document.body.appendChild(container);
      try {
        // ── Chunked path ───────────────────────────────────────────────
        // For large tabular documents render page-by-page to keep peak
        // memory low. The legacy html2pdf.js path stays the default for
        // smaller documents to preserve existing behaviour & tests.
        if (shouldChunk(container, p.chunked)) {
          const blob = await renderChunkedHtmlPdf({
            container,
            page: ctx.page,
            options: p.chunked,
            loaders: p.chunkedLoaders,
          });
          return {
            blob,
            filename,
            pages: 0,
            engine: 'html2pdf' as const,
            durationMs: performance.now() - start,
          };
        }

        const html2pdf = await this._loader();
        const opts = {
          margin: [
            ctx.page.margins.top,
            ctx.page.margins.right,
            ctx.page.margins.bottom,
            ctx.page.margins.left,
          ],
          filename,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: {
            unit: 'mm',
            format: ctx.page.size.toLowerCase(),
            orientation: ctx.page.orientation,
          },
        };
        const worker = html2pdf(container, opts);
        const blob = await worker.outputPdf('blob');
        return {
          blob,
          filename,
          pages: 0,
          engine: 'html2pdf' as const,
          durationMs: performance.now() - start,
        };
      } catch (e) {
        throw new PdfEngineError(toArabicErrorMessage(e), e);
      } finally {
        container.remove();
      }
    });
  }
}

function buildContainer(p: HtmlPdfPayload, arabicCss: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'pdf-root';
  wrap.dir = p.dir ?? 'rtl';
  wrap.style.position = 'fixed';
  wrap.style.left = '-10000px';
  wrap.style.top = '0';
  wrap.style.background = '#ffffff';
  if (arabicCss) {
    const style = document.createElement('style');
    style.setAttribute('data-pdf-arabic', '1');
    style.textContent = arabicCss;
    wrap.appendChild(style);
  }
  if (p.css) {
    const style = document.createElement('style');
    style.textContent = p.css;
    wrap.appendChild(style);
  }
  if (typeof p.html === 'string') {
    const inner = document.createElement('div');
    inner.innerHTML = p.html;
    wrap.appendChild(inner);
  } else {
    wrap.appendChild(p.html.cloneNode(true));
  }
  return wrap;
}

export const htmlPdfEngine = new HtmlPdfEngine();
