import { describe, it, expect } from 'vitest';
import {
  createDefaultProfile,
  validateProfile,
  ALL_SCOPES,
} from './DocumentRenderProfile';

describe('DocumentRenderProfile', () => {
  it('createDefaultProfile صالح لكل scope', () => {
    for (const scope of ALL_SCOPES) {
      const p = createDefaultProfile(scope);
      const result = validateProfile(p);
      expect(result.valid, `scope=${scope} errors=${result.errors.join('|')}`).toBe(true);
    }
  });

  it('validateProfile يجمع أخطاء من كل القيم', () => {
    const p = createDefaultProfile();
    p.layout.margins.top = -5;
    p.typography.baseFontSizePx = 100;
    const result = validateProfile(p);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('layout.top'))).toBe(true);
    expect(result.errors.some((e) => e.includes('typography.baseFontSizePx'))).toBe(true);
  });

  it('يرفض ارتفاع رأس/تذييل خارج النطاق', () => {
    const p = createDefaultProfile();
    p.header.height = 80;
    const result = validateProfile(p);
    expect(result.errors.some((e) => e.includes('header.height'))).toBe(true);
  });
});
