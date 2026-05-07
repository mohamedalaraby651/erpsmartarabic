/**
 * Unified messages for "return quantity exceeds available" errors.
 * Used by:
 *   - CreditNoteFormDialog inline validation
 *   - DB trigger error parser (validate_credit_note_item)
 *   - validate_credit_note_before_confirm RPC error renderer
 *
 * Keep wording, units, and rounding consistent across all surfaces.
 */

const CURRENCY = 'ج.م';

/** Round to 2 decimal places using the project standard formula */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Locale-aware number formatter — strips trailing zeros, max 2 decimals */
export const fmtQty = (n: number): string => {
  const r = round2(n);
  // Whole numbers stay whole; otherwise show up to 2 decimals
  return Number.isInteger(r)
    ? r.toLocaleString('ar-EG')
    : r.toLocaleString('ar-EG', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
};

export interface OverdrawContext {
  productName?: string;
  productSku?: string;
  requested: number;
  available: number;
  originalQty?: number;
  alreadyReturned?: number;
  source?: 'client' | 'trigger' | 'precheck';
}

/** Build the canonical product label: «Name (SKU)» / «Name» / «(SKU)» */
function buildProductLabel(name?: string, sku?: string): string | null {
  const n = (name ?? '').trim();
  const s = (sku ?? '').trim();
  if (n && s) return `«${n} (${s})»`;
  if (n) return `«${n}»`;
  if (s) return `«${s}»`;
  return null;
}

/**
 * Builds the canonical error message for over-returning a quantity.
 * Always includes: requested, available, and the difference.
 * Optionally includes: original sold qty and confirmed-already-returned qty.
 */
export function formatReturnOverdraw(ctx: OverdrawContext): string {
  const requested = round2(ctx.requested);
  const available = round2(ctx.available);
  const diff = round2(Math.max(0, requested - available));

  const label = buildProductLabel(ctx.productName, ctx.productSku);
  const head = label
    ? `${label}: تجاوزت الكمية المتاحة للإرجاع`
    : 'تجاوزت الكمية المتاحة للإرجاع';

  const main = `المطلوب ${fmtQty(requested)} • المتاح ${fmtQty(available)} • الفرق ${fmtQty(diff)}`;

  const tail =
    ctx.originalQty !== undefined && ctx.alreadyReturned !== undefined
      ? ` (الأصلية ${fmtQty(ctx.originalQty)} − المُرجعة سابقاً ${fmtQty(ctx.alreadyReturned)})`
      : '';

  return `${head} — ${main}${tail}`;
}

/** Specific case: requested = 0 / negative / NaN */
export function formatInvalidQty(reason: 'nan' | 'negative' | 'zero' | 'none-available'): string {
  switch (reason) {
    case 'nan': return 'قيمة غير صالحة — أدخل رقماً صحيحاً';
    case 'negative': return 'الكمية لا يمكن أن تكون سالبة';
    case 'zero': return 'الكمية المطلوبة = 0 — أدخل قيمة أكبر من صفر';
    case 'none-available': return 'لا توجد كمية متاحة للإرجاع — تم إرجاع كل الكمية سابقاً';
  }
}

/**
 * Parses a Postgres error message from credit-note triggers/RPCs into a
 * unified Arabic message. Returns null if the message doesn't match.
 *
 * Handles both:
 *   "Quantity X exceeds returnable amount Y for invoice item Z"
 *   "Quantity X exceeds returnable amount Y for invoice item Z (original: O, already returned: A)"
 *   "Item X: returning R + already-returned A exceeds sold S"
 */
export function parseDbOverdraw(raw: string): string | null {
  // Trigger format (with extra context)
  const m1 = raw.match(
    /Quantity\s+([\d.]+)\s+exceeds returnable amount\s+([\d.]+)[^()]*(?:\(original:\s*([\d.]+),\s*already returned:\s*([\d.]+)\))?/i,
  );
  if (m1) {
    return formatReturnOverdraw({
      requested: Number(m1[1]),
      available: Number(m1[2]),
      originalQty: m1[3] ? Number(m1[3]) : undefined,
      alreadyReturned: m1[4] ? Number(m1[4]) : undefined,
      source: 'trigger',
    });
  }

  // Pre-confirm RPC format
  const m2 = raw.match(
    /Item\s+\S+:\s+returning\s+([\d.]+)\s+\+\s+already-returned\s+([\d.]+)\s+exceeds sold\s+([\d.]+)/i,
  );
  if (m2) {
    const requested = Number(m2[1]);
    const already = Number(m2[2]);
    const sold = Number(m2[3]);
    return formatReturnOverdraw({
      requested,
      available: Math.max(0, sold - already),
      originalQty: sold,
      alreadyReturned: already,
      source: 'precheck',
    });
  }

  return null;
}

export const CREDIT_NOTE_MSG = { CURRENCY };
