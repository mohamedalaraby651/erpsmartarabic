import { describe, it, expect } from 'vitest';
import {
  computeStatementTotals,
  renderStatementHtml,
  STATEMENT_HTML_CSS,
  type StatementHtmlData,
} from './StatementHtmlTemplate';

const baseData: StatementHtmlData = {
  statementNumber: 'ST-2026-05',
  issueDate: '2026-05-24',
  periodFrom: '2026-05-01',
  periodTo: '2026-05-31',
  company: { name: 'شركتي', taxNumber: '300999999' },
  party: { kind: 'customer', name: 'العميل التجريبي', accountCode: 'C-001' },
  openingBalance: 1000,
  transactions: [
    { date: '2026-05-05', reference: 'INV-1', type: 'invoice', debit: 500 },
    { date: '2026-05-10', reference: 'PMT-1', type: 'payment', credit: 300 },
    { date: '2026-05-15', reference: 'INV-2', type: 'invoice', debit: 200 },
  ],
  aging: { current: 100, d1_30: 200, d31_60: 300, d61_90: 400, d90Plus: 400 },
  currency: 'EGP',
};

describe('StatementHtmlTemplate', () => {
  it('computes running balance, totals, and closing balance', () => {
    const t = computeStatementTotals(baseData);
    expect(t.totalDebit).toBe(700);
    expect(t.totalCredit).toBe(300);
    expect(t.closingBalance).toBe(1400);
    expect(t.rows.map((r) => r.balance)).toEqual([1500, 1200, 1400]);
  });

  it('handles negative running balances and zero opening', () => {
    const t = computeStatementTotals({
      ...baseData,
      openingBalance: 0,
      transactions: [
        { date: 'd', reference: 'r1', type: 'payment', credit: 100 },
      ],
    });
    expect(t.closingBalance).toBe(-100);
  });

  it('renders Arabic labels, opening row, aging buckets and closing balance', () => {
    const html = renderStatementHtml(baseData);
    expect(html).toContain('كشف حساب العميل');
    expect(html).toContain('رصيد افتتاحي');
    expect(html).toContain('1,400.00');
    expect(html).toContain('1-30 يوم');
    expect(html).toContain('C-001');
  });

  it('uses supplier label when party.kind=supplier', () => {
    const html = renderStatementHtml({
      ...baseData,
      party: { ...baseData.party, kind: 'supplier' },
    });
    expect(html).toContain('كشف حساب المورد');
  });

  it('exports CSS with statement brand color', () => {
    expect(STATEMENT_HTML_CSS).toContain('#5a2a82');
  });
});
