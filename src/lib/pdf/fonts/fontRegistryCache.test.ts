import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';

vi.mock('@/lib/arabicFont', () => {
  return {
    AVAILABLE_FONTS: [
      { key: 'amiri', name: 'Amiri', file: 'amiri.ttf' },
      { key: 'cairo', name: 'Cairo', file: 'cairo.ttf' },
    ],
    loadArabicFont: vi.fn(async (key: string) => `net::${key}`),
  };
});

import { resolveFont, clearFontCache } from './fontRegistry';
import { clearFontDiskCache, putCachedFont, getCachedFont } from './fontCache';
import * as arabicFontMock from '@/lib/arabicFont';

beforeEach(async () => {
  clearFontCache();
  await clearFontDiskCache();
  (arabicFontMock.loadArabicFont as unknown as ReturnType<typeof vi.fn>).mockClear();
});

describe('fontRegistry × fontCache (disk tier)', () => {
  it('persists network payload to IndexedDB after first load', async () => {
    await resolveFont('cairo');
    expect(arabicFontMock.loadArabicFont).toHaveBeenCalledTimes(1);
    // Allow the fire-and-forget put to settle.
    await new Promise((r) => setTimeout(r, 10));
    expect(await getCachedFont('cairo')).toBe('net::cairo');
  });

  it('serves from disk cache without hitting the network', async () => {
    await putCachedFont('cairo', 'disk::cairo');
    clearFontCache(); // wipe in-memory tier
    const f = await resolveFont('cairo');
    expect(f.base64).toBe('disk::cairo');
    expect(arabicFontMock.loadArabicFont).not.toHaveBeenCalled();
  });
});
