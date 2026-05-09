/**
 * Journal Service — central API for creating accounting journal entries.
 * Wraps the create-journal Edge Function and resolves posting via posting.rules.ts.
 */
import { supabase } from '@/integrations/supabase/client';
import { resolvePosting } from './posting.rules';
import { logError, logInfo } from '@/lib/observability';

export interface CreateJournalParams {
  event: string;
  fiscal_period_id: string;
  source_type: string;
  source_id: string;
  description?: string;
  context: Record<string, number>;
}

export interface JournalResult {
  success: boolean;
  journal_id?: string;
  error?: string;
}

export async function createJournalFromEvent(params: CreateJournalParams): Promise<JournalResult> {
  const { event, fiscal_period_id, source_type, source_id, description, context } = params;

  try {
    const { lines, balanced } = resolvePosting(event, context);

    if (!balanced) {
      const msg = `Journal not balanced for event ${event}`;
      logError(msg, { component: 'financial-engine', action: 'createJournalFromEvent', metadata: { event, source_id } });
      return { success: false, error: msg };
    }

    // Resolve account_code → account_id
    const codes = [...new Set(lines.map((l) => l.account_code))];
    const { data: accounts, error: acctErr } = await supabase
      .from('chart_of_accounts')
      .select('id, code')
      .in('code', codes);

    if (acctErr || !accounts) {
      return { success: false, error: 'Failed to resolve accounts' };
    }

    const codeToId = new Map(accounts.map((a) => [a.code, a.id]));
    const missing = codes.filter((c) => !codeToId.has(c));
    if (missing.length > 0) {
      return { success: false, error: `Missing accounts: ${missing.join(', ')}` };
    }

    const { buildRequestHeaders, newIdempotencyKey } = await import('@/lib/requestHeaders');
    // Stable idempotency key derived from source doc to deduplicate auto-postings
    const stableKey = `${source_type}:${source_id}:${event}`;
    const { data, error } = await supabase.functions.invoke('create-journal', {
      body: {
        fiscal_period_id,
        source_type,
        source_id,
        description: description || `Auto-posted: ${event}`,
        entries: lines.map((l, idx) => ({
          line_number: idx + 1,
          account_id: codeToId.get(l.account_code)!,
          debit_amount: l.debit,
          credit_amount: l.credit,
          memo: l.memo,
        })),
      },
      headers: buildRequestHeaders({ idempotencyKey: stableKey || newIdempotencyKey() }),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    logInfo('Journal created from event', { component: 'financial-engine', action: 'createJournalFromEvent', metadata: { event, journal_id: data?.journal_id } });
    return { success: true, journal_id: data?.journal_id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logError('createJournalFromEvent failed', { component: 'financial-engine', metadata: { event, error: msg } });
    return { success: false, error: msg };
  }
}
