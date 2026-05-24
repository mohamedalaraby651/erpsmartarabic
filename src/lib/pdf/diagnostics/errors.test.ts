import { describe, it, expect } from 'vitest';
import {
  PdfValidationError,
  PdfEngineError,
  PdfFontLoadError,
  PdfTimeoutError,
  isPdfError,
  toArabicErrorMessage,
} from './errors';

describe('PDF error classes', () => {
  it('PdfValidationError carries issues', () => {
    const e = new PdfValidationError('bad', ['a', 'b']);
    expect(e.issues).toEqual(['a', 'b']);
    expect(isPdfError(e)).toBe(true);
  });

  it('PdfFontLoadError keeps font key', () => {
    const e = new PdfFontLoadError('amiri', 'missing');
    expect(e.fontKey).toBe('amiri');
  });

  it('PdfTimeoutError includes ms', () => {
    const e = new PdfTimeoutError(30000);
    expect(e.timeoutMs).toBe(30000);
  });

  it('isPdfError returns false for plain errors', () => {
    expect(isPdfError(new Error('x'))).toBe(false);
  });

  describe('toArabicErrorMessage', () => {
    it('produces Arabic message for validation errors', () => {
      const m = toArabicErrorMessage(new PdfValidationError('x', ['رقم المستند مفقود']));
      expect(m).toContain('رقم المستند مفقود');
    });
    it('produces Arabic message for font load errors', () => {
      const m = toArabicErrorMessage(new PdfFontLoadError('amiri', 'x'));
      expect(m).toContain('الخط');
    });
    it('produces Arabic message for timeout errors', () => {
      const m = toArabicErrorMessage(new PdfTimeoutError(5000));
      expect(m).toContain('وقتًا');
    });
    it('produces Arabic message for engine errors', () => {
      const m = toArabicErrorMessage(new PdfEngineError('boom'));
      expect(m).toContain('تعذّر');
    });
    it('falls back to a generic Arabic message', () => {
      const m = toArabicErrorMessage(new Error('something'));
      expect(m.length).toBeGreaterThan(0);
    });
  });
});
