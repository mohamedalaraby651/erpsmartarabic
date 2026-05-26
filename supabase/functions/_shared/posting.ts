// Shared posting helper for Edge Functions.
// Mirrors the browser dispatcher: builds a balanced payload and calls
// `post_document_atomic` via the service-role client (tenant_id passed in context).

export type PostingSide = 'debit' | 'credit';

export interface PostingLine {
  account_code: string;
  side: PostingSide;
  amount: number;
  memo?: string;
}

export interface RuleLineSpec {
  account_code: string;
  side: PostingSide;
  amount: (ctx: Record<string, number>) => number;
  memo?: string;
}

export interface RuleSpec {
  description: string;
  lines: RuleLineSpec[];
}

const round2 = (n: number): number => Math.round(Number(n) * 100) / 100;

// Mirror of src/lib/financial-engine/posting.rules.ts — keep in sync.
export const ACCOUNTS = {
  CASH: '1010',
  BANK: '1020',
  ACCOUNTS_RECEIVABLE: '1100',
  INVENTORY: '1200',
  GR_IR_CLEARING: '1250',
  TAX_INPUT: '1290',
  ACCOUNTS_PAYABLE: '2100',
  TAX_PAYABLE: '2200',
  SALES_REVENUE: '4000',
  SALES_RETURNS: '4100',
  COST_OF_GOODS_SOLD: '5000',
  INVENTORY_ADJUSTMENT: '5100',
  OPERATING_EXPENSES: '6000',
} as const;

export const RULES: Record<string, RuleSpec> = {
  'invoice.approved': {
    description: 'Customer invoice approved',
    lines: [
      { account_code: ACCOUNTS.ACCOUNTS_RECEIVABLE, side: 'debit',  amount: (c) => c.total_amount, memo: 'AR — invoice' },
      { account_code: ACCOUNTS.SALES_REVENUE,       side: 'credit', amount: (c) => c.subtotal,     memo: 'Sales revenue' },
      { account_code: ACCOUNTS.TAX_PAYABLE,         side: 'credit', amount: (c) => c.tax_amount || 0, memo: 'VAT payable' },
    ],
  },
  'payment.received': {
    description: 'Customer payment received',
    lines: [
      { account_code: ACCOUNTS.BANK, side: 'debit',  amount: (c) => c.amount, memo: 'Bank receipt' },
      { account_code: ACCOUNTS.ACCOUNTS_RECEIVABLE, side: 'credit', amount: (c) => c.amount, memo: 'AR settled' },
    ],
  },
  'payment.received.cash': {
    description: 'Cash payment received',
    lines: [
      { account_code: ACCOUNTS.CASH, side: 'debit',  amount: (c) => c.amount, memo: 'Cash receipt' },
      { account_code: ACCOUNTS.ACCOUNTS_RECEIVABLE, side: 'credit', amount: (c) => c.amount, memo: 'AR settled' },
    ],
  },
  'expense.approved': {
    description: 'Operating expense approved',
    lines: [
      { account_code: ACCOUNTS.OPERATING_EXPENSES, side: 'debit',  amount: (c) => c.amount, memo: 'Operating expense' },
      { account_code: ACCOUNTS.CASH,               side: 'credit', amount: (c) => c.amount, memo: 'Cash out' },
    ],
  },
};

export interface BuildResult {
  lines: PostingLine[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

export function buildPayload(event: string, ctx: Record<string, number>): BuildResult {
  const rule = RULES[event];
  if (!rule) throw new Error(`Unknown posting event: ${event}`);
  const lines: PostingLine[] = rule.lines
    .map((l) => ({ account_code: l.account_code, side: l.side, amount: round2(l.amount(ctx) ?? 0), memo: l.memo }))
    .filter((l) => l.amount > 0);
  const totalDebit = round2(lines.filter((l) => l.side === 'debit').reduce((s, l) => s + l.amount, 0));
  const totalCredit = round2(lines.filter((l) => l.side === 'credit').reduce((s, l) => s + l.amount, 0));
  return { lines, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
}

// deno-lint-ignore no-explicit-any
export async function postDocument(supabaseAdmin: any, opts: {
  event: string;
  sourceType: string;
  sourceId: string;
  tenantId: string;
  ctx: Record<string, number>;
  journalDate?: string;
  description?: string;
}): Promise<string> {
  const built = buildPayload(opts.event, opts.ctx);
  if (!built.balanced) {
    throw new Error(`Unbalanced posting for ${opts.event}: dr=${built.totalDebit} cr=${built.totalCredit}`);
  }
  if (built.lines.length < 2) {
    throw new Error(`Posting for ${opts.event} produced fewer than 2 effective lines`);
  }
  const { data, error } = await supabaseAdmin.rpc('post_document_atomic', {
    p_event: opts.event,
    p_source_type: opts.sourceType,
    p_source_id: opts.sourceId,
    p_context: {
      tenant_id: opts.tenantId,
      journal_date: opts.journalDate,
      description: opts.description ?? RULES[opts.event].description,
      lines: built.lines,
    },
  });
  if (error) throw error;
  return data as string;
}
