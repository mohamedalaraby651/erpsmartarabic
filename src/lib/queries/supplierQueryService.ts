/**
 * Supplier Query Service — Phase A2.5 Step 1 (POC)
 *
 * Read-only composed projections for the supplier domain.
 * Contract (binding):
 *   - No writes, no mutations, no cache invalidation.
 *   - No business validation, permissions, or calculations beyond the
 *     shape/aggregation needed for the view.
 *   - No method may be a thin pass-through to a single table — every
 *     method here performs a join, an aggregation, or composes multiple
 *     reads. Single-table reads belong in `supplierRepository`.
 *   - Must not duplicate an existing read shape on `supplierRepository`.
 *     Compose, don't duplicate.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];

// ============================================
// View DTOs (exported — UI consumes these shapes)
// ============================================

export type SupplierActivityView = ActivityLog;

export interface SupplierAggregatedProductView {
  product: {
    id: string;
    name: string | null;
    sku: string | null;
    image_url: string | null;
  } | null;
  totalQuantity: number;
  totalValue: number;
  averagePrice: number;
  orderCount: number;
}


// ============================================
// Query Service
// ============================================

export const supplierQueryService = {
  /**
   * Composed read: activity for the supplier itself, plus activity on
   * its purchase orders and its payments. Joins three buckets of
   * `activity_logs` via id-sets fetched from `purchase_orders` and
   * `supplier_payments`.
   */
  async listActivity(supplierId: string, limit = 50): Promise<SupplierActivityView[]> {
    const [poRes, payRes] = await Promise.all([
      supabase.from('purchase_orders').select('id').eq('supplier_id', supplierId),
      supabase.from('supplier_payments').select('id').eq('supplier_id', supplierId),
    ]);
    if (poRes.error) throw poRes.error;
    if (payRes.error) throw payRes.error;

    const poIds = (poRes.data ?? []).map((r) => r.id);
    const payIds = (payRes.data ?? []).map((r) => r.id);

    const orClauses: string[] = [
      `and(entity_type.eq.supplier,entity_id.eq.${supplierId})`,
    ];
    if (poIds.length) {
      orClauses.push(`and(entity_type.eq.purchase_order,entity_id.in.(${poIds.join(',')}))`);
    }
    if (payIds.length) {
      orClauses.push(`and(entity_type.eq.supplier_payment,entity_id.in.(${payIds.join(',')}))`);
    }

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .or(orClauses.join(','))
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as SupplierActivityView[];
  },

  /**
   * Composed read: purchase_orders × purchase_order_items × products,
   * aggregated per product. Aggregation is view-shape only (no business
   * rules — sums and averages of stored values).
   */
  async listAggregatedProducts(supplierId: string): Promise<SupplierAggregatedProductView[]> {
    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('supplier_id', supplierId);
    if (ordersError) throw ordersError;
    if (!orders || orders.length === 0) return [];

    const orderIds = orders.map((o) => o.id);
    const { data: items, error: itemsError } = await supabase
      .from('purchase_order_items')
      .select(`
        product_id,
        quantity,
        unit_price,
        total_price,
        products ( id, name, sku, image_url )
      `)
      .in('order_id', orderIds);
    if (itemsError) throw itemsError;

    const productMap = new Map<string, SupplierAggregatedProductView>();
    (items ?? []).forEach((item) => {
      const pid = item.product_id as string;
      const existing = productMap.get(pid);
      if (existing) {
        existing.totalQuantity += Number(item.quantity);
        existing.totalValue += Number(item.total_price);
        existing.orderCount += 1;
        existing.averagePrice = existing.totalQuantity
          ? existing.totalValue / existing.totalQuantity
          : 0;
      } else {
        productMap.set(pid, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          product: (item as any).products ?? null,
          totalQuantity: Number(item.quantity),
          totalValue: Number(item.total_price),
          averagePrice: Number(item.unit_price),
          orderCount: 1,
        });
      }
    });

    return Array.from(productMap.values()).sort((a, b) => b.totalValue - a.totalValue);
  },

};

