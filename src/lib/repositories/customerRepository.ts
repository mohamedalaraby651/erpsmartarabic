/**
 * Customer Repository — Single Data Access Layer
 * All Supabase calls for the customers domain are centralized here.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];
type CustomerAddress = Database['public']['Tables']['customer_addresses']['Row'];
type CustomerAddressInsert = Database['public']['Tables']['customer_addresses']['Insert'];
type CustomerCategory = Database['public']['Tables']['customer_categories']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];
type CreditNote = Database['public']['Tables']['credit_notes']['Row'];
type SalesOrder = Database['public']['Tables']['sales_orders']['Row'];
type Quotation = Database['public']['Tables']['quotations']['Row'];
type CustomerReminder = Database['public']['Tables']['customer_reminders']['Row'];
type CustomerCommunication = Database['public']['Tables']['customer_communications']['Row'];
type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];

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

export interface DuplicateDetectionResult {
  id1: string;
  name1: string;
  phone1: string | null;
  id2: string;
  name2: string;
  phone2: string | null;
  similarity_score: number;
  match_type: string;
}

// ============================================
// Repository Methods
// ============================================

/**
 * Apply filter predicates to a customer query.
 * Uses a typed helper to avoid `any`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<T extends { or: (...args: any[]) => any; eq: (...args: any[]) => any; neq: (...args: any[]) => any; gt: (...args: any[]) => any }>(
  query: T,
  filters: CustomerFilters
): T {
  let q = query;
  const { search, type, vip, governorate, status, noCommDays, inactiveDays } = filters;
  if (search) {
    const s = sanitizeSearch(search);
    q = q.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,governorate.ilike.%${s}%`) as typeof q;
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
  return q;
}

export const customerRepository = {
  // ============================================
  // Core CRUD
  // ============================================

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
    const { data, error } = await supabase
      .from('customers')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: CustomerUpdate): Promise<void> {
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

  async findDuplicatesRpc(): Promise<DuplicateDetectionResult[]> {
    const { data, error } = await supabase.rpc('find_duplicate_customers');
    if (error) throw error;
    return (data || []) as DuplicateDetectionResult[];
  },

  async mergeCustomers(primaryId: string, duplicateId: string): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.rpc('merge_customers_atomic', {
      p_primary_id: primaryId,
      p_duplicate_id: duplicateId,
    });
    if (error) throw error;
    return data as { success: boolean; message: string };
  },

  // ============================================
  // Search & Duplicates
  // ============================================

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

  async searchPreview(searchTerm: string): Promise<Customer[]> {
    if (!searchTerm || searchTerm.length < 2) return [];
    const s = sanitizeSearch(searchTerm);
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, phone, governorate, customer_type, image_url, current_balance, vip_level')
      .or(`name.ilike.%${s}%,phone.ilike.%${s}%`)
      .limit(5);
    if (error) throw error;
    return (data || []) as Customer[];
  },

  async searchForMerge(searchTerm: string): Promise<Customer[]> {
    if (!searchTerm || searchTerm.length < 2) return [];
    const s = sanitizeSearch(searchTerm);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`name.ilike.%${s}%,phone.ilike.%${s}%`)
      .order('name')
      .limit(20);
    if (error) throw error;
    return (data || []) as Customer[];
  },

  // ============================================
  // Export & Prefetch
  // ============================================

  /** Cursor-based export — fetches all customers in batches */
  async exportAll(onProgress?: (loaded: number) => void): Promise<{ data: Customer[]; isPartial: boolean }> {
    const batchSize = 1000;
    const maxRecords = 50000;
    let allData: Customer[] = [];
    let offset = 0;

    while (offset < maxRecords) {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + batchSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allData = allData.concat(data as Customer[]);
      onProgress?.(allData.length);
      if (data.length < batchSize) break;
      offset += batchSize;
    }

    return { data: allData, isPartial: offset >= maxRecords };
  },

  async prefetchCustomer(id: string): Promise<Customer | null> {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    return data;
  },

  async prefetchAddresses(customerId: string) {
    const { data } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false });
    return data;
  },

  async countOpenInvoices(customerId: string): Promise<number> {
    const { count, error } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .in('payment_status', ['pending', 'partial']);
    if (error) throw error;
    return count || 0;
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
  // Detail Page — Related Entities
  // ============================================

  async findInvoices(customerId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data || []) as Invoice[];
  },

  async findPayments(customerId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*, invoices:invoice_id(invoice_number)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data || []) as (Payment & { invoices: { invoice_number: string } | null })[];
  },

  async findCreditNotes(customerId: string): Promise<CreditNote[]> {
    const { data, error } = await supabase
      .from('credit_notes')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data || []) as CreditNote[];
  },

  async findSalesOrders(customerId: string): Promise<SalesOrder[]> {
    const { data, error } = await supabase
      .from('sales_orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data || []) as SalesOrder[];
  },

  async findQuotations(customerId: string): Promise<Quotation[]> {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data || []) as Quotation[];
  },

  async findActivities(customerId: string): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_type', 'customer')
      .eq('entity_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data || []) as ActivityLog[];
  },

  async updateImage(id: string, imageUrl: string | null): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ image_url: imageUrl })
      .eq('id', id);
    if (error) throw error;
  },

  // ============================================
  // Reminders
  // ============================================

  async findReminders(customerId: string): Promise<CustomerReminder[]> {
    const { data, error } = await supabase
      .from('customer_reminders')
      .select('*')
      .eq('customer_id', customerId)
      .order('reminder_date', { ascending: true });
    if (error) throw error;
    return (data || []) as CustomerReminder[];
  },

  async createReminder(payload: { customer_id: string; reminder_date: string; note: string; created_by: string; recurrence?: string | null; linked_invoice_id?: string | null }): Promise<void> {
    const { error } = await supabase
      .from('customer_reminders')
      .insert(payload);
    if (error) throw error;
  },

  async updateReminder(id: string, payload: { is_completed: boolean; updated_at: string }): Promise<void> {
    const { error } = await supabase
      .from('customer_reminders')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
  },

  // ============================================
  // Communications
  // ============================================

  async findCommunications(customerId: string): Promise<CustomerCommunication[]> {
    const { data, error } = await supabase
      .from('customer_communications')
      .select('*')
      .eq('customer_id', customerId)
      .order('communication_date', { ascending: false });
    if (error) throw error;
    return (data || []) as CustomerCommunication[];
  },

  async createCommunication(payload: { customer_id: string; type: string; subject: string | null; note: string; created_by: string }): Promise<void> {
    const { error } = await supabase
      .from('customer_communications')
      .insert(payload);
    if (error) throw error;
  },

  // ============================================
  // Import
  // ============================================

  async findAllNamesAndPhones(): Promise<{ name: string; phone: string | null }[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('name, phone')
      .limit(10000);
    if (error) throw error;
    return (data || []) as { name: string; phone: string | null }[];
  },

  async insertCustomer(payload: CustomerInsert): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .insert(payload);
    if (error) throw error;
  },
};
