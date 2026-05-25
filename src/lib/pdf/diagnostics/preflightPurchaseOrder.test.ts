import { describe, it, expect } from 'vitest';
import { preflightPurchaseOrder } from './preflightPurchaseOrder';

const valid = {
  orderNumber: 'PO-1',
  issueDate: '2026-05-24',
  buyer: { name: 'B' },
  supplier: { name: 'S' },
  items: [{ description: 'x', quantity: 2, unitPrice: 5 }],
};

describe('preflightPurchaseOrder', () => {
  it('accepts a minimal valid payload', () => {
    const r = preflightPurchaseOrder(valid);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('rejects empty items array', () => {
    const r = preflightPurchaseOrder({ ...valid, items: [] });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field.includes('items'))).toBe(true);
  });

  it('warns when stored total mismatches qty×price', () => {
    const r = preflightPurchaseOrder({
      ...valid,
      items: [{ description: 'x', quantity: 2, unitPrice: 5, total: 99 }],
    });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.field.includes('total'))).toBe(true);
  });

  it('warns when expected delivery is before issue date', () => {
    const r = preflightPurchaseOrder({
      ...valid,
      expectedDeliveryDate: '2026-05-01',
    });
    expect(r.warnings.some((w) => w.field === 'expectedDeliveryDate')).toBe(true);
  });

  it('strips bidi markers from string fields', () => {
    const r = preflightPurchaseOrder({
      ...valid,
      buyer: { name: 'B\u202Eevil' },
    });
    expect(r.valid).toBe(true);
    expect(r.sanitized.buyer.name).toBe('Bevil');
  });
});
