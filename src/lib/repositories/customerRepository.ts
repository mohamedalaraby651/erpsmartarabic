/**
 * Customer Repository — Single Data Access Layer
 * All Supabase calls for the customers domain are centralized here.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

/** Escape special chars for Postgres .ilike */
function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

// ============================================
// Query Types
// ============================================

export interface CustomerFilters {
  search?: string;
  type?: string;
  vip?: string;
  governorate?: string;
  status?: string;
  noCommDays?: string;
  inactiveDays?: string;
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

export interface DuplicateResult {
  id: string;
  name: string;
  phone: string | null;
}

// ============================================
// Repository Methods
// ============================================

function applyFilters(query: any, filters: CustomerFilters) {
  const { search, type, vip, governorate, status, noCommDays, inactiveDays } = filters;
  if (search) {
    const s = sanitizeSearch(search);
    query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,governorate.ilike.%${s}%`);
  }
  if (type && type !== 'all') query = query.eq('customer_type', type);
  if (vip && vip !== 'all') query = query.eq('vip_level', vip);
  if (governorate && governorate !== 'all') query = query.eq('governorate', governorate);
  if (status && status !== 'all') query = query.eq('is_active', status === 'active');
  if (noCommDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(noCommDays));
    query = query.or(`last_communication_at.is.null,last_communication_at.lte.${cutoff.toISOString()}`);
  }
  if (inactiveDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(inactiveDays));
    query = query.or(`last_activity_at.is.null,last_activity_at.lte.${cutoff.toISOString()}`);
  }
  return query;
}

export const customerRepository = {
  /** Fetch paginated + filtered customer list with count */
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

  /** Fetch single customer by ID */
  async findById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  /** Create a new customer */
  async create(payload: CustomerInsert): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Update an existing customer */
  async update(id: string, payload: CustomerUpdate): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
  },

  /** Delete a customer */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /** Bulk delete customers */
  async bulkDelete(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .in('id', ids);
    if (error) throw error;
  },

  /** Bulk update VIP level */
  async bulkUpdateVip(ids: string[], vipLevel: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ vip_level: vipLevel as 'regular' | 'silver' | 'gold' | 'platinum' })
      .in('id', ids);
    if (error) throw error;
  },

  /** Bulk update active status */
  async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ is_active: isActive })
      .in('id', ids);
    if (error) throw error;
  },

  /** Get aggregate stats via RPC */
  async getStats(): Promise<Record<string, number>> {
    const { data, error } = await supabase.rpc('get_customer_stats');
    if (error) throw error;
    return data as Record<string, number>;
  },

  /** Batch validate delete — returns customers that cannot be deleted */
  async batchValidateDelete(ids: string[]): Promise<BlockedCustomer[]> {
    const { data, error } = await supabase.rpc('batch_validate_delete', { p_ids: ids });
    if (error) throw error;
    return (data || []) as BlockedCustomer[];
  },

  /** Log a bulk operation for audit trail */
  async logBulkOperation(action: string, ids: string[], details: Record<string, unknown>): Promise<void> {
    await supabase.rpc('log_bulk_operation', {
      _action: action,
      _entity_type: 'customers',
      _entity_ids: ids,
      _details: JSON.stringify(details),
    });
  },

  /** Find duplicates by name or phone */
  async findDuplicates(
    name: string | undefined,
    phone: string | undefined,
    excludeId?: string
  ): Promise<{ nameDuplicates: DuplicateResult[]; phoneDuplicates: DuplicateResult[] }> {
    let nameDuplicates: DuplicateResult[] = [];
    let phoneDuplicates: DuplicateResult[] = [];

    if (name && name.length >= 3) {
      let query = supabase
        .from('customers')
        .select('id, name, phone')
        .ilike('name', `%${name}%`)
        .limit(3);
      if (excludeId) query = query.neq('id', excludeId);
      const { data } = await query;
      nameDuplicates = (data || []) as DuplicateResult[];
    }

    if (phone && phone.length >= 6) {
      let query = supabase
        .from('customers')
        .select('id, name, phone')
        .eq('phone', phone)
        .limit(3);
      if (excludeId) query = query.neq('id', excludeId);
      const { data } = await query;
      phoneDuplicates = (data || []) as DuplicateResult[];
    }

    return { nameDuplicates, phoneDuplicates };
  },

  /** Export all customers (with optional limit) */
  async exportAll(limit = 5000): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as Customer[];
  },

  /** Prefetch customer detail data */
  async prefetchCustomer(id: string): Promise<Customer | null> {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    return data;
  },

  /** Prefetch customer addresses */
  async prefetchAddresses(customerId: string) {
    const { data } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false });
    return data;
  },

  /** Check open invoices for single customer */
  async countOpenInvoices(customerId: string): Promise<number> {
    const { count, error } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .in('payment_status', ['pending', 'partial']);
    if (error) throw error;
    return count || 0;
  },
};
