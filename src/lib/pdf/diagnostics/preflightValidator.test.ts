import { describe, it, expect, vi } from 'vitest';
import { preflightInvoice, verifyAssets } from './preflightValidator';

const baseInvoice = {
  invoiceNumber: 'INV-001',
  issueDate: '2026-05-25',
  company: { name: 'شركة الاختبار' },
  customer: { name: 'العميل الأول' },
  items: [{ description: 'منتج', quantity: 2, unitPrice: 50 }],
};

describe('preflightInvoice', () => {
  it('passes a valid payload', () => {
    const r = preflightInvoice(baseInvoice);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('reports errors on missing required fields', () => {
    const r = preflightInvoice({ ...baseInvoice, company: { name: '' } });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field.includes('company.name'))).toBe(true);
  });

  it('rejects negative quantities', () => {
    const r = preflightInvoice({
      ...baseInvoice,
      items: [{ description: 'x', quantity: -1, unitPrice: 10 }],
    });
    expect(r.valid).toBe(false);
  });

  it('strips invisible bidi markers', () => {
    const r = preflightInvoice({
      ...baseInvoice,
      customer: { name: 'علي\u202Eمحمد' },
    });
    expect(r.valid).toBe(true);
    expect(r.sanitized.customer.name).toBe('عليمحمد');
  });

  it('warns on long descriptions', () => {
    const long = 'ا'.repeat(250);
    const r = preflightInvoice({
      ...baseInvoice,
      items: [{ description: long, quantity: 1, unitPrice: 10 }],
    });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.field.includes('description'))).toBe(true);
  });

  it('warns on mismatched precomputed totals', () => {
    const r = preflightInvoice({
      ...baseInvoice,
      items: [{ description: 'x', quantity: 2, unitPrice: 10, total: 999 }],
    });
    expect(r.warnings.some((w) => w.field.includes('total'))).toBe(true);
  });

  it('rejects invalid logo URL', () => {
    const r = preflightInvoice({
      ...baseInvoice,
      company: { name: 'x', logoUrl: 'not-a-url' },
    });
    expect(r.valid).toBe(false);
  });
});

describe('verifyAssets', () => {
  it('returns false for unreachable URLs without throwing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('nope'));
    const r = await verifyAssets(['https://example.invalid/x.png']);
    expect(r['https://example.invalid/x.png']).toBe(false);
    fetchSpy.mockRestore();
  });

  it('returns true on 200 OK', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    const r = await verifyAssets(['https://example.com/x.png']);
    expect(r['https://example.com/x.png']).toBe(true);
    fetchSpy.mockRestore();
  });
});
