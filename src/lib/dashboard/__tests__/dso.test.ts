import { describe, it, expect } from 'vitest';
import { computeDso } from '../dso';

describe('computeDso', () => {
  it('30,000 open ÷ 90,000 sales × 90 days = 30', () => {
    expect(computeDso({ openReceivables: 30000, periodSales: 90000, periodDays: 90 })).toBe(30);
  });
  it('returns the real value even when above 365 days', () => {
    expect(computeDso({ openReceivables: 240000, periodSales: 10000, periodDays: 90 })).toBe(2160);
  });
  it('no sales in period → null', () => {
    expect(computeDso({ openReceivables: 5000, periodSales: 0 })).toBeNull();
  });
  it('no open receivables → 0', () => {
    expect(computeDso({ openReceivables: 0, periodSales: 1000 })).toBe(0);
  });
});
