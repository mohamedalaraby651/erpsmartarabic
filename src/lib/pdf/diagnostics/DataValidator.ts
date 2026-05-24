import { z } from 'zod';
import { PdfValidationError } from './errors';

/**
 * Pre-flight validators for documents fed into the PDF engine.
 * Run BEFORE the heavy jsPDF module is loaded so failures are cheap and
 * the user gets a precise Arabic error instead of a corrupted file.
 */

const lineItem = z.object({
  name: z.string().min(1, 'اسم البند مطلوب').optional(),
  quantity: z.coerce.number().nonnegative('الكمية يجب أن تكون موجبة').optional(),
  unit_price: z.coerce.number().optional(),
  total_price: z.coerce.number().optional(),
  total: z.coerce.number().optional(),
  discount_percentage: z.coerce.number().min(0).max(100).optional(),
  products: z.object({ name: z.string().optional() }).partial().optional(),
}).passthrough();

const baseDocument = z.object({
  number: z.string().optional(),
  invoice_number: z.string().optional(),
  quotation_number: z.string().optional(),
  order_number: z.string().optional(),
  date: z.string().optional(),
  issue_date: z.string().optional(),
  created_at: z.string().optional(),
  total: z.coerce.number().optional(),
  total_amount: z.coerce.number().optional(),
  subtotal: z.coerce.number().optional(),
  tax_amount: z.coerce.number().optional(),
  discount_amount: z.coerce.number().optional(),
  items: z.array(lineItem).optional(),
}).passthrough();

export type ValidatedDocument = z.infer<typeof baseDocument>;

const TOTAL_TOLERANCE = 0.05; // EGP

export function validateDocumentForPdf(raw: unknown): ValidatedDocument {
  const parsed = baseDocument.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message);
    throw new PdfValidationError('فشل التحقّق من بيانات المستند', issues);
  }
  const doc = parsed.data;
  const issues: string[] = [];

  const hasNumber = doc.number || doc.invoice_number || doc.quotation_number || doc.order_number;
  if (!hasNumber) issues.push('رقم المستند مفقود');

  const hasDate = doc.date || doc.issue_date || doc.created_at;
  if (!hasDate) issues.push('تاريخ المستند مفقود');

  if (doc.items && doc.items.length === 0) {
    issues.push('المستند لا يحتوي على أي بنود');
  }

  // Totals sanity check (only if all parts present)
  if (
    typeof doc.subtotal === 'number' &&
    typeof doc.total === 'number'
  ) {
    const tax = doc.tax_amount ?? 0;
    const discount = doc.discount_amount ?? 0;
    const expected = doc.subtotal + tax - discount;
    if (Math.abs(expected - doc.total) > TOTAL_TOLERANCE) {
      issues.push(
        `المجموع غير متطابق: متوقع ${expected.toFixed(2)} والفعلي ${doc.total.toFixed(2)}`,
      );
    }
  }

  if (issues.length > 0) {
    throw new PdfValidationError('بيانات المستند غير مكتملة', issues);
  }

  return doc;
}

/** Soft check — returns issues array without throwing. Useful for UI badges. */
export function inspectDocument(raw: unknown): string[] {
  try {
    validateDocumentForPdf(raw);
    return [];
  } catch (e) {
    if (e instanceof PdfValidationError) return e.issues;
    return ['فشل غير معروف أثناء التحقّق'];
  }
}
