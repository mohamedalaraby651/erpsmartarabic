export interface StatementBalanceEntry {
  debit: number;
  credit: number;
  running_balance: number;
}
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Uses the ledger-provided running balance; never rebuilds the selected period from zero. */
export function statementBalances(entries: readonly StatementBalanceEntry[]) {
  const first = entries[0];
  const last = entries.at(-1);
  const opening = first ? round2(Number(first.running_balance) - Number(first.debit) + Number(first.credit)) : 0;
  return {
    opening,
    closing: last ? round2(Number(last.running_balance)) : opening,
    debit: round2(entries.reduce((sum, entry) => sum + Number(entry.debit), 0)),
    credit: round2(entries.reduce((sum, entry) => sum + Number(entry.credit), 0)),
  };
}

export function formatStatementNumber(value: number) {
  const amount = round2(Number.isFinite(value) ? value : 0);
  return amount === 0 ? '—' : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}