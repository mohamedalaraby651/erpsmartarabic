/**
 * Preflight validator for quotation payloads (Wave 23).
 * Mirrors `preflightInvoice` semantics: zod schema, bidi strip,
 * non-fatal layout warnings.
 */
import { z } from 'zod';
import type { QuotationHtmlData } from '../templates/QuotationHtmlTemplate';
import type { PreflightIssue, PreflightResult } from './preflightValidator';

const BIDI_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

function stripBidi(s: string): string {
  return s.replace(BIDI_RE, '');
}

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

const quotationLineSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().nonnegative().finite(),
  unitPrice: z.number().nonnegative().finite(),
  total: z.number().nonnegative().finite().optional(),
});

const quotationSchema = z.object({
  quotationNumber: z.string().min(1).max(32),
  issueDate: z.string().min(1).max(40),
  validUntil: z.string().max(40).optional(),
  company: z.object({
    name: z.string().min(1).max(200),
    address: z.string().max(400).optional(),
    taxNumber: z.string().max(40).optional(),
    phone: z.string().max(40).optional(),
    logoUrl: z.string().url().optional(),
  }),
  customer: z.object({
    name: z.string().min(1).max(200),
    address: z.string().max(400).optional(),
    taxNumber: z.string().max(40).optional(),
  }),
  items: z.array(quotationLineSchema).min(1).max(5000),
  taxRate: z.number().min(0).max(1).optional(),
  discountRate: z.number().min(0).max(1).optional(),
  currency: z.string().max(8).optional(),
  paymentTerms: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

export function preflightQuotation(raw: unknown): PreflightResult<QuotationHtmlData> {
  const cleaned = deepStripBidi(raw);
  const parsed = quotationSchema.safeParse(cleaned);
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
    return { valid: false, errors, warnings, sanitized: cleaned as QuotationHtmlData };
  }

  const data = parsed.data as QuotationHtmlData;

  for (let i = 0; i < data.items.length; i++) {
    const it = data.items[i];
    if (it.description.length > 200) {
      warnings.push({
        field: `items[${i}].description`,
        message: 'وصف طويل قد يسبب التفاف نص داخل الخلية',
        severity: 'warning',
      });
    }
    const computed = it.quantity * it.unitPrice;
    if (it.total != null && Math.abs(it.total - computed) > 0.01) {
      warnings.push({
        field: `items[${i}].total`,
        message: `الإجمالي المخزن (${it.total}) لا يطابق الكمية×السعر (${computed})`,
        severity: 'warning',
      });
    }
  }

  // Warn if validUntil is in the past relative to issueDate.
  if (data.validUntil && data.issueDate) {
    const iv = Date.parse(data.validUntil);
    const is = Date.parse(data.issueDate);
    if (!Number.isNaN(iv) && !Number.isNaN(is) && iv < is) {
      warnings.push({
        field: 'validUntil',
        message: 'تاريخ انتهاء الصلاحية قبل تاريخ الإصدار',
        severity: 'warning',
      });
    }
  }

  return { valid: true, errors, warnings, sanitized: data };
}
