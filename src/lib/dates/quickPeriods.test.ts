import { describe, it, expect } from 'vitest';
import { getQuickPeriodRange } from './quickPeriods';

const now = new Date(2026, 10, 14); // 14 Nov 2026

describe('getQuickPeriodRange', () => {
  it('today', () => expect(getQuickPeriodRange('today', now)).toEqual({ from: '2026-11-14', to: '2026-11-14' }));
  it('month', () => expect(getQuickPeriodRange('month', now)).toEqual({ from: '2026-11-01', to: '2026-11-30' }));
  it('quarter', () => expect(getQuickPeriodRange('quarter', now)).toEqual({ from: '2026-10-01', to: '2026-12-31' }));
  it('year', () => expect(getQuickPeriodRange('year', now)).toEqual({ from: '2026-01-01', to: '2026-12-31' }));
  it('february leap year month end', () =>
    expect(getQuickPeriodRange('month', new Date(2028, 1, 10)).to).toBe('2028-02-29'));
});
