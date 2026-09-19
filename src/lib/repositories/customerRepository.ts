/**
 * Customer Repository — Core CRUD, Bulk Operations, Stats, Addresses, Categories
 * Related entities → customerRelationsRepo
 * Search & Export → customerSearchRepo
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { customerWriteSchema } from "@/lib/validations";
import { sanitizeSearch } from "@/lib/utils/sanitize";
import type { ColumnFilters } from '@/components/ui/column-filter';
import { applyCustomerColumnFilters } from '@/lib/filters/customerColumnFilters';

type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];
type CustomerAddress = Database['public']['Tables']['customer_addresses']['Row'];
type CustomerAddressInsert = Database['public']['Tables']['customer_addresses']['Insert'];
type CustomerCategory = Database['public']['Tables']['customer_categories']['Row'];

// ============================================
// Query Types
// ============================================

export interface CustomerFilters {
  search?: string;
  type?: string;
  vip?: string;
  governorate?: string;
  status?: string;
  category?: string;
  noCommDays?: string;
  inactiveDays?: string;
  columnFilters?: ColumnFilters;
}

export interface CustomerSort {
  key: string;
  direction: 'asc' | 'desc' | null;
}

export interface CustomerPagination {
  page: number;
  pageSize: number;
}

export interface BlockedCustomer {
  customer_id: string;
  customer_name: string;
  open_invoice_count: number;
}

// ============================================
// Filter Helper
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<T extends { or: (...args: any[]) => any; eq: (...args: any[]) => any; neq: (...args: any[]) => any; gt: (...args: any[]) => any }>(
  query: T,
  filters: CustomerFilters
): T {
  let q = query;
  const { search, type, vip, governorate, status, category, noCommDays, inactiveDays, columnFilters } = filters;
  if (search) {
    const s = sanitizeSearch(search);
    // OPA-CUST-001: search spans the identifying fields that already exist on the
    // customers read model (no new columns, no new source of truth).
    q = q.or(
      `name.ilike.%${s}%,phone.ilike.%${s}%,phone2.ilike.%${s}%,email.ilike.%${s}%,` +
      `tax_number.ilike.%${s}%,contact_person.ilike.%${s}%,city.ilike.%${s}%,governorate.ilike.%${s}%`
    ) as typeof q;
  }
  if (type && type !== 'all') q = q.eq('customer_type', type) as typeof q;
  if (vip && vip !== 'all') {
    if (vip === 'non-regular') {
      q = q.neq('vip_level', 'regular') as typeof q;
    } else {
      q = q.eq('vip_level', vip) as typeof q;
    }
  }
  if (governorate && governorate !== 'all') q = q.eq('governorate', governorate) as typeof q;
  if (category && category !== 'all') q = q.eq('category_id', category) as typeof q;
  if (status && status !== 'all') {
    if (status === 'debtors') {
      q = q.gt('current_balance', 0) as typeof q;
    } else {
      q = q.eq('is_active', status === 'active') as typeof q;
    }
  }
  if (noCommDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(noCommDays));
    q = q.or(`last_communication_at.is.null,last_communication_at.lte.${cutoff.toISOString()}`) as typeof q;
  }
  if (inactiveDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(inactiveDays));
    q = q.or(`last_activity_at.is.null,last_activity_at.lte.${cutoff.toISOString()}`) as typeof q;
  }
  if (columnFilters) q = applyCustomerColumnFilters(q, columnFilters);
  return q;
}

// ============================================
// Repository
// ============================================

export const customerRepository = {
  // ============================================
  // Core CRUD
  // ============================================

  /** Active customers via PII-masked safe view, used by selectors. */
  async findActiveSafe(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers_safe')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data || []) as Customer[];
  },

  async findAll(
    filters: CustomerFilters,
    sort: CustomerSort,
    pagination: CustomerPagination
  ): Promise<{ data: Customer[]; count: number }> {
    const sortColumn = sort.key || 'created_at';
    const sortAsc = sort.direction === 'asc';
    const rangeFrom = (pagination.page - 1) * pagination.pageSize;
    const rangeTo = rangeFrom + pagination.pageSize - 1;

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order(sortColumn, { ascending: sortAsc })
      .range(rangeFrom, rangeTo);

    query = applyFilters(query, filters);

    const { data, count, error } = await query;
    if (error) throw error;
    return { data: (data || []) as Customer[], count: count || 0 };
  },

  async findById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(payload: CustomerInsert): Promise<Customer> {
    const parsed = customerWriteSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`بيانات غير صالحة: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }
    const { data, error } = await supabase
      .from('customers')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: CustomerUpdate): Promise<void> {
    const parsed = customerWriteSchema.partial().safeParse(payload);
    if (!parsed.success) {
      throw new Error(`بيانات غير صالحة: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }
    const { error } = await supabase
      .from('customers')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateImage(id: string, imageUrl: string | null): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ image_url: imageUrl })
      .eq('id', id);
    if (error) throw error;
  },

  // ============================================
  // Bulk Operations
  // ============================================

  async bulkDelete(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .in('id', ids);
    if (error) throw error;
  },

  async bulkUpdateVip(ids: string[], vipLevel: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ vip_level: vipLevel as 'regular' | 'silver' | 'gold' | 'platinum' })
      .in('id', ids);
    if (error) throw error;
  },

  async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ is_active: isActive })
      .in('id', ids);
    if (error) throw error;
  },

  // ============================================
  // RPCs & Stats
  // ============================================

  async getStats(): Promise<Record<string, number>> {
    const { data, error } = await supabase.rpc('get_customer_stats');
    if (error) throw error;
    return data as Record<string, number>;
  },

  async batchValidateDelete(ids: string[]): Promise<BlockedCustomer[]> {
    const { data, error } = await supabase.rpc('batch_validate_delete', { p_ids: ids });
    if (error) throw error;
    return (data || []) as BlockedCustomer[];
  },

  async logBulkOperation(action: string, ids: string[], details: Record<string, unknown>): Promise<void> {
    await supabase.rpc('log_bulk_operation', {
      _action: action,
      _entity_type: 'customers',
      _entity_ids: ids,
      _details: JSON.stringify(details),
    });
  },

  // ============================================
  // Addresses
  // ============================================

  async findAddresses(customerId: string): Promise<CustomerAddress[]> {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false });
    if (error) throw error;
    return (data || []) as CustomerAddress[];
  },

  async createAddress(payload: CustomerAddressInsert): Promise<void> {
    const { error } = await supabase
      .from('customer_addresses')
      .insert(payload);
    if (error) throw error;
  },

  async updateAddress(id: string, payload: Partial<CustomerAddressInsert>): Promise<void> {
    const { error } = await supabase
      .from('customer_addresses')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
  },

  async deleteAddress(id: string): Promise<void> {
    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ============================================
  // Categories
  // ============================================

  async findCategories(): Promise<CustomerCategory[]> {
    const { data, error } = await supabase
      .from('customer_categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data || []) as CustomerCategory[];
  },

  // ============================================
  // Lightweight pickers (for Select/Combobox)
  // ============================================

  async listForSelect(limit = 500): Promise<Array<Pick<Customer, 'id' | 'name'>>> {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .order('name')
      .limit(limit);
    if (error) throw error;
    return (data || []) as Array<Pick<Customer, 'id' | 'name'>>;
  },

  /** Bounded values for customer table filter pickers; existing RLS remains authoritative. */
  async listFilterOptions(limit = 500): Promise<Array<Pick<Customer, 'id' | 'name' | 'city'>>> {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, city')
      .order('name')
      .limit(limit);
    if (error) throw error;
    return (data || []) as Array<Pick<Customer, 'id' | 'name' | 'city'>>;
  },

  // ============================================
  // Customer Notes (quick-note insert from alerts/details)
  // ============================================
  async createNote(input: {
    customerId: string;
    userId: string;
    content: string;
    isPinned?: boolean;
  }) {
    const { error } = await supabase.from('customer_notes').insert({
      customer_id: input.customerId,
      user_id: input.userId,
      content: input.content,
      is_pinned: input.isPinned ?? false,
    });
    if (error) throw error;
  },

  // ============================================
  // Analytical reads (RPC-backed) — Batch A1
  // ============================================
  async getAging(customerId: string): Promise<CustomerAgingResult> {
    const { data, error } = await supabase.rpc('get_customer_aging', { _customer_id: customerId });
    if (error) throw error;
    return (data ?? {}) as unknown as CustomerAgingResult;
  },

  async getHealthScore(customerId: string): Promise<CustomerHealthResult> {
    const { data, error } = await supabase.rpc('get_customer_health_score', { _customer_id: customerId });
    if (error) throw error;
    return (data ?? {}) as unknown as CustomerHealthResult;
  },

  async getStatement(
    customerId: string,
    opts: { dateFrom?: string; dateTo?: string } = {}
  ): Promise<StatementRow[]> {
    const params: Record<string, unknown> = { _customer_id: customerId };
    if (opts.dateFrom) params._date_from = opts.dateFrom;
    if (opts.dateTo) params._date_to = opts.dateTo;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc('get_customer_statement', params as any);
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      entry_date: String(row.entry_date ?? ''),
      entry_type: String(row.entry_type ?? ''),
      reference: String(row.reference ?? ''),
      debit: Number(row.debit ?? 0),
      credit: Number(row.credit ?? 0),
      running_balance: Number(row.running_balance ?? 0),
      status: String(row.status ?? ''),
    }));
  },
};

// ============================================
// Shared result shapes (Batch A1)
// ============================================
export interface AgingBucket { amount: number; count: number }
export interface CustomerAgingResult {
  bucket_0_30?: AgingBucket;
  bucket_31_60?: AgingBucket;
  bucket_61_90?: AgingBucket;
  bucket_90_plus?: AgingBucket;
  total_outstanding?: number;
  total_count?: number;
}
export interface CustomerHealthResult {
  score: number;
  grade: 'excellent' | 'good' | 'warning' | 'critical';
  recommendations: string[];
  credit_score?: number;
  dso_score?: number;
  aging_score?: number;
  dso?: number | null;
  total_outstanding?: number;
  overdue_90?: number;
}
export interface StatementRow {
  entry_date: string;
  entry_type: string;
  reference: string;
  debit: number;
  credit: number;
  running_balance: number;
  status: string;
}
