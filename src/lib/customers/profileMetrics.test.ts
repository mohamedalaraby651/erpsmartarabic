import { describe, it, expect } from 'vitest';
import { creditUsePercent, computeProfileMetrics, overdueDays, buildSummarySentence } from './profileMetrics';

const now = new Date('2026-11-27T00:00:00Z').getTime();
const inv = (o: Partial<Parameters<typeof overdueDays>[0]>) => ({ id: 'x', total_amount: 0, paid_amount: 0, due_date: null, created_at: '2026-11-27T00:00:00Z', ...o });

describe('profile metrics', () => {
  it('credit use = outstanding / credit limit', () => {
    expect(creditUsePercent(4000, 30000)).toBe(13);
    expect(creditUsePercent(4000, 0)).toBeNull();
  });
  it('overdue days from due date', () => {
    expect(overdueDays(inv({ due_date: '2026-09-25' }), now)).toBe(63);
    expect(overdueDays(inv({ due_date: '2026-12-30' }), now)).toBe(0);
  });
  it('outstanding ignores cancelled and paid invoices', () => {
    const m = computeProfileMetrics([
      inv({ total_amount: 1000, paid_amount: 200, due_date: '2026-09-25' }),
      inv({ total_amount: 500, paid_amount: 500 }),
      inv({ total_amount: 900, status: 'cancelled' }),
    ], now);
    expect(m.outstanding).toBe(800);
    expect(m.openCount).toBe(1);
    expect(m.over60Amount).toBe(800);
    expect(m.oldestOverdueDays).toBe(63);
  });
  it('summary sentence', () => {
    expect(buildSummarySentence({ name: 'أحمد', outstanding: 10, openCount: 2, lastPayment: null, oldestOverdueDays: 0, fmt: String }))
      .toBe('أحمد مدين بـ 10 على 2 فواتير. لا توجد دفعات مسجلة.');
  });
});
