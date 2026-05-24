/**
 * User-level PDF font preference for the v2 engine.
 *
 * Resolution order when callers don't pass an explicit `fontKey`:
 *   1. localStorage['pdf_font']             (per-device, syncs from Settings UI)
 *   2. import.meta.env.VITE_PDF_FONT        (build-time override)
 *   3. DEFAULT_PDF_FONT ('cairo')           (modern, readable default)
 *
 * The Settings page already persists `pdf_font` to the company settings
 * record; the helper below also exposes a setter so the same key gets
 * mirrored into localStorage for instant pickup by the PDF engines
 * (no round-trip to the database on every export).
 */
import { AVAILABLE_FONTS, type PdfFontKey } from '@/lib/arabicFont';

export const DEFAULT_PDF_FONT: PdfFontKey = 'cairo';
export const PDF_FONT_STORAGE_KEY = 'pdf_font';

const VALID_KEYS = new Set<string>(AVAILABLE_FONTS.map((f) => f.key));

function readLs(): string | null {
  try {
    return typeof window !== 'undefined'
      ? window.localStorage.getItem(PDF_FONT_STORAGE_KEY)
      : null;
  } catch {
    return null;
  }
}

function readEnv(): string | undefined {
  try {
    return (import.meta as { env?: Record<string, string> }).env?.VITE_PDF_FONT;
  } catch {
    return undefined;
  }
}

function normalize(value: unknown): PdfFontKey | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  return VALID_KEYS.has(v) ? (v as PdfFontKey) : null;
}

export function getPdfFontPreference(): PdfFontKey {
  return (
    normalize(readLs()) ??
    normalize(readEnv()) ??
    DEFAULT_PDF_FONT
  );
}

export function setPdfFontPreference(key: PdfFontKey): void {
  if (!normalize(key)) return;
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PDF_FONT_STORAGE_KEY, key);
    }
  } catch {
    /* private mode / SSR — ignore */
  }
}

export function clearPdfFontPreference(): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(PDF_FONT_STORAGE_KEY);
    }
  } catch {
    /* noop */
  }
}
