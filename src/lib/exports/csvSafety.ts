/** Neutralizes spreadsheet formula injection: values starting with = + - @ tab or CR get a leading apostrophe. Numbers are left as-is. */
export function neutralizeCsvCell<T>(value: T): T | string {
  if (typeof value !== 'string') return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function neutralizeCsvRow<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k] = neutralizeCsvCell(v);
  return out as T;
}
