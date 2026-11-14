/** PRB-NAZRA-002: quick report periods (today / month / quarter / year). Dates as local YYYY-MM-DD. */
export type QuickPeriod = 'today' | 'month' | 'quarter' | 'year';

export const QUICK_PERIOD_LABELS: Record<QuickPeriod, string> = {
  today: 'اليوم',
  month: 'هذا الشهر',
  quarter: 'هذا الربع',
  year: 'هذه السنة',
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function getQuickPeriodRange(period: QuickPeriod, now: Date = new Date()): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case 'today':
      return { from: iso(now), to: iso(now) };
    case 'month':
      return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case 'quarter': {
      const q = Math.floor(m / 3) * 3;
      return { from: iso(new Date(y, q, 1)), to: iso(new Date(y, q + 3, 0)) };
    }
    case 'year':
      return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) };
  }
}
