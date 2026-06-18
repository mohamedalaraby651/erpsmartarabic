/**
 * Reports Query Service — Phase A2.5 Step 2
 *
 * Read-only composed projections for the reports surface.
 *
 * Contract (binding, same as supplierQueryService):
 *   - No writes, mutations, cache invalidation, business validation, or
 *     permissions.
 *   - No method is a pass-through to a single table — every method either
 *     joins, parallel-fetches, or composes multiple reads.
 *   - Does not duplicate any existing read on `reportsRepository`.
 *     `reportsRepository.cashFlow` is the only existing read; nothing
 *     here overlaps with it.
 *   - All calculations (KPIs, aggregations, chart shaping) stay in the
 *     UI components' `useMemo` blocks. This service only returns raw
 *     rows shaped for the view.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ChartOfAccount = Database['public']['Tables']['chart_of_accounts']['Row'];

// ============================================
// View DTOs
// ============================================

export interface AgingUnpaidInvoiceView {
  id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number | null;
  created_at: string;
  due_date: string | null;
  payment_status: string | null;
  customers: { id: string; name: string; phone: string | null } | null;
}

export interface GeographicReportInputs {
  customers: Array<{
    id: string;
    name: string;
    governorate: string | null;
    current_balance: number | null;
    is_active: boolean | null;
  }>;
  invoices: Array<{
    total_amount: number | null;
    customer_id: string | null;
    customers: { governorate: string | null } | null;
  }>;
}

export interface IncomeStatementInputs {
  invoices: Array<{
    total_amount: number | null;
    subtotal: number | null;
    tax_amount: number | null;
    discount_amount: number | null;
    status: string | null;
  }>;
  purchases: Array<{
    total_amount: number | null;
    subtotal: number | null;
    tax_amount: number | null;
    status: string | null;
  }>;
  expenses: Array<{
    amount: number | null;
    status: string | null;
    expense_categories: { name: string } | null;
  }>;
  payments: Array<{
    amount: number | null;
    payment_method: string | null;
  }>;
}

export interface InventoryFlowInputs {
  movements: Array<{
    id: string;
    product_id: string;
    quantity: number | null;
    movement_type: string | null;
    created_at: string;
    products: { name: string } | null;
  }>;
  products: Array<{
    id: string;
    name: string;
    min_stock: number | null;
    is_active: boolean | null;
  }>;
  stock: Array<{ product_id: string; quantity: number | null }>;
}

export interface ProfitabilityInputs {
  invoices: Array<{ total_amount: number | null; created_at: string; payment_status: string | null }>;
  purchases: Array<{ total_amount: number | null; created_at: string; status: string | null }>;
  expenses: Array<{ amount: number | null; expense_date: string; status: string | null }>;
}

export interface TrialBalanceInputs {
  accounts: ChartOfAccount[];
  entries: Array<{
    account_id: string;
    debit_amount: number | null;
    credit_amount: number | null;
  }>;
}

// ============================================
// Query Service
// ============================================

export const reportsQueryService = {
  /**
   * Composed read: unpaid invoices + customer (id, name, phone).
   * Drives the aging buckets in `AgingReport`.
   */
  async listUnpaidInvoicesWithCustomer(): Promise<AgingUnpaidInvoiceView[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        paid_amount,
        created_at,
        due_date,
        payment_status,
        customers(id, name, phone)
      `)
      .neq('payment_status', 'paid')
      .order('created_at', { ascending: true });
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []) as any as AgingUnpaidInvoiceView[];
  },

  /**
   * Composed read: customers list + invoices joined with customers
   * (governorate) — both required to compute per-governorate counts
   * and sales totals in `GeographicReport`.
   */
  async getGeographicReportInputs(): Promise<GeographicReportInputs> {
    const [customersRes, invoicesRes] = await Promise.all([
      supabase.from('customers').select('id, name, governorate, current_balance, is_active'),
      supabase.from('invoices').select('total_amount, customer_id, customers(governorate)'),
    ]);
    if (customersRes.error) throw customersRes.error;
    if (invoicesRes.error) throw invoicesRes.error;
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customers: (customersRes.data ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invoices: (invoicesRes.data ?? []) as any,
    };
  },

  /**
   * Composed read: four parallel period reads for the income statement
   * (invoices, purchases, expenses+category, payments). All filtering
   * by date range; no calculations applied here.
   */
  async getIncomeStatementInputs(startDate: Date, endDate: Date): Promise<IncomeStatementInputs> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const [invoicesRes, purchasesRes, expensesRes, paymentsRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('total_amount, subtotal, tax_amount, discount_amount, status')
        .gte('created_at', startStr)
        .lte('created_at', endStr)
        .neq('status', 'draft')
        .neq('status', 'cancelled'),
      supabase
        .from('purchase_orders')
        .select('total_amount, subtotal, tax_amount, status')
        .gte('created_at', startStr)
        .lte('created_at', endStr)
        .eq('status', 'completed'),
      supabase
        .from('expenses')
        .select(`amount, status, expense_categories (name)`)
        .gte('expense_date', startStr)
        .lte('expense_date', endStr)
        .eq('status', 'approved'),
      supabase
        .from('payments')
        .select('amount, payment_method')
        .gte('payment_date', startStr)
        .lte('payment_date', endStr),
    ]);
    if (invoicesRes.error) throw invoicesRes.error;
    if (purchasesRes.error) throw purchasesRes.error;
    if (expensesRes.error) throw expensesRes.error;
    if (paymentsRes.error) throw paymentsRes.error;
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invoices: (invoicesRes.data ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      purchases: (purchasesRes.data ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expenses: (expensesRes.data ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payments: (paymentsRes.data ?? []) as any,
    };
  },

  /**
   * Composed read: stock_movements joined with products + active
   * products + product_stock levels.
   */
  async getInventoryFlowInputs(startDate: Date, endDate: Date): Promise<InventoryFlowInputs> {
    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();
    const [movementsRes, productsRes, stockRes] = await Promise.all([
      supabase
        .from('stock_movements')
        .select(`id, product_id, quantity, movement_type, created_at, products(name)`)
        .gte('created_at', startStr)
        .lte('created_at', endStr)
        .order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, min_stock, is_active').eq('is_active', true),
      supabase.from('product_stock').select('product_id, quantity'),
    ]);
    if (movementsRes.error) throw movementsRes.error;
    if (productsRes.error) throw productsRes.error;
    if (stockRes.error) throw stockRes.error;
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      movements: (movementsRes.data ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      products: (productsRes.data ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stock: (stockRes.data ?? []) as any,
    };
  },

  /**
   * Composed read: three parallel period reads for profitability KPIs.
   */
  async getProfitabilityInputs(startDate: Date, endDate: Date): Promise<ProfitabilityInputs> {
    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();
    const [invoicesRes, purchasesRes, expensesRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('total_amount, created_at, payment_status')
        .gte('created_at', startStr)
        .lte('created_at', endStr),
      supabase
        .from('purchase_orders')
        .select('total_amount, created_at, status')
        .gte('created_at', startStr)
        .lte('created_at', endStr),
      supabase
        .from('expenses')
        .select('amount, expense_date, status')
        .gte('expense_date', startStr.split('T')[0])
        .lte('expense_date', endStr.split('T')[0]),
    ]);
    if (invoicesRes.error) throw invoicesRes.error;
    if (purchasesRes.error) throw purchasesRes.error;
    if (expensesRes.error) throw expensesRes.error;
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invoices: (invoicesRes.data ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      purchases: (purchasesRes.data ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expenses: (expensesRes.data ?? []) as any,
    };
  },

  /**
   * Composed read: active chart_of_accounts + journal_entries filtered
   * via an inner join on `journals` (posted-only, on/before asOfDate).
   * Composing both reads behind one contract enforces that the trial
   * balance always sees consistent inputs (date filter applied once).
   */
  async getTrialBalanceInputs(asOfDate: Date): Promise<TrialBalanceInputs> {
    const [accountsRes, entriesRes] = await Promise.all([
      supabase.from('chart_of_accounts').select('*').eq('is_active', true).order('code'),
      supabase
        .from('journal_entries')
        .select(`account_id, debit_amount, credit_amount, journals!inner (is_posted, journal_date)`)
        .eq('journals.is_posted', true)
        .lte('journals.journal_date', asOfDate.toISOString().split('T')[0]),
    ]);
    if (accountsRes.error) throw accountsRes.error;
    if (entriesRes.error) throw entriesRes.error;
    return {
      accounts: (accountsRes.data ?? []) as ChartOfAccount[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entries: (entriesRes.data ?? []) as any,
    };
  },
};
