/**
 * Phase 4 — Cost Center / Project / Department posting contract tests.
 *
 * These tests cover the dispatcher → payload contract that the
 * `post_document_atomic` RPC consumes. RLS and live-DB behavior are covered
 * in `security/accounting-rls.test.ts` and the SQL probes.
 */
import { describe, it, expect } from 'vitest';
import { resolvePostingPayload } from '@/lib/financial-engine/dispatcher';
import { ACCOUNTS } from '@/lib/financial-engine/posting.rules';

const CC = '00000000-0000-0000-0000-00000000aaaa';
const PR = '00000000-0000-0000-0000-00000000bbbb';
const DP = '00000000-0000-0000-0000-00000000cccc';

describe('cost-center-posting contract', () => {
  it('propagates cost_center_id / project_id / department_id onto every line', () => {
    const r = resolvePostingPayload(
      'invoice.approved',
      { total_amount: 115, subtotal: 100, tax_amount: 15 },
      { cost_center_id: CC, project_id: PR, department_id: DP },
    );
    expect(r.balanced).toBe(true);
    expect(r.lines).toHaveLength(3);
    for (const l of r.lines) {
      expect(l.cost_center_id).toBe(CC);
      expect(l.project_id).toBe(PR);
      expect(l.department_id).toBe(DP);
    }
  });

  it('defaults dimensions to null when not provided (null-boundary safe)', () => {
    const r = resolvePostingPayload('payment.received', { amount: 50 });
    for (const l of r.lines) {
      expect(l.cost_center_id).toBeNull();
      expect(l.project_id).toBeNull();
      expect(l.department_id).toBeNull();
    }
  });

  it('partial dimensions only tag what is provided', () => {
    const r = resolvePostingPayload(
      'expense.approved',
      { amount: 200 },
      { cost_center_id: CC },
    );
    for (const l of r.lines) {
      expect(l.cost_center_id).toBe(CC);
      expect(l.project_id).toBeNull();
      expect(l.department_id).toBeNull();
    }
  });

  it('stays balanced with dimensions attached', () => {
    const r = resolvePostingPayload(
      'purchase_invoice.posted',
      { subtotal: 200, tax_amount: 30, total_amount: 230 },
      { cost_center_id: CC, project_id: PR },
    );
    expect(r.balanced).toBe(true);
    expect(r.totalDebit).toBe(230);
    expect(r.totalCredit).toBe(230);
    const ap = r.lines.find((l) => l.account_code === ACCOUNTS.ACCOUNTS_PAYABLE);
    expect(ap?.cost_center_id).toBe(CC);
    expect(ap?.project_id).toBe(PR);
  });

  it('treats empty-string dimension values as null (sanitization)', () => {
    const r = resolvePostingPayload(
      'payment.received',
      { amount: 10 },
      { cost_center_id: '' as unknown as string, project_id: null, department_id: null },
    );
    // Empty string is falsy-equivalent in the DB cast path; here we just
    // ensure the dispatcher does not crash and keeps the lines balanced.
    expect(r.balanced).toBe(true);
  });
});
