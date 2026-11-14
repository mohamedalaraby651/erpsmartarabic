import { describe, it, expect } from 'vitest';
import { formatEGP, formatTableAmount, formatCompactEGP } from './money';

describe('EGP money display rules', () => {
  it('uses thousands separator and 2 decimals with ج.م', () => {
    expect(formatEGP(125450)).toBe('125,450.00 ج.م');
  });
  it('shows negatives with a plain minus sign', () => {
    expect(formatEGP(-1500)).toBe('-1,500.00 ج.م');
  });
  it('rounds to two decimals', () => {
    expect(formatEGP(10.005, { withSymbol: false })).toBe('10.01');
  });
  it('shows zero as a dash in tables', () => {
    expect(formatTableAmount(0)).toBe('-');
  });
  it('keeps non-zero amounts in tables', () => {
    expect(formatTableAmount(-20)).toBe('-20.00 ج.م');
  });
  it('compacts millions for KPI cards', () => {
    expect(formatCompactEGP(1452380.5)).toBe('1.45M ج.م');
  });
  it('compacts thousands for KPI cards', () => {
    expect(formatCompactEGP(850000)).toBe('850K ج.م');
  });
});
