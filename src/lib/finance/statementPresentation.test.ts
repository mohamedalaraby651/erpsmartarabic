import { describe, expect, it } from 'vitest';
import { formatStatementNumber, statementBalances } from './statementPresentation';
describe('statement ledger presentation', () => {
  it('keeps the opening balance outside the date filter and authoritative closing balance', () => {
    expect(statementBalances([{ debit: 100, credit: 0, running_balance: 1100 }, { debit: 0, credit: 250, running_balance: 850 }])).toEqual({ opening: 1000, closing: 850, debit: 100, credit: 250 });
  });
  it('keeps negative balances signed and does not turn credit into debt', () => {
    expect(formatStatementNumber(-1500)).toBe('-1,500.00');
    expect(statementBalances([{ debit: 0, credit: 100, running_balance: -600 }])).toMatchObject({ opening: -500, closing: -600 });
  });
  it('shows zero as a dash', () => { expect(formatStatementNumber(0)).toBe('—'); });
  it('rounds displayed financial values to two decimal places', () => { expect(formatStatementNumber(1234.567)).toBe('1,234.57'); });
});