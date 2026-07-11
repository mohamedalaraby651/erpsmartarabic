import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildArabicCss } from './arabicCss';

vi.mock('../fonts/fontRegistry', () => ({
  resolveFont: vi.fn(async () => ({
    key: 'amiri',
    config: { key: 'amiri', name: 'Amiri', file: 'amiri.ttf' },
    base64: 'data:font/ttf;base64,AAAA',
  })),
}));

describe('buildArabicCss', () => {
  beforeEach(() => vi.clearAllMocks());

  it('embeds the font as @font-face with base64 stripped of data URI', async () => {
    const { css, fontFamily, fontKey } = await buildArabicCss();
    expect(fontKey).toBe('amiri');
    expect(fontFamily).toBe('Amiri');
    expect(css).toContain("@font-face");
    expect(css).toContain("font-family: var(--font-sans);
    expect(css).toContain('base64,AAAA');
    expect(css).not.toContain('data:font/ttf;base64,data:');
  });

  it('applies RTL base styles and tabular numerals for amounts', async () => {
    const { css } = await buildArabicCss();
    expect(css).toMatch(/direction:\s*rtl/);
    expect(css).toMatch(/text-align:\s*right/);
    expect(css).toContain('.pdf-root .num');
    expect(css).toContain("font-feature-settings: 'tnum' 1");
  });

  it('honors custom base font size', async () => {
    const { css } = await buildArabicCss({ baseFontSizePx: 14 });
    expect(css).toContain('font-size: 14px');
  });
});
