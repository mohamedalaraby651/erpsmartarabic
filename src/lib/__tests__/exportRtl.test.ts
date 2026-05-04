/**
 * Low-level guarantees for the Arabic / RTL export pipeline.
 * Complements `arabicFont.test.ts` by focusing on bidi sanitization and
 * the specific code points that must never appear in CSV/Excel/PDF outputs.
 */
import { describe, it, expect } from 'vitest';
import { sanitizeBidiText, reshapeArabicText, toVisualOrder } from '../arabicFont';

const BIDI_CONTROLS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

describe('export pipeline — bidi sanitation (CSV/Excel headers)', () => {
  it('removes every bidi control character from a header', () => {
    const dirty = '\u202Bرقم \u200Eالفاتورة\u202C';
    const clean = sanitizeBidiText(dirty);
    expect(BIDI_CONTROLS.test(clean)).toBe(false);
    expect(/رقم/.test(clean)).toBe(true);
    expect(/الفاتورة/.test(clean)).toBe(true);
  });

  it('keeps invisible junk out of numeric values too', () => {
    const dirty = '\u200F1234\u200E';
    expect(sanitizeBidiText(dirty)).toBe('1234');
  });
});

describe('export pipeline — Arabic shaping (PDF)', () => {
  it('reshape produces presentation-form glyphs for Arabic-only text', () => {
    const out = reshapeArabicText('فاتورة');
    expect(/[\uFE70-\uFEFF]/.test(out)).toBe(true);
  });

  it('reshape never injects bidi control characters', () => {
    const out = reshapeArabicText('شركة المثال للتجارة');
    expect(BIDI_CONTROLS.test(out)).toBe(false);
  });

  it('toVisualOrder preserves Latin/digit substrings when mixed', () => {
    const out = toVisualOrder('فاتورة INV-2024-001 بقيمة 1,250.00');
    expect(out).toContain('INV-2024-001');
    expect(out).toContain('1,250.00');
    expect(BIDI_CONTROLS.test(out)).toBe(false);
  });

  it('full pipeline is idempotent for repeated invocation', () => {
    const txt = 'كشف حساب العميل ACME Ltd';
    const a = toVisualOrder(reshapeArabicText(txt));
    const b = toVisualOrder(reshapeArabicText(txt));
    expect(a).toBe(b);
  });
});
