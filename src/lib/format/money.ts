/**
 * EGP money display rules (PRB-NAZRA-002 §9):
 *  - Egyptian Pound only, suffix "ج.م", thousands separator, 2 decimals (290).
 *  - Negative values use a plain minus sign: -1,500.00 ج.م (333).
 *  - Table cells show zero as "-" (310).
 *  - KPI cards use compact form 1.45M / 850K with full value in a tooltip (335).
 * Rounding follows Math.round(v * 100) / 100.
 */
export const EGP_SUFFIX = 'ج.م';

export function roundMoney(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function grouped(value: number, digits = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** 125450.5 → "125,450.50 ج.م" ; -1500 → "-1,500.00 ج.م" */
export function formatEGP(value: number, opts: { withSymbol?: boolean } = {}): string {
  const v = roundMoney(value);
  const text = (v < 0 ? '-' : '') + grouped(Math.abs(v));
  return opts.withSymbol === false ? text : `${text} ${EGP_SUFFIX}`;
}

/** Table cell: zero (or empty) renders as "-". */
export function formatTableAmount(value: number | null | undefined, opts: { withSymbol?: boolean } = {}): string {
  if (value === null || value === undefined || roundMoney(value) === 0) return '-';
  return formatEGP(value, opts);
}

/** KPI card: 1452380.5 → "1.45M ج.م", 850000 → "850K ج.م". */
export function formatCompactEGP(value: number): string {
  const v = roundMoney(value);
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, '');
  let body: string;
  if (abs >= 1_000_000_000) body = `${trim(abs / 1_000_000_000)}B`;
  else if (abs >= 1_000_000) body = `${trim(abs / 1_000_000)}M`;
  else if (abs >= 1_000) body = `${trim(abs / 1_000)}K`;
  else body = grouped(abs, abs % 1 === 0 ? 0 : 2);
  return `${sign}${body} ${EGP_SUFFIX}`;
}
