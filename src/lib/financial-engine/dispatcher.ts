/**
 * Dispatcher — bridges declarative posting rules to the atomic DB engine.
 *
 * resolvePostingPayload() — pure helper, fully unit-testable.
 * postDocument()           — runtime wrapper that calls `post_document_atomic` RPC.
 */
import { supabase } from '@/integrations/supabase/client';
import { POSTING_RULES } from './posting.rules';

const round2 = (n: number): number => Math.round(Number(n) * 100) / 100;

export interface PostingDimensions {
  cost_center_id?: string | null;
  project_id?: string | null;
  department_id?: string | null;
}

export interface PostingLinePayload extends PostingDimensions {
  account_code: string;
  side: 'debit' | 'credit';
  amount: number;
  memo?: string;
}

export interface PostingPayload {
  lines: PostingLinePayload[];
  journal_date?: string;
  description?: string;
  tenant_id?: string;
}

export interface ResolvedPosting {
  lines: PostingLinePayload[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

/**
 * Pure: builds the rounded, balanced lines for a given event + numeric context.
 * Optional `dimensions` are propagated onto every effective line (Phase 4).
 */
export function resolvePostingPayload(
  event: string,
  ctx: Record<string, number>,
  dimensions?: PostingDimensions,
): ResolvedPosting {
  const rule = POSTING_RULES[event];
  if (!rule) {
    throw new Error(`Unknown posting event: ${event}`);
  }

  const lines: PostingLinePayload[] = rule.lines
    .map((l) => ({
      account_code: l.account_code,
      side: l.side,
      amount: round2(l.amount(ctx) ?? 0),
      memo: l.memo,
      cost_center_id: dimensions?.cost_center_id ?? null,
      project_id: dimensions?.project_id ?? null,
      department_id: dimensions?.department_id ?? null,
    }))
    .filter((l) => l.amount > 0);

  const totalDebit = round2(lines.filter((l) => l.side === 'debit').reduce((s, l) => s + l.amount, 0));
  const totalCredit = round2(lines.filter((l) => l.side === 'credit').reduce((s, l) => s + l.amount, 0));
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return { lines, totalDebit, totalCredit, balanced };
}

/** Invokes the atomic posting RPC. Returns the journal id (or existing id on idempotent re-call). */
export async function postDocument(
  event: string,
  sourceType: string,
  sourceId: string,
  ctx: Record<string, number>,
  extra?: {
    journal_date?: string;
    description?: string;
    tenant_id?: string;
    dimensions?: PostingDimensions;
  },
): Promise<string> {
  const resolved = resolvePostingPayload(event, ctx, extra?.dimensions);
  if (!resolved.balanced) {
    throw new Error(`Posting payload is unbalanced for ${event}: debit=${resolved.totalDebit} credit=${resolved.totalCredit}`);
  }
  if (resolved.lines.length < 2) {
    throw new Error(`Posting payload has fewer than 2 effective lines for ${event}`);
  }

  const payload: PostingPayload = {
    lines: resolved.lines,
    journal_date: extra?.journal_date,
    description: extra?.description ?? POSTING_RULES[event].description,
    tenant_id: extra?.tenant_id,
  };

  const { data, error } = await supabase.rpc('post_document_atomic', {
    p_event: event,
    p_source_type: sourceType,
    p_source_id: sourceId,
    p_context: payload as never,
  });

  if (error) throw error;
  return data as unknown as string;
}

