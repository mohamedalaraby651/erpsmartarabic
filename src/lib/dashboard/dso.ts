/** Max DSO (days) considered meaningful; beyond this the period lacks enough sales. */
export const DSO_MAX_DAYS = 365;

/**
 * Normalizes the server DSO (receivables / sales in last 90 days × 90).
 * Returns null when there were no sales in the period (server sends 0)
 * or the result is absurd (> DSO_MAX_DAYS), so the UI shows "—".
 */
export function normalizeDso(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > DSO_MAX_DAYS) return null;
  return Math.round(n);
}
