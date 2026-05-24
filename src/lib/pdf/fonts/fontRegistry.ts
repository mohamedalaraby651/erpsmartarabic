import {
  loadArabicFont,
  AVAILABLE_FONTS,
  type PdfFontKey,
  type FontConfig,
} from '@/lib/arabicFont';
import { PdfFontLoadError } from '../diagnostics/errors';
import { getPdfFontPreference, DEFAULT_PDF_FONT } from './fontPreference';

/**
 * Dynamic font registry on top of the legacy loadArabicFont().
 *
 * Adds:
 *   - In-memory cache so repeated exports reuse the same base64 buffer.
 *   - Ordered fallback chain: requested → Amiri (default) → throw.
 *   - Strong typing of the resolved descriptor (key + base64 + family name).
 *
 * IndexedDB persistence is intentionally out of scope here — the browser
 * already caches the underlying /fonts/*.ttf via HTTP, and a second-tier
 * IDB cache would add complexity without measurable wins for our payloads.
 */
export interface LoadedFont {
  key: PdfFontKey;
  config: FontConfig;
  base64: string;
}

const _memCache = new Map<PdfFontKey, LoadedFont>();
const _inflight = new Map<PdfFontKey, Promise<LoadedFont>>();

/** Hard fallback chain: try the requested font, then Amiri (most reliable). */
const FALLBACK_ORDER: PdfFontKey[] = ['amiri'];

export function listAvailableFonts(): FontConfig[] {
  return AVAILABLE_FONTS;
}

export function clearFontCache(): void {
  _memCache.clear();
  _inflight.clear();
}

async function loadOne(key: PdfFontKey): Promise<LoadedFont> {
  if (_memCache.has(key)) return _memCache.get(key)!;
  if (_inflight.has(key)) return _inflight.get(key)!;

  const config = AVAILABLE_FONTS.find((f) => f.key === key) ?? AVAILABLE_FONTS[0];
  const p = (async () => {
    const base64 = await loadArabicFont(key);
    if (!base64) {
      throw new PdfFontLoadError(key, `font "${config.name}" failed to load`);
    }
    const entry: LoadedFont = { key, config, base64 };
    _memCache.set(key, entry);
    return entry;
  })();

  _inflight.set(key, p);
  try {
    return await p;
  } finally {
    _inflight.delete(key);
  }
}

/**
 * Resolve a font with automatic fallback.
 * Order: requested → FALLBACK_ORDER → throw PdfFontLoadError.
 */
export async function resolveFont(preferred: PdfFontKey = 'amiri'): Promise<LoadedFont> {
  const chain = [preferred, ...FALLBACK_ORDER.filter((k) => k !== preferred)];
  let lastError: unknown = null;
  for (const key of chain) {
    try {
      return await loadOne(key);
    } catch (e) {
      lastError = e;
      // try next
    }
  }
  throw new PdfFontLoadError(
    preferred,
    `no font available after trying ${chain.join(', ')}: ${(lastError as Error)?.message ?? 'unknown'}`,
  );
}
