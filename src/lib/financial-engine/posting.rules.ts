/**
 * Financial Posting Rules — Declarative
 * 
 * Defines how each business event maps to debit/credit journal entries.
 * Single source of truth for accounting logic — no scattered triggers.
 */

export type AccountCode = string; // e.g. '1100' (AR), '4000' (Sales), '1010' (Cash)

export interface PostingLine {
  account_code: AccountCode;
  side: 'debit' | 'credit';
  amount: (ctx: Record<string, number>) => number;
  memo?: string;
}

export interface PostingRule {
  event: string;
  description: string;
  lines: PostingLine[];
}

/**
 * Standard chart-of-accounts codes used across rules.
 * These should match seeded codes in `chart_of_accounts`.
 */
export const ACCOUNTS = {
  CASH: '1010',
  BANK: '1020',
  ACCOUNTS_RECEIVABLE: '1100',
  INVENTORY: '1200',
  ACCOUNTS_PAYABLE: '2100',
  SALES_REVENUE: '4000',
  COST_OF_GOODS_SOLD: '5000',
  OPERATING_EXPENSES: '6000',
  TAX_PAYABLE: '2200',
  SALES_RETURNS: '4100',
} as const;

/**
 * Posting rules registry
 */
export const POSTING_RULES: Record<string, PostingRule> = {
  'invoice.approved': {
    event: 'invoice.approved',
    description: 'Customer invoice approved — recognize revenue & receivable',
    lines: [
      {
        account_code: ACCOUNTS.ACCOUNTS_RECEIVABLE,
        side: 'debit',
        amount: (ctx) => ctx.total_amount,
        memo: 'AR — invoice',
      },
      {
        account_code: ACCOUNTS.SALES_REVENUE,
        side: 'credit',
        amount: (ctx) => ctx.subtotal,
        memo: 'Sales revenue',
      },
      {
        account_code: ACCOUNTS.TAX_PAYABLE,
        side: 'credit',
        amount: (ctx) => ctx.tax_amount || 0,
        memo: 'VAT payable',
      },
    ],
  },

  'payment.received': {
    event: 'payment.received',
    description: 'Customer payment — reduce receivable & increase cash',
    lines: [
      {
        account_code: ACCOUNTS.CASH,
        side: 'debit',
        amount: (ctx) => ctx.amount,
        memo: 'Cash received',
      },
      {
        account_code: ACCOUNTS.ACCOUNTS_RECEIVABLE,
        side: 'credit',
        amount: (ctx) => ctx.amount,
        memo: 'AR settled',
      },
    ],
  },

  'expense.approved': {
    event: 'expense.approved',
    description: 'Operating expense approved & paid',
    lines: [
      {
        account_code: ACCOUNTS.OPERATING_EXPENSES,
        side: 'debit',
        amount: (ctx) => ctx.amount,
        memo: 'Operating expense',
      },
      {
        account_code: ACCOUNTS.CASH,
        side: 'credit',
        amount: (ctx) => ctx.amount,
        memo: 'Cash out',
      },
    ],
  },

  'credit_note.approved': {
    event: 'credit_note.approved',
    description: 'Customer return — reverse revenue & receivable',
    lines: [
      {
        account_code: ACCOUNTS.SALES_RETURNS,
        side: 'debit',
        amount: (ctx) => ctx.amount,
        memo: 'Sales return',
      },
      {
        account_code: ACCOUNTS.ACCOUNTS_RECEIVABLE,
        side: 'credit',
        amount: (ctx) => ctx.amount,
        memo: 'AR reversed',
      },
    ],
  },

  'supplier_payment.made': {
    event: 'supplier_payment.made',
    description: 'Payment to supplier — reduce payable & cash',
    lines: [
      {
        account_code: ACCOUNTS.ACCOUNTS_PAYABLE,
        side: 'debit',
        amount: (ctx) => ctx.amount,
        memo: 'AP settled',
      },
      {
        account_code: ACCOUNTS.CASH,
        side: 'credit',
        amount: (ctx) => ctx.amount,
        memo: 'Cash out to supplier',
      },
    ],
  },
};

/**
 * Resolve posting lines for a given event with concrete amounts.
 */
export function resolvePosting(
  event: string,
  ctx: Record<string, number>
): { lines: Array<{ account_code: string; debit: number; credit: number; memo?: string }>; balanced: boolean } {
  const rule = POSTING_RULES[event];
  if (!rule) {
    throw new Error(`No posting rule for event: ${event}`);
  }

  const lines = rule.lines.map((l) => ({
    account_code: l.account_code,
    debit: l.side === 'debit' ? l.amount(ctx) : 0,
    credit: l.side === 'credit' ? l.amount(ctx) : 0,
    memo: l.memo,
  }));

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return { lines, balanced };
}
