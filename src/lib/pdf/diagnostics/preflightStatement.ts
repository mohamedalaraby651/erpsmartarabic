/**
 * Preflight validator for statement of account payloads (Wave 24).
 */
import { z } from 'zod';
import type { StatementHtmlData } from '../templates/StatementHtmlTemplate';
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

const txnSchema = z.object({
  date: z.string().min(1).max(40),
  reference: z.string().min(1).max(64),
  type: z.enum(['invoice', 'payment', 'credit_note', 'debit_note', 'opening']),
  description: z.string().max(500).optional(),
  debit: z.number().nonnegative().finite().optional(),
  credit: z.number().nonnegative().finite().optional(),
});

const agingSchema = z.object({
  current: z.number().finite(),
  d1_30: z.number().finite(),
  d31_60: z.number().finite(),
  d61_90: z.number().finite(),
  d90Plus: z.number().finite(),
});

const statementSchema = z.object({
  statementNumber: z.string().min(1).max(40),
  issueDate: z.string().min(1).max(40),
  periodFrom: z.string().min(1).max(40),
  periodTo: z.string().min(1).max(40),
  company: z.object({
    name: z.string().min(1).max(200),
    address: z.string().max(400).optional(),
    taxNumber: z.string().max(40).optional(),
    phone: z.string().max(40).optional(),
    logoUrl: z.string().url().optional(),
  }),
  party: z.object({
    kind: z.enum(['customer', 'supplier']),
    name: z.string().min(1).max(200),
    address: z.string().max(400).optional(),
    taxNumber: z.string().max(40).optional(),
    accountCode: z.string().max(40).optional(),
  }),
  openingBalance: z.number().finite(),
  transactions: z.array(txnSchema).max(10000),
  aging: agingSchema.optional(),
  currency: z.string().max(8).optional(),
  notes: z.string().max(2000).optional(),
});

export function preflightStatement(raw: unknown): PreflightResult<StatementHtmlData> {
  const cleaned = deepStripBidi(raw);
  const parsed = statementSchema.safeParse(cleaned);
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
    return { valid: false, errors, warnings, sanitized: cleaned as StatementHtmlData };
  }

  const data = parsed.data as StatementHtmlData;

  if (data.periodFrom && data.periodTo) {
    const f = Date.parse(data.periodFrom);
    const t = Date.parse(data.periodTo);
    if (!Number.isNaN(f) && !Number.isNaN(t) && t < f) {
      warnings.push({
        field: 'periodTo',
        message: 'نهاية الفترة قبل بدايتها',
        severity: 'warning',
      });
    }
  }

  for (let i = 0; i < data.transactions.length; i++) {
    const t = data.transactions[i];
    if ((t.debit ?? 0) > 0 && (t.credit ?? 0) > 0) {
      warnings.push({
        field: `transactions[${i}]`,
        message: 'الحركة تحتوي على مدين ودائن في نفس الوقت',
        severity: 'warning',
      });
    }
  }

  if (data.transactions.length > 500) {
    warnings.push({
      field: 'transactions',
      message: 'عدد الحركات كبير، قد يستغرق التصدير وقتاً أطول',
      severity: 'warning',
    });
  }

  return { valid: true, errors, warnings, sanitized: data };
}
