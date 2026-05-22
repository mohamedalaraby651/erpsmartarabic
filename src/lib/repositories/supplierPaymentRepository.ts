/**
 * Supplier Payment Repository — canonical read access for `supplier_payments`.
 * Writes still flow through `recordSupplierPayment` in `supplierService` which
 * couples the insert with the atomic balance RPC.
 */

import { supabase } from "@/integrations/supabase/client";
import { mapRepoError } from "./_base";
import { sanitizeSearch } from "@/lib/utils/sanitize";

export interface SupplierPaymentFilters {
  search?: string;
  supplierId?: string;
  purchaseOrderId?: string;
}

export const supplierPaymentRepository = {
  async list(filters: SupplierPaymentFilters = {}) {
    let q = supabase
      .from("supplier_payments")
      .select(`
        *,
        suppliers (id, name),
        purchase_orders (id, order_number)
      `)
      .order("payment_date", { ascending: false });

    if (filters.search?.trim()) {
      const s = sanitizeSearch(filters.search.trim());
      q = q.or(`payment_number.ilike.%${s}%,reference_number.ilike.%${s}%`);
    }
    if (filters.supplierId) q = q.eq("supplier_id", filters.supplierId);
    if (filters.purchaseOrderId) q = q.eq("purchase_order_id", filters.purchaseOrderId);

    const { data, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل مدفوعات الموردين.");
    return data ?? [];
  },

  async listBySupplier(supplierId: string) {
    return this.list({ supplierId });
  },

  async listByPurchaseOrder(orderId: string) {
    return this.list({ purchaseOrderId: orderId });
  },
};
