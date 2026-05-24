import { describe, it, expect } from 'vitest';
import { validateDocumentForPdf, inspectDocument } from './DataValidator';
import { PdfValidationError } from './errors';

describe('validateDocumentForPdf', () => {
  it('accepts a minimal valid document', () => {
    const doc = {
      invoice_number: 'INV-1',
      date: '2026-01-01',
      items: [{ name: 'item', quantity: 1, unit_price: 10, total_price: 10 }],
    };
    expect(() => validateDocumentForPdf(doc)).not.toThrow();
  });

  it('rejects missing document number', () => {
    expect(() => validateDocumentForPdf({ date: '2026-01-01', items: [{}] }))
      .toThrow(PdfValidationError);
  });

  it('rejects empty items array', () => {
    expect(() =>
      validateDocumentForPdf({ invoice_number: 'X', date: '2026-01-01', items: [] }),
    ).toThrow(PdfValidationError);
  });

  it('flags total mismatch beyond tolerance', () => {
    const issues = inspectDocument({
      invoice_number: 'X',
      date: '2026-01-01',
      items: [{}],
      subtotal: 100,
      tax_amount: 14,
      discount_amount: 0,
      total: 200, // wrong on purpose
    });
    expect(issues.some((i) => i.includes('المجموع'))).toBe(true);
  });

  it('passes when totals balance within tolerance', () => {
    expect(() =>
      validateDocumentForPdf({
        invoice_number: 'X',
        date: '2026-01-01',
        items: [{}],
        subtotal: 100,
        tax_amount: 14,
        discount_amount: 0,
        total: 114.01,
      }),
    ).not.toThrow();
  });
});
