import { describe, it, expect } from 'vitest';
import { buildTypographyRulesCss, detectTashkeel } from './typographyRules';
import { buildPdfConfig } from '../config/pdfConfigSchema';

describe('buildTypographyRulesCss', () => {
  const cfg = buildPdfConfig({ typography: { fontKey: 'cairo', baseFontSizePx: 12, lineHeight: 1.7, letterSpacing: 0 } });

  it('injects CSS variables', () => {
    const css = buildTypographyRulesCss(cfg);
    expect(css).toContain('--pdf-base-fs: 12px');
    expect(css).toContain('--pdf-lh: 1.7');
  });

  it('expands line-height when tashkeel is present', () => {
    const css = buildTypographyRulesCss(cfg, { hasTashkeel: true });
    expect(css).toContain('--pdf-lh: 2');
  });

  it('applies descender-safe padding', () => {
    const css = buildTypographyRulesCss(cfg, { descenderSafe: true });
    expect(css).toContain('padding-block: 0.18em');
  });

  it('enforces table page-break safety', () => {
    const css = buildTypographyRulesCss(cfg);
    expect(css).toContain('display: table-header-group');
    expect(css).toContain('page-break-inside: avoid');
  });

  it('enables required font features', () => {
    const css = buildTypographyRulesCss(cfg);
    expect(css).toContain('"kern" 1');
    expect(css).toContain('"liga" 1');
    expect(css).toContain('"mark" 1');
  });
});

describe('detectTashkeel', () => {
  it('returns false for plain text', () => {
    expect(detectTashkeel('السلام عليكم')).toBe(false);
  });
  it('returns true for tashkeel-heavy text', () => {
    expect(detectTashkeel('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ')).toBe(true);
  });
  it('returns false for empty input', () => {
    expect(detectTashkeel('')).toBe(false);
  });
});
