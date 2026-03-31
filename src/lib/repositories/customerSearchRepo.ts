/**
 * Customer Search Repository
 * Handles: Search, Duplicates, Export, Prefetch, Import
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];

/** Escape special chars for Postgres .ilike */
function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
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

export const customerSearchRepo = {
  // ============================================
  // Search
  // ============================================

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
  // Duplicates
  // ============================================

  async findDuplicates(
    name: string | undefined,
    phone: string | undefined,
    excludeId?: string
  ): Promise<{ nameDuplicates: DuplicateResult[]; phoneDuplicates: DuplicateResult[] }> {
    let nameDuplicates: DuplicateResult[] = [];
    let phoneDuplicates: DuplicateResult[] = [];

    if (name && name.length >= 3) {
      const s = sanitizeSearch(name);
      let query = supabase
        .from('customers')
        .select('id, name, phone')
        .ilike('name', `%${s}%`)
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
  // Export & Prefetch
  // ============================================

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
