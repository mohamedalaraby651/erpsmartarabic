/**
 * Supplier Repository — Core CRUD, Bulk Operations, Stats
 * Related entities → supplierRelationsRepo
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { sanitizeSearch } from "@/lib/utils/sanitize";
import { supplierWriteSchema } from "@/lib/validations";

type Supplier = Database['public']['Tables']['suppliers']['Row'];
type SupplierInsert = Database['public']['Tables']['suppliers']['Insert'];
type SupplierUpdate = Database['public']['Tables']['suppliers']['Update'];

// ============================================
// Query Types
// ============================================

export interface SupplierFilters {
  search?: string;
  governorate?: string;
  category?: string;
  status?: string;
}

export interface SupplierSort {
  key: string;
  direction: 'asc' | 'desc' | null;
}

export interface SupplierPagination {
  page: number;
  pageSize: number;
}

// ============================================
// Filter Helper
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<T extends { or: (...args: any[]) => any; eq: (...args: any[]) => any; gt: (...args: any[]) => any }>(
  query: T,
  filters: SupplierFilters
): T {
  let q = query;
  const { search, governorate, category, status } = filters;
  if (search) {
    const s = sanitizeSearch(search);
    q = q.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,governorate.ilike.%${s}%,contact_person.ilike.%${s}%`) as typeof q;
  }
  if (governorate && governorate !== 'all') q = q.eq('governorate', governorate) as typeof q;
  if (category && category !== 'all') q = q.eq('category', category) as typeof q;
  if (status && status !== 'all') {
    if (status === 'debtors') {
      q = q.gt('current_balance', 0) as typeof q;
    } else {
      q = q.eq('is_active', status === 'active') as typeof q;
    }
  }
  return q;
}

// ============================================
// Repository
// ============================================

export const supplierRepository = {
  // ============================================
  // Core CRUD
  // ============================================

  async findAll(
    filters: SupplierFilters,
    sort: SupplierSort,
    pagination: SupplierPagination
  ): Promise<{ data: Supplier[]; count: number }> {
    const sortColumn = sort.key || 'name';
    const sortAsc = sort.direction === 'asc';
    const rangeFrom = (pagination.page - 1) * pagination.pageSize;
    const rangeTo = rangeFrom + pagination.pageSize - 1;

    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .order(sortColumn, { ascending: sortAsc })
      .range(rangeFrom, rangeTo);

    query = applyFilters(query, filters);

    const { data, count, error } = await query;
    if (error) throw error;
    return { data: (data || []) as Supplier[], count: count || 0 };
  },

  async findById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(payload: SupplierInsert): Promise<Supplier> {
    const validated = supplierWriteSchema.parse(payload);
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ ...payload, ...validated })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: SupplierUpdate): Promise<void> {
    const validated = supplierWriteSchema.partial().parse(payload);
    const { error } = await supabase
      .from('suppliers')
      .update({ ...payload, ...validated })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ============================================
  // Bulk Operations
  // ============================================

  async bulkDelete(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .in('id', ids);
    if (error) throw error;
  },

  async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: isActive })
      .in('id', ids);
    if (error) throw error;
  },

  async logBulkOperation(action: string, ids: string[], details: Record<string, unknown>): Promise<void> {
    await supabase.rpc('log_bulk_operation', {
      _action: action,
      _entity_type: 'suppliers',
      _entity_ids: ids,
      _details: JSON.stringify(details),
    });
  },

  // ============================================
  // Supplier Notes
  // ============================================
  async listNotes(supplierId: string) {
    const { data, error } = await supabase
      .from('supplier_notes')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createNote(input: {
    supplierId: string;
    note: string;
    userId: string | null;
    tenantId: string;
  }) {
    const { error } = await supabase.from('supplier_notes').insert({
      supplier_id: input.supplierId,
      note: input.note,
      user_id: input.userId,
      created_by: input.userId,
      tenant_id: input.tenantId,
    });
    if (error) throw error;
  },

  async setNotePinned(id: string, pinned: boolean) {
    const { error } = await supabase
      .from('supplier_notes')
      .update({ is_pinned: pinned })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteNote(id: string) {
    const { error } = await supabase.from('supplier_notes').delete().eq('id', id);
    if (error) throw error;
  },

  // ============================================
  // Analytical reads (RPC-backed) — Batch A1
  // ============================================
  async getAging(supplierId: string): Promise<SupplierAgingResult> {
    const { data, error } = await supabase.rpc('get_supplier_aging', { _supplier_id: supplierId });
    if (error) throw error;
    return (data ?? {}) as unknown as SupplierAgingResult;
  },

  async getHealthScore(supplierId: string): Promise<SupplierHealthResult> {
    const { data, error } = await supabase.rpc('get_supplier_health_score', { _supplier_id: supplierId });
    if (error) throw error;
    return (data ?? {}) as unknown as SupplierHealthResult;
  },

  async getStatement(
    supplierId: string,
    opts: { dateFrom?: string; dateTo?: string } = {}
  ): Promise<SupplierStatementRow[]> {
    const params: Record<string, unknown> = { _supplier_id: supplierId };
    if (opts.dateFrom) params._date_from = opts.dateFrom;
    if (opts.dateTo) params._date_to = opts.dateTo;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc('get_supplier_statement', params as any);
    if (error) throw error;
    return (data ?? []) as SupplierStatementRow[];
  },
};

// ============================================
// Shared result shapes (Batch A1)
// ============================================
export interface SupplierAgingBucket { amount: number; count: number }
export interface SupplierAgingResult {
  bucket_0_30?: SupplierAgingBucket;
  bucket_31_60?: SupplierAgingBucket;
  bucket_61_90?: SupplierAgingBucket;
  bucket_90_plus?: SupplierAgingBucket;
  total_outstanding?: number;
  total_count?: number;
}
export interface SupplierHealthResult {
  score: number;
  grade: 'excellent' | 'good' | 'warning' | 'critical';
  recommendations: string[];
}
export interface SupplierStatementRow {
  entry_date: string;
  entry_type: string;
  reference: string;
  debit: number;
  credit: number;
  running_balance: number;
  status: string;
}

// ============================================
// Lightweight pickers (for Select/Combobox)
// ============================================
export async function listActiveSuppliersForSelect(limit = 1000): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .order('name')
    .limit(limit);
  if (error) throw error;
  return (data || []) as Supplier[];
}

