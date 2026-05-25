/**
 * Preflight validation layer (Wave 16).
 *
 * Scans an invoice payload before render to catch corrupted data,
 * boundary-violating strings, and missing assets. Pure & sync — no
 * network calls; asset reachability is verified by `verifyAssets()`.
 */
import { z } from 'zod';
import type { InvoiceHtmlData } from '../templates/InvoiceHtmlTemplate';

export interface PreflightIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface PreflightResult<T> {
  valid: boolean;
  errors: PreflightIssue[];
  warnings: PreflightIssue[];
  sanitized: T;
}

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

const invoiceLineSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().nonnegative().finite(),
  unitPrice: z.number().nonnegative().finite(),
  total: z.number().nonnegative().finite().optional(),
});

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1).max(32),
  issueDate: z.string().min(1).max(40),
  dueDate: z.string().max(40).optional(),
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
  items: z.array(invoiceLineSchema).min(1).max(5000),
  taxRate: z.number().min(0).max(1).optional(),
  discountRate: z.number().min(0).max(1).optional(),
  currency: z.string().max(8).optional(),
  notes: z.string().max(2000).optional(),
});

/** Run full preflight on invoice data. Never throws. */
export function preflightInvoice(raw: unknown): PreflightResult<InvoiceHtmlData> {
  const cleaned = deepStripBidi(raw);
  const parsed = invoiceSchema.safeParse(cleaned);
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
    return { valid: false, errors, warnings, sanitized: cleaned as InvoiceHtmlData };
  }

  const data = parsed.data as InvoiceHtmlData;

  // Layout-boundary warnings (non-fatal).
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

  if (data.items.length > 1000) {
    warnings.push({
      field: 'items',
      message: 'حجم بيانات كبير قد يبطئ التوليد — فكر في التقسيم',
      severity: 'warning',
    });
  }

  return { valid: true, errors, warnings, sanitized: data };
}

/**
 * Best-effort HEAD check for remote assets. Returns reachable map.
 * Failures are non-fatal — caller decides whether to abort.
 */
export async function verifyAssets(urls: string[], timeoutMs = 3000): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  await Promise.all(
    urls.filter(Boolean).map(async (url) => {
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), timeoutMs);
        const res = await fetch(url, { method: 'HEAD', signal: ctl.signal });
        clearTimeout(t);
        out[url] = res.ok;
      } catch {
        out[url] = false;
      }
    }),
  );
  return out;
}
