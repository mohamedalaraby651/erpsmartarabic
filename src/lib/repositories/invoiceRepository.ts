/**
 * Invoice Repository — Centralized data access for invoices.
 *
 * Phase 3 (P2) of the Q1 remediation plan: extends the Repository pattern
 * (already used for customers / suppliers) to invoices so that page
 * components stop calling `supabase.from('invoices')` directly.
 *
 * Scope (intentionally narrow for the first pass):
 *   - Core CRUD
 *   - Listing with filters / sort / pagination
 *   - Items (sub-resource)
 *   - A couple of common aggregate helpers
 *
 * Heavy server-side flows (validate-invoice / process-payment) keep going
 * through the secureOperations layer on top of edge functions.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { sanitizeSearch } from '@/lib/utils/sanitize';

type Invoice = Database['public']['Tables']['invoices']['Row'];
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];
type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'];
type InvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert'];

export interface InvoiceFilters {
  search?: string;
  status?: string;
  paymentStatus?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface InvoiceSort {
  key: string;
  direction: 'asc' | 'desc' | null;
}

export interface InvoicePagination {
  page: number;
  pageSize: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<T extends { ilike: (...a: any[]) => any; eq: (...a: any[]) => any; gte: (...a: any[]) => any; lte: (...a: any[]) => any }>(
  query: T,
  filters: InvoiceFilters
): T {
  let q = query;
  const { search, status, paymentStatus, customerId, fromDate, toDate } = filters;
  if (search) {
    q = q.ilike('invoice_number', `%${sanitizeSearch(search)}%`) as typeof q;
  }
  if (status && status !== 'all') q = q.eq('status', status) as typeof q;
  if (paymentStatus && paymentStatus !== 'all') q = q.eq('payment_status', paymentStatus) as typeof q;
  if (customerId) q = q.eq('customer_id', customerId) as typeof q;
  if (fromDate) q = q.gte('created_at', fromDate) as typeof q;
  if (toDate) q = q.lte('created_at', toDate) as typeof q;
  return q;
}

export const invoiceRepository = {
  // Core CRUD
  async findAll(
    filters: InvoiceFilters,
    sort: InvoiceSort,
    pagination: InvoicePagination
  ): Promise<{ data: Invoice[]; count: number }> {
    const sortColumn = sort.key || 'created_at';
    const sortAsc = sort.direction === 'asc';
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .order(sortColumn, { ascending: sortAsc })
      .range(from, to);

    query = applyFilters(query, filters);

    const { data, count, error } = await query;
    if (error) throw error;
    return { data: (data || []) as Invoice[], count: count || 0 };
  },

  async findById(id: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload: InvoiceInsert): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: InvoiceUpdate): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
  },

  // Items sub-resource
  async findItems(invoiceId: string): Promise<InvoiceItem[]> {
    const { data, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);
    if (error) throw error;
    return (data || []) as InvoiceItem[];
  },

  async addItem(payload: InvoiceItemInsert): Promise<void> {
    const { error } = await supabase.from('invoice_items').insert(payload);
    if (error) throw error;
  },

  async deleteItem(itemId: string): Promise<void> {
    const { error } = await supabase.from('invoice_items').delete().eq('id', itemId);
    if (error) throw error;
  },

  // Common aggregate helpers
  async findByCustomer(customerId: string, limit = 50): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as Invoice[];
  },
};
