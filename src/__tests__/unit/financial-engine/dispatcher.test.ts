import { describe, it, expect } from 'vitest';
import { resolvePostingPayload } from '@/lib/financial-engine/dispatcher';

describe('resolvePostingPayload', () => {
  it('balances invoice.approved with VAT', () => {
    const r = resolvePostingPayload('invoice.approved', {
      total_amount: 115,
      subtotal: 100,
      tax_amount: 15,
    });
    expect(r.balanced).toBe(true);
    expect(r.totalDebit).toBe(115);
    expect(r.totalCredit).toBe(115);
    expect(r.lines).toHaveLength(3);
  });

  it('omits zero-VAT line', () => {
    const r = resolvePostingPayload('invoice.approved', {
      total_amount: 100,
      subtotal: 100,
      tax_amount: 0,
    });
    expect(r.balanced).toBe(true);
    expect(r.lines).toHaveLength(2);
  });

  it('rounds amounts to 2 decimals', () => {
    const r = resolvePostingPayload('payment.received', { amount: 12.345 });
    expect(r.lines[0].amount).toBe(12.35);
    expect(r.balanced).toBe(true);
  });

  it('throws on unknown event', () => {
    expect(() => resolvePostingPayload('nope.event', {})).toThrow(/Unknown posting event/);
  });

  it('balances new goods_receipt.posted rule', () => {
    const r = resolvePostingPayload('goods_receipt.posted', { amount: 500 });
    expect(r.balanced).toBe(true);
    expect(r.totalDebit).toBe(500);
  });

  it('balances new purchase_invoice.posted rule with VAT', () => {
    const r = resolvePostingPayload('purchase_invoice.posted', {
      subtotal: 200,
      tax_amount: 30,
      total_amount: 230,
    });
    expect(r.balanced).toBe(true);
    expect(r.totalDebit).toBe(230);
    expect(r.totalCredit).toBe(230);
  });

  it('balances purchase_invoice.posted without VAT', () => {
    const r = resolvePostingPayload('purchase_invoice.posted', {
      subtotal: 200,
      tax_amount: 0,
      total_amount: 200,
    });
    expect(r.balanced).toBe(true);
    expect(r.lines).toHaveLength(2);
  });
});
