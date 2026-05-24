import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/arabicFont', async () => {
  const calls: string[] = [];
  return {
    AVAILABLE_FONTS: [
      { key: 'amiri', name: 'Amiri', file: 'amiri.ttf' },
      { key: 'cairo', name: 'Cairo', file: 'cairo.ttf' },
    ],
    __calls: calls,
    loadArabicFont: vi.fn(async (key: string) => {
      calls.push(key);
      if (key === 'broken') return '';
      // simulate async network latency
      await new Promise((r) => setTimeout(r, 5));
      return `base64::${key}`;
    }),
  };
});

import { resolveFont, clearFontCache, listAvailableFonts } from './fontRegistry';
import { PdfFontLoadError } from '../diagnostics/errors';
import * as arabicFontMock from '@/lib/arabicFont';

const calls = (arabicFontMock as unknown as { __calls: string[] }).__calls;

beforeEach(() => {
  clearFontCache();
  calls.length = 0;
  (arabicFontMock.loadArabicFont as unknown as ReturnType<typeof vi.fn>).mockClear();
});

describe('fontRegistry', () => {
  it('lists available fonts', () => {
    expect(listAvailableFonts().map((f) => f.key)).toContain('amiri');
  });

  it('resolves the requested font and caches the result', async () => {
    const a = await resolveFont('amiri');
    const b = await resolveFont('amiri');
    expect(a.base64).toBe('base64::amiri');
    expect(b).toBe(a); // same cached object
    expect(arabicFontMock.loadArabicFont).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent in-flight requests', async () => {
    const [r1, r2, r3] = await Promise.all([
      resolveFont('cairo'),
      resolveFont('cairo'),
      resolveFont('cairo'),
    ]);
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
    expect(arabicFontMock.loadArabicFont).toHaveBeenCalledTimes(1);
  });

  it('falls back to amiri when the requested font fails', async () => {
    const r = await resolveFont('broken' as never);
    expect(r.key).toBe('amiri');
    expect(calls).toContain('broken');
    expect(calls).toContain('amiri');
  });

  it('throws PdfFontLoadError when every fallback fails', async () => {
    (arabicFontMock.loadArabicFont as unknown as ReturnType<typeof vi.fn>)
      .mockImplementation(async () => '');
    await expect(resolveFont('amiri')).rejects.toBeInstanceOf(PdfFontLoadError);
  });
});
