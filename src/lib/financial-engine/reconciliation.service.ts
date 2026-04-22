/**
 * Reconciliation Service — verifies financial integrity across modules.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ReconciliationReport {
  customer_id: string;
  customer_name: string;
  invoiced_total: number;
  paid_total: number;
  expected_balance: number;
  recorded_balance: number;
  discrepancy: number;
}

export async function reconcileCustomerBalances(): Promise<ReconciliationReport[]> {
  // Pull all customers with their cached balance and recompute from raw transactions
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, current_balance');

  if (error) throw error;

  const reports: ReconciliationReport[] = [];

  for (const c of customers || []) {
    const [{ data: invs }, { data: pays }] = await Promise.all([
      supabase.from('invoices').select('total_amount').eq('customer_id', c.id),
      supabase.from('payments').select('amount').eq('customer_id', c.id),
    ]);

    const invoiced = (invs || []).reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const paid = (pays || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const expected = invoiced - paid;
    const recorded = Number(c.current_balance || 0);
    const discrepancy = expected - recorded;

    if (Math.abs(discrepancy) > 0.01) {
      reports.push({
        customer_id: c.id,
        customer_name: c.name,
        invoiced_total: invoiced,
        paid_total: paid,
        expected_balance: expected,
        recorded_balance: recorded,
        discrepancy,
      });
    }
  }

  return reports;
}
