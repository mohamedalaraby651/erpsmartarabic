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
    const { data, error } = await supabase
      .from('suppliers')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: SupplierUpdate): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .update(payload)
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
};
