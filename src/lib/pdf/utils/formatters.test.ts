import { describe, it, expect } from 'vitest';
import {
  roundCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDateISO,
  computeLineTotal,
} from './formatters';

describe('roundCurrency', () => {
  it('rounds to 2 decimals using project standard', () => {
    expect(roundCurrency(1.005)).toBe(1.01);
    expect(roundCurrency(1.004)).toBe(1.0);
    expect(roundCurrency(0)).toBe(0);
  });
  it('handles non-finite safely', () => {
    expect(roundCurrency(Number.NaN)).toBe(0);
    expect(roundCurrency(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('formats SAR with 2 decimals by default', () => {
    const out = formatCurrency(1234.5);
    expect(out).toMatch(/1,234\.50/);
    expect(out).toMatch(/SAR/i);
  });
  it('omits symbol when requested', () => {
    expect(formatCurrency(50, { withSymbol: false })).toBe('50.00');
  });
});

describe('formatNumber + formatPercent', () => {
  it('formats number with fractionDigits', () => {
    expect(formatNumber(12.3, 2)).toBe('12.30');
    expect(formatNumber(Number.NaN)).toBe('0.00');
  });
  it('formats percent', () => {
    expect(formatPercent(15)).toBe('15.0%');
  });
});

describe('formatDateISO', () => {
  it('returns YYYY-MM-DD for valid dates', () => {
    expect(formatDateISO('2025-05-24T10:00:00Z')).toBe('2025-05-24');
  });
  it('returns empty for invalid', () => {
    expect(formatDateISO('not-a-date')).toBe('');
    expect(formatDateISO(null)).toBe('');
  });
});

describe('computeLineTotal', () => {
  it('computes subtotal, tax, and total', () => {
    const r = computeLineTotal({ unitPrice: 100, quantity: 2, taxRate: 15, discount: 20 });
    // subtotal=200, discounted=180, tax=27, total=207
    expect(r).toEqual({ subtotal: 200, tax: 27, total: 207 });
  });
  it('handles zero/missing optionals', () => {
    const r = computeLineTotal({ unitPrice: 10, quantity: 3 });
    expect(r).toEqual({ subtotal: 30, tax: 0, total: 30 });
  });
});
