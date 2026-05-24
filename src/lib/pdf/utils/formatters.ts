/**
 * Locale-aware formatters used inside PDF templates.
 *
 * Rationale:
 *  - Arabic UI uses Western (Latin) digits across the app for parity with
 *    accounting exports — we do NOT switch to Eastern Arabic digits.
 *  - Currency defaults to SAR with 2 decimals (matches Financial Precision standard).
 *  - All numeric helpers go through `roundCurrency` to enforce the
 *    project-wide rounding rule: Math.round(value * 100) / 100.
 */

export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_CURRENCY = 'SAR';

export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export interface FormatCurrencyOptions {
  currency?: string;
  locale?: string;
  withSymbol?: boolean;
}

export function formatCurrency(value: number, opts: FormatCurrencyOptions = {}): string {
  const v = roundCurrency(Number(value) || 0);
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const currency = opts.currency ?? DEFAULT_CURRENCY;
  if (opts.withSymbol === false) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export function formatNumber(value: number, fractionDigits = 2, locale = DEFAULT_LOCALE): string {
  const v = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(v);
}

export function formatPercent(value: number, fractionDigits = 1, locale = DEFAULT_LOCALE): string {
  const v = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(v / 100);
}

export function formatDateISO(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  // Use ISO date — locale-independent, safe in RTL/LTR PDFs.
  return d.toISOString().slice(0, 10);
}

/** Compute "sum + tax(15%) − discount" rounded. */
export function computeLineTotal(args: {
  unitPrice: number;
  quantity: number;
  taxRate?: number;
  discount?: number;
}): { subtotal: number; tax: number; total: number } {
  const subtotal = roundCurrency((Number(args.unitPrice) || 0) * (Number(args.quantity) || 0));
  const discounted = roundCurrency(subtotal - (Number(args.discount) || 0));
  const tax = roundCurrency(discounted * ((Number(args.taxRate) || 0) / 100));
  const total = roundCurrency(discounted + tax);
  return { subtotal, tax, total };
}
