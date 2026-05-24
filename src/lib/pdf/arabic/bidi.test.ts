import { describe, it, expect } from 'vitest';
import {
  stripBidiControls,
  hasBidiControls,
  isolateLtrTokens,
  prepareForPdf,
} from './bidi';

describe('bidi.stripBidiControls', () => {
  it('returns empty string for null/undefined', () => {
    expect(stripBidiControls(null)).toBe('');
    expect(stripBidiControls(undefined)).toBe('');
  });

  it('removes LRM, RLM, LRE, RLE, PDF, LRO, RLO', () => {
    const dirty = 'A\u200eB\u200fC\u202aD\u202bE\u202cF\u202dG\u202eH';
    expect(stripBidiControls(dirty)).toBe('ABCDEFGH');
  });

  it('removes the FSI/RLI/LRI/PDI block', () => {
    const dirty = 'X\u2066Y\u2067Z\u2068Q\u2069W';
    expect(stripBidiControls(dirty)).toBe('XYZQW');
  });

  it('leaves Arabic + ASCII intact', () => {
    expect(stripBidiControls('فاتورة INV-2026/001')).toBe('فاتورة INV-2026/001');
  });
});

describe('bidi.hasBidiControls', () => {
  it('detects controls', () => {
    expect(hasBidiControls('clean')).toBe(false);
    expect(hasBidiControls('with\u202emark')).toBe(true);
  });
});

describe('bidi.isolateLtrTokens', () => {
  it('wraps emails with FSI/PDI', () => {
    const out = isolateLtrTokens('راسلنا على info@example.com اليوم');
    expect(out).toContain('\u2068info@example.com\u2069');
  });

  it('wraps URLs', () => {
    const out = isolateLtrTokens('الموقع https://lovable.dev متاح');
    expect(out).toContain('\u2068https://lovable.dev\u2069');
  });

  it('wraps phone numbers', () => {
    const out = isolateLtrTokens('اتصل +971 50 123 4567 الآن');
    expect(out).toMatch(/\u2068\+971 50 123 4567\u2069/);
  });

  it('wraps SKUs', () => {
    const out = isolateLtrTokens('المنتج SKU-12345-AB متوفر');
    expect(out).toContain('\u2068SKU-12345-AB\u2069');
  });

  it('is idempotent (re-running sanitizes pre-existing controls)', () => {
    const once = isolateLtrTokens('email a@b.co');
    const twice = isolateLtrTokens(once);
    // Both runs produce strings that contain a single wrapped email; bidi
    // controls are stripped first so we don't accumulate isolates.
    expect((twice.match(/\u2068/g) ?? []).length).toBe(1);
    expect(twice).toContain('\u2068a@b.co\u2069');
  });

  it('handles empty input', () => {
    expect(isolateLtrTokens('')).toBe('');
    expect(isolateLtrTokens(null)).toBe('');
  });
});

describe('bidi.prepareForPdf', () => {
  it('strips controls AND isolates tokens in one call', () => {
    const dirty = 'فاتورة\u202e للعميل a@b.co';
    const out = prepareForPdf(dirty);
    expect(out).not.toContain('\u202e');
    expect(out).toContain('\u2068a@b.co\u2069');
  });
});
