import { describe, it, expect } from 'vitest';
import { preflightQuotation } from './preflightQuotation';

const valid = {
  quotationNumber: 'Q-1',
  issueDate: '2026-05-25',
  validUntil: '2026-06-25',
  company: { name: 'شركة' },
  customer: { name: 'عميل' },
  items: [{ description: 'منتج', quantity: 1, unitPrice: 10 }],
};

describe('preflightQuotation', () => {
  it('accepts a valid payload', () => {
    const r = preflightQuotation(valid);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('rejects missing quotationNumber', () => {
    const r = preflightQuotation({ ...valid, quotationNumber: '' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field.includes('quotationNumber'))).toBe(true);
  });

  it('rejects empty items array', () => {
    const r = preflightQuotation({ ...valid, items: [] });
    expect(r.valid).toBe(false);
  });

  it('warns when validUntil precedes issueDate', () => {
    const r = preflightQuotation({ ...valid, validUntil: '2026-01-01' });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.field === 'validUntil')).toBe(true);
  });

  it('strips bidi markers from inputs', () => {
    const r = preflightQuotation({
      ...valid,
      customer: { name: 'X\u202EY' },
    });
    expect(r.valid).toBe(true);
    expect(r.sanitized.customer.name).toBe('XY');
  });
});
