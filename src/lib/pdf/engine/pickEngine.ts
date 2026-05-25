/**
 * Engine factory. Picks the right `IPdfEngine` for a document type
 * based on opt-in feature flags. Defaults to the safe legacy `jspdf`
 * engine — `html2pdf` is only used when explicitly opted in.
 *
 *   localStorage.pdf_engine_html = '1'           → force HtmlPdfEngine
 *   localStorage.pdf_engine_html_types = 'a,b,c' → per-docType opt-in
 *   import.meta.env.VITE_PDF_ENGINE_HTML = 'true'→ build-time opt-in
 */
import type { IPdfEngine } from './IPdfEngine';
import { engineRegistry } from './EngineStrategyRegistry';

export interface PickEngineOptions {
  docType: string;
  /** Explicit override — bypasses all flag checks. */
  prefer?: 'jspdf' | 'html2pdf';
}

function readLs(key: string): string | null {
  try {
    return typeof window !== 'undefined'
      ? window.localStorage.getItem(key)
      : null;
  } catch {
    return null;
  }
}

function readEnv(key: string): string | undefined {
  try {
    return (import.meta as { env?: Record<string, string> }).env?.[key];
  } catch {
    return undefined;
  }
}

export function isHtmlEngineEnabledFor(docType: string): boolean {
  if (readLs('pdf_engine_html') === '1') return true;
  if (readEnv('VITE_PDF_ENGINE_HTML') === 'true') return true;
  const csv = readLs('pdf_engine_html_types') ?? readEnv('VITE_PDF_ENGINE_HTML_TYPES') ?? '';
  if (!csv) return false;
  return csv
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(docType.toLowerCase());
}

export function pickEngine(opts: PickEngineOptions): IPdfEngine {
  if (opts.prefer === 'html2pdf') return engineRegistry.get('html2pdf');
  if (opts.prefer === 'jspdf') return engineRegistry.get('jspdf');
  return isHtmlEngineEnabledFor(opts.docType)
    ? engineRegistry.get('html2pdf')
    : engineRegistry.get('jspdf');
}
