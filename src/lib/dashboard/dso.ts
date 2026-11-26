/** Days in the DSO measurement period. */
export const DSO_PERIOD_DAYS = 90;

/**
 * DSO = (open receivables ÷ total sales in the period) × period days.
 * Returns null when there are no sales in the period (UI shows "—").
 */
export function computeDso(input: { openReceivables: number; periodSales: number; periodDays?: number }): number | null {
  const ar = Number(input.openReceivables);
  const sales = Number(input.periodSales);
  const days = input.periodDays ?? DSO_PERIOD_DAYS;
  if (!Number.isFinite(ar) || !Number.isFinite(sales) || sales <= 0 || ar < 0) return null;
  const v = (ar / sales) * days;
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
}
