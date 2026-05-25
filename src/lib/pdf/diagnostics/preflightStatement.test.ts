import { describe, it, expect } from 'vitest';
import { preflightStatement } from './preflightStatement';

const valid = {
  statementNumber: 'ST-1',
  issueDate: '2026-05-24',
  periodFrom: '2026-05-01',
  periodTo: '2026-05-31',
  company: { name: 'Co' },
  party: { kind: 'customer' as const, name: 'X' },
  openingBalance: 0,
  transactions: [
    { date: '2026-05-05', reference: 'r1', type: 'invoice' as const, debit: 100 },
  ],
};

describe('preflightStatement', () => {
  it('accepts a minimal valid statement', () => {
    const r = preflightStatement(valid);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('rejects unknown txn type', () => {
    const r = preflightStatement({
      ...valid,
      transactions: [{ date: 'd', reference: 'r', type: 'mystery', debit: 1 }],
    });
    expect(r.valid).toBe(false);
  });

  it('warns when periodTo precedes periodFrom', () => {
    const r = preflightStatement({
      ...valid,
      periodFrom: '2026-05-31',
      periodTo: '2026-05-01',
    });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.field === 'periodTo')).toBe(true);
  });

  it('warns when a transaction has both debit and credit', () => {
    const r = preflightStatement({
      ...valid,
      transactions: [
        { date: 'd', reference: 'r', type: 'invoice' as const, debit: 1, credit: 1 },
      ],
    });
    expect(r.warnings.some((w) => w.field.startsWith('transactions['))).toBe(true);
  });
});
