/**
 * Supplier Relations Repository
 * Handles related entities: Purchase Orders, Payments, Activities
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];
type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];

export const supplierRelationsRepo = {
  // ============================================
  // Purchase Orders
  // ============================================

  async findPurchaseOrders(supplierId: string): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data || []) as PurchaseOrder[];
  },

  async findPurchaseOrdersPaginated(supplierId: string, page: number, pageSize: number): Promise<{ data: PurchaseOrder[]; count: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await supabase
      .from('purchase_orders')
      .select('*', { count: 'exact' })
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { data: (data || []) as PurchaseOrder[], count: count || 0 };
  },

  // ============================================
  // Supplier Payments
  // ============================================

  async findPayments(supplierId: string) {
    const { data, error } = await supabase
      .from('supplier_payments')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('payment_date', { ascending: false })
      .limit(500);
    if (error) throw error;
    return data || [];
  },

  async findPaymentsPaginated(supplierId: string, page: number, pageSize: number) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await supabase
      .from('supplier_payments')
      .select('*', { count: 'exact' })
      .eq('supplier_id', supplierId)
      .order('payment_date', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { data: data || [], count: count || 0 };
  },

  // ============================================
  // Activities
  // ============================================

  async findActivities(supplierId: string): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_type', 'supplier')
      .eq('entity_id', supplierId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data || []) as ActivityLog[];
  },
};
