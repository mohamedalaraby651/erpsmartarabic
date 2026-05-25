/**
 * Preflight validator for purchase order payloads (Wave 24).
 */
import { z } from 'zod';
import type { PurchaseOrderHtmlData } from '../templates/PurchaseOrderHtmlTemplate';
import type { PreflightIssue, PreflightResult } from './preflightValidator';

const BIDI_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const stripBidi = (s: string) => s.replace(BIDI_RE, '');

function deepStripBidi<T>(v: T): T {
  if (typeof v === 'string') return stripBidi(v) as unknown as T;
  if (Array.isArray(v)) return v.map(deepStripBidi) as unknown as T;
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) o[k] = deepStripBidi(val);
    return o as unknown as T;
  }
  return v;
}

const lineSchema = z.object({
  description: z.string().min(1).max(500),
  sku: z.string().max(64).optional(),
  quantity: z.number().nonnegative().finite(),
  unitPrice: z.number().nonnegative().finite(),
  total: z.number().nonnegative().finite().optional(),
});

const poSchema = z.object({
  orderNumber: z.string().min(1).max(32),
  issueDate: z.string().min(1).max(40),
  expectedDeliveryDate: z.string().max(40).optional(),
  buyer: z.object({
    name: z.string().min(1).max(200),
    address: z.string().max(400).optional(),
    taxNumber: z.string().max(40).optional(),
    phone: z.string().max(40).optional(),
    logoUrl: z.string().url().optional(),
  }),
  supplier: z.object({
    name: z.string().min(1).max(200),
    address: z.string().max(400).optional(),
    taxNumber: z.string().max(40).optional(),
    contact: z.string().max(120).optional(),
  }),
  shippingAddress: z.string().max(400).optional(),
  items: z.array(lineSchema).min(1).max(5000),
  taxRate: z.number().min(0).max(1).optional(),
  discountRate: z.number().min(0).max(1).optional(),
  currency: z.string().max(8).optional(),
  paymentTerms: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

export function preflightPurchaseOrder(
  raw: unknown,
): PreflightResult<PurchaseOrderHtmlData> {
  const cleaned = deepStripBidi(raw);
  const parsed = poSchema.safeParse(cleaned);
  const errors: PreflightIssue[] = [];
  const warnings: PreflightIssue[] = [];

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({
        field: issue.path.join('.') || '(root)',
        message: issue.message,
        severity: 'error',
      });
    }
    return { valid: false, errors, warnings, sanitized: cleaned as PurchaseOrderHtmlData };
  }

  const data = parsed.data as PurchaseOrderHtmlData;

  for (let i = 0; i < data.items.length; i++) {
    const it = data.items[i];
    const computed = it.quantity * it.unitPrice;
    if (it.total != null && Math.abs(it.total - computed) > 0.01) {
      warnings.push({
        field: `items[${i}].total`,
        message: `الإجمالي المخزن (${it.total}) لا يطابق الكمية×السعر (${computed})`,
        severity: 'warning',
      });
    }
  }

  if (data.expectedDeliveryDate && data.issueDate) {
    const ed = Date.parse(data.expectedDeliveryDate);
    const is = Date.parse(data.issueDate);
    if (!Number.isNaN(ed) && !Number.isNaN(is) && ed < is) {
      warnings.push({
        field: 'expectedDeliveryDate',
        message: 'تاريخ التسليم المتوقع قبل تاريخ الإصدار',
        severity: 'warning',
      });
    }
  }

  return { valid: true, errors, warnings, sanitized: data };
}
