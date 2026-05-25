import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BRANDING,
  validateBranding,
  isBrandingValid,
  contrastRatio,
  WCAG_AA_NORMAL,
} from './PdfBranding';

describe('PdfBranding', () => {
  it('الافتراضي صالح', () => {
    expect(isBrandingValid(DEFAULT_BRANDING)).toBe(true);
  });

  it('يرفض لوناً غير صالح', () => {
    expect(isBrandingValid({ ...DEFAULT_BRANDING, primaryColor: 'red' })).toBe(false);
  });

  it('contrastRatio: أسود على أبيض = 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('contrastRatio: نفس اللون = 1', () => {
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 1);
  });

  it('يحذّر من تباين ضعيف بين النص والخلفية الثانوية', () => {
    const issues = validateBranding({
      ...DEFAULT_BRANDING,
      textColor: '#cccccc',
      secondaryColor: '#dddddd',
    });
    expect(issues.find((i) => i.field === 'contrast')?.severity).toBe('warning');
  });

  it('لا يحذّر من تباين كافٍ', () => {
    const issues = validateBranding({
      ...DEFAULT_BRANDING,
      textColor: '#000000',
      secondaryColor: '#ffffff',
    });
    expect(issues.find((i) => i.field === 'contrast')).toBeUndefined();
  });

  it('يضمن أن WCAG_AA_NORMAL ثابت معياري', () => {
    expect(WCAG_AA_NORMAL).toBe(4.5);
  });
});
