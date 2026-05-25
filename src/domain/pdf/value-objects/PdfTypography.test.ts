import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TYPOGRAPHY,
  validateTypography,
  isTypographyValid,
  toFontFamilyCss,
} from './PdfTypography';

describe('PdfTypography', () => {
  it('الإعدادات الافتراضية صالحة', () => {
    expect(isTypographyValid(DEFAULT_TYPOGRAPHY)).toBe(true);
  });

  it('يرفض حجم خط خارج النطاق', () => {
    expect(isTypographyValid({ ...DEFAULT_TYPOGRAPHY, baseFontSizePx: 4 })).toBe(false);
    expect(isTypographyValid({ ...DEFAULT_TYPOGRAPHY, baseFontSizePx: 40 })).toBe(false);
  });

  it('يحذّر من ارتفاع سطر منخفض', () => {
    const issues = validateTypography({ ...DEFAULT_TYPOGRAPHY, lineHeight: 1.2 });
    expect(issues.find((i) => i.field === 'lineHeight')?.severity).toBe('warning');
  });

  it('يبني font-family CSS مع fallback chain', () => {
    const css = toFontFamilyCss(DEFAULT_TYPOGRAPHY);
    expect(css).toContain('Cairo');
    expect(css).toContain('Tajawal');
    expect(css).toContain('Amiri');
  });

  it('يضع الخط الأساسي أولاً ولا يكرره', () => {
    const css = toFontFamilyCss({ ...DEFAULT_TYPOGRAPHY, fontKey: 'amiri' });
    const idxAmiri = css.indexOf('Amiri');
    const idxCairo = css.indexOf('Cairo');
    expect(idxAmiri).toBeLessThan(idxCairo);
    expect(css.match(/Amiri/g)?.length).toBe(1);
  });
});
