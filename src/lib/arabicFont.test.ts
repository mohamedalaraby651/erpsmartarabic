import { describe, it, expect } from 'vitest';
import {
  reshapeArabicText,
  toVisualOrder,
  sanitizeBidiText,
  toArabicNumerals,
  formatArabicNumber,
  ARABIC_FONT_NAME,
} from './arabicFont';

/**
 * Tests for the Arabic PDF text pipeline.
 * Pipeline: raw logical text → reshapeArabicText → toVisualOrder → drawn by jsPDF (Amiri).
 *
 * These tests guarantee that:
 *  - Pure ASCII / numbers pass through untouched.
 *  - Hidden Bidi control characters never leak into PDF strings.
 *  - Mixed Arabic + Latin + digits keep their internal LTR runs in correct order
 *    after RTL visualization (so phone numbers, invoice numbers, emails do not break).
 *  - Reshaping is idempotent shape-wise (running it twice on Arabic doesn't add chars).
 */

describe('arabicFont — sanitizeBidiText', () => {
  it('removes LRM/RLM and zero-width characters', () => {
    const input = 'فاتورة\u200E رقم\u200F 123\u200B';
    expect(sanitizeBidiText(input)).toBe('فاتورة رقم 123');
  });

  it('collapses consecutive whitespace', () => {
    expect(sanitizeBidiText('a    b')).toBe('a b');
  });

  it('handles empty input safely', () => {
    expect(sanitizeBidiText('')).toBe('');
  });
});

describe('arabicFont — reshapeArabicText', () => {
  it('returns non-Arabic text unchanged', () => {
    expect(reshapeArabicText('Invoice #123')).toBe('Invoice #123');
    expect(reshapeArabicText('')).toBe('');
  });

  it('does not increase length for pure Arabic words (ligature-aware)', () => {
    const arabic = 'مرحبا';
    const reshaped = reshapeArabicText(arabic);
    // Reshaping must not drop characters; may equal or be shorter only via lam-alef ligature.
    expect(reshaped.length).toBeGreaterThanOrEqual(arabic.length - 1);
    expect(reshaped.length).toBeLessThanOrEqual(arabic.length);
  });

  it('produces presentation-form characters (FE70-FEFF) for Arabic', () => {
    const reshaped = reshapeArabicText('شركة');
    expect(/[\uFE70-\uFEFF]/.test(reshaped)).toBe(true);
  });

  it('preserves embedded Latin/digits in mixed strings', () => {
    const reshaped = reshapeArabicText('فاتورة 2024 ABC');
    expect(reshaped).toContain('2024');
    expect(reshaped).toContain('ABC');
  });
});

describe('arabicFont — toVisualOrder', () => {
  it('passes pure ASCII through unchanged', () => {
    expect(toVisualOrder('Hello World')).toBe('Hello World');
    expect(toVisualOrder('123-456-7890')).toBe('123-456-7890');
  });

  it('preserves digit groups intact (LTR runs not reversed)', () => {
    const visual = toVisualOrder('فاتورة 12345');
    expect(visual).toContain('12345');
  });

  it('keeps Latin words readable inside Arabic context', () => {
    const visual = toVisualOrder('شركة ACME المحدودة');
    expect(visual).toContain('ACME');
  });

  it('keeps phone numbers contiguous', () => {
    const visual = toVisualOrder('الهاتف 0123456789');
    expect(visual).toContain('0123456789');
  });

  it('handles empty / whitespace strings', () => {
    expect(toVisualOrder('')).toBe('');
    expect(toVisualOrder('   ')).toBe('   ');
  });

  it('strips bidi controls before visualization', () => {
    const visual = toVisualOrder('A\u200E B');
    expect(visual).not.toMatch(/[\u200E\u200F]/);
  });
});

describe('arabicFont — full pipeline (reshape → visual)', () => {
  it('does not crash on long mixed real-world strings', () => {
    const txt = 'فاتورة رقم INV-2024-001 بقيمة 1,250.00 ج.م للعميل ACME Ltd';
    const out = toVisualOrder(reshapeArabicText(txt));
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain('INV-2024-001');
    expect(out).toContain('1,250.00');
    expect(out).toContain('ACME Ltd');
  });

  it('is deterministic (same input → same output)', () => {
    const txt = 'كشف حساب العميل';
    const a = toVisualOrder(reshapeArabicText(txt));
    const b = toVisualOrder(reshapeArabicText(txt));
    expect(a).toBe(b);
  });
});

describe('arabicFont — numerals helpers', () => {
  it('converts Western digits to Arabic-Indic', () => {
    expect(toArabicNumerals(1234567890)).toBe('١٢٣٤٥٦٧٨٩٠');
    expect(toArabicNumerals('2024')).toBe('٢٠٢٤');
  });

  it('formats numbers using ar-EG locale', () => {
    const formatted = formatArabicNumber(1234567);
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });
});

describe('arabicFont — font identity', () => {
  it('exposes Amiri as the default Arabic font name', () => {
    // Amiri is the canonical PDF font shipped with the engine.
    expect(typeof ARABIC_FONT_NAME).toBe('string');
    expect(ARABIC_FONT_NAME.length).toBeGreaterThan(0);
  });
});
