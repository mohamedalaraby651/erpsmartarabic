import {
  loadArabicFont,
  AVAILABLE_FONTS,
  type PdfFontKey,
  type FontConfig,
} from '@/lib/arabicFont';
import { PdfFontLoadError } from '../diagnostics/errors';
import { getPdfFontPreference, DEFAULT_PDF_FONT } from './fontPreference';
import { getCachedFont, putCachedFont } from './fontCache';

/**
 * Dynamic font registry on top of the legacy loadArabicFont().
 *
 * Three-tier cache (Wave 19):
 *   1. In-memory Map  → same-session reuse, zero cost.
 *   2. IndexedDB      → cross-session persistence (~400KB per font).
 *   3. Network        → loadArabicFont() with multi-CDN fallback.
 *
 * Ordered fallback chain: requested → Cairo → Amiri → throw PdfFontLoadError.
 */
export interface LoadedFont {
  key: PdfFontKey;
  config: FontConfig;
  base64: string;
}

const _memCache = new Map<PdfFontKey, LoadedFont>();
const _inflight = new Map<PdfFontKey, Promise<LoadedFont>>();

/** Hard fallback chain — Cairo first (modern default), Amiri last (most reliable shaping). */
const FALLBACK_ORDER: PdfFontKey[] = ['cairo', 'amiri'];

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
    // Tier 2: persistent IndexedDB cache.
    let base64: string | null = null;
    try {
      base64 = await getCachedFont(key);
    } catch {
      base64 = null;
    }
    // Tier 3: network.
    if (!base64) {
      base64 = await loadArabicFont(key);
      if (base64) {
        // Best-effort persist; failures must never break exports.
        void putCachedFont(key, base64).catch(() => {});
      }
    }
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
 * When `preferred` is omitted, the user preference (from Settings UI /
 * localStorage / env) is used. Defaults to Cairo.
 * Order: requested → FALLBACK_ORDER → throw PdfFontLoadError.
 */
export async function resolveFont(preferred?: PdfFontKey): Promise<LoadedFont> {
  const initial = preferred ?? getPdfFontPreference() ?? DEFAULT_PDF_FONT;
  const chain = [initial, ...FALLBACK_ORDER.filter((k) => k !== initial)];
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
    initial,
    `no font available after trying ${chain.join(', ')}: ${(lastError as Error)?.message ?? 'unknown'}`,
  );
}
