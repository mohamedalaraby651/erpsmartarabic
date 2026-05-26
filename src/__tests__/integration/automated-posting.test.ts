/**
 * Integration test for the automated posting pipeline.
 *
 * These tests exercise the pure dispatcher + posting rules end-to-end against
 * the in-memory rule registry. Live database round-trips for `post_document_atomic`
 * are covered by the `security/accounting-rls.test.ts` suite (Phase 1) and by
 * the dedicated SQL probes; here we focus on contract guarantees that prevent
 * regressions in the rule → payload translation layer that the Edge Functions
 * rely on at runtime.
 */
import { describe, it, expect } from 'vitest';
import { resolvePostingPayload } from '@/lib/financial-engine/dispatcher';
import { POSTING_RULES, ACCOUNTS } from '@/lib/financial-engine/posting.rules';

describe('automated-posting pipeline contract', () => {
  it('invoice lifecycle: approve → payment leaves AR net zero in aggregate', () => {
    const invoice = resolvePostingPayload('invoice.approved', {
      total_amount: 230,
      subtotal: 200,
      tax_amount: 30,
    });
    const payment = resolvePostingPayload('payment.received', { amount: 230 });

    expect(invoice.balanced).toBe(true);
    expect(payment.balanced).toBe(true);

    const arDr = invoice.lines.filter((l) => l.account_code === ACCOUNTS.ACCOUNTS_RECEIVABLE && l.side === 'debit')
      .reduce((s, l) => s + l.amount, 0);
    const arCr = payment.lines.filter((l) => l.account_code === ACCOUNTS.ACCOUNTS_RECEIVABLE && l.side === 'credit')
      .reduce((s, l) => s + l.amount, 0);
    expect(arDr - arCr).toBeCloseTo(0, 2);
  });

  it('every registered rule is internally balanced for canonical context', () => {
    const ctx = { total_amount: 100, subtotal: 100, tax_amount: 0, amount: 100 };
    for (const event of Object.keys(POSTING_RULES)) {
      const r = resolvePostingPayload(event, ctx);
      expect(r.balanced, `rule ${event} unbalanced`).toBe(true);
      expect(r.lines.length, `rule ${event} produced <2 lines`).toBeGreaterThanOrEqual(2);
    }
  });

  it('credit note reverses sales revenue + AR exactly', () => {
    const cn = resolvePostingPayload('credit_note.approved', { amount: 100 });
    expect(cn.balanced).toBe(true);
    const sr = cn.lines.find((l) => l.account_code === ACCOUNTS.SALES_RETURNS);
    const ar = cn.lines.find((l) => l.account_code === ACCOUNTS.ACCOUNTS_RECEIVABLE);
    expect(sr?.side).toBe('debit');
    expect(ar?.side).toBe('credit');
    expect(sr?.amount).toBe(ar?.amount);
  });

  it('GR/IR clearing closes between goods_receipt and purchase_invoice', () => {
    const gr = resolvePostingPayload('goods_receipt.posted', { amount: 500 });
    const pi = resolvePostingPayload('purchase_invoice.posted', {
      subtotal: 500,
      tax_amount: 0,
      total_amount: 500,
    });
    const grIrCr = gr.lines.find((l) => l.account_code === ACCOUNTS.GR_IR_CLEARING && l.side === 'credit')?.amount ?? 0;
    const grIrDr = pi.lines.find((l) => l.account_code === ACCOUNTS.GR_IR_CLEARING && l.side === 'debit')?.amount ?? 0;
    expect(grIrCr).toBe(grIrDr);
  });

  it('refuses unknown events at the dispatcher boundary (defensive)', () => {
    expect(() => resolvePostingPayload('garbage.event', {})).toThrow();
  });
});
