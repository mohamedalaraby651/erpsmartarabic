/**
 * Ledger Service — read-side queries on the chart-of-accounts ledger.
 */
import { supabase } from '@/integrations/supabase/client';

export interface LedgerEntry {
  journal_id: string;
  journal_number: string;
  journal_date: string;
  account_id: string;
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  memo: string | null;
  source_type: string | null;
  source_id: string | null;
}

export interface AccountBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

export async function getAccountLedger(
  accountId: string,
  fromDate?: string,
  toDate?: string
): Promise<LedgerEntry[]> {
  let q = supabase
    .from('journal_entries')
    .select(`
      debit_amount, credit_amount, memo, account_id,
      chart_of_accounts!inner(code, name),
      journals!inner(id, journal_number, journal_date, source_type, source_id, is_posted)
    `)
    .eq('account_id', accountId)
    .eq('journals.is_posted', true);

  if (fromDate) q = q.gte('journals.journal_date', fromDate);
  if (toDate) q = q.lte('journals.journal_date', toDate);

  const { data, error } = await q.order('journal_date', { ascending: true, referencedTable: 'journals' });
  if (error) throw error;

  return (data || []).map((row) => {
    const r = row as unknown as {
      debit_amount: number; credit_amount: number; memo: string | null; account_id: string;
      chart_of_accounts: { code: string; name: string };
      journals: { id: string; journal_number: string; journal_date: string; source_type: string | null; source_id: string | null };
    };
    return {
      journal_id: r.journals.id,
      journal_number: r.journals.journal_number,
      journal_date: r.journals.journal_date,
      account_id: r.account_id,
      account_code: r.chart_of_accounts.code,
      account_name: r.chart_of_accounts.name,
      debit_amount: Number(r.debit_amount) || 0,
      credit_amount: Number(r.credit_amount) || 0,
      memo: r.memo,
      source_type: r.journals.source_type,
      source_id: r.journals.source_id,
    };
  });
}

export async function getAccountBalance(accountId: string): Promise<AccountBalance | null> {
  const { data: account, error: acctErr } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name')
    .eq('id', accountId)
    .single();

  if (acctErr || !account) return null;

  const { data, error } = await supabase
    .from('journal_entries')
    .select('debit_amount, credit_amount, journals!inner(is_posted)')
    .eq('account_id', accountId)
    .eq('journals.is_posted', true);

  if (error) throw error;

  const totalDebit = (data || []).reduce((s, e) => s + (Number(e.debit_amount) || 0), 0);
  const totalCredit = (data || []).reduce((s, e) => s + (Number(e.credit_amount) || 0), 0);

  return {
    account_id: account.id,
    account_code: account.code,
    account_name: account.name,
    total_debit: totalDebit,
    total_credit: totalCredit,
    balance: totalDebit - totalCredit,
  };
}
