/**
 * Purchase Order Repository — canonical data access for `purchase_orders`
 * (+ `purchase_order_items`). UI / hooks must depend on this module instead
 * of calling `supabase.from('purchase_orders')` directly.
 *
 * Follows the same conventions as `salesOrderRepository`:
 *   - round2 for financial precision
 *   - sanitizeSearch for ilike inputs
 *   - mapRepoError for Arabic error messages
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapRepoError, type RepoListResult } from "./_base";
import { sanitizeSearch } from "@/lib/utils/sanitize";

type T = Database["public"]["Tables"];

export type PurchaseOrderRow = T["purchase_orders"]["Row"] & {
  suppliers?: { id?: string; name: string } | null;
};

export type PurchaseOrderWithRelations = T["purchase_orders"]["Row"] & {
  suppliers: T["suppliers"]["Row"] | null;
};

export type PurchaseOrderItemRow = T["purchase_order_items"]["Row"] & {
  products?: { id: string; name: string; sku: string | null } | null;
  product_variants?: { id: string; name: string } | null;
};

export type PurchaseOrderStatus = T["purchase_orders"]["Row"]["status"];

export interface PurchaseOrderFilters {
  search?: string;
  status?: PurchaseOrderStatus;
  supplierId?: string;
}

export interface PurchaseOrderItemInput {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
  notes?: string | null;
}

export interface PurchaseOrderHeaderInput {
  supplier_id: string;
  expected_date?: string | null;
  notes?: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status?: PurchaseOrderStatus;
  order_number?: string;
  created_by?: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function lineTotal(it: PurchaseOrderItemInput): number {
  return round2(Number(it.quantity) * Number(it.unit_price));
}

function buildItemRows(orderId: string, items: PurchaseOrderItemInput[]) {
  return items.map((it) => ({
    order_id: orderId,
    product_id: it.product_id,
    variant_id: it.variant_id ?? null,
    quantity: round2(Number(it.quantity)),
    unit_price: round2(Number(it.unit_price)),
    total_price: lineTotal(it),
    notes: it.notes ?? null,
  }));
}

export const purchaseOrderRepository = {
  // ============================================
  // Reads
  // ============================================

  async list(
    filters: PurchaseOrderFilters = {},
    range?: { from: number; to: number },
  ): Promise<RepoListResult<PurchaseOrderRow>> {
    let q = supabase
      .from("purchase_orders")
      .select("*, suppliers(id, name)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters.search?.trim()) {
      q = q.ilike("order_number", `%${sanitizeSearch(filters.search.trim())}%`);
    }
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.supplierId) q = q.eq("supplier_id", filters.supplierId);

    if (range) q = q.range(range.from, range.to);

    const { data, error, count } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل أوامر الشراء.");
    return { data: (data ?? []) as PurchaseOrderRow[], count: count ?? 0 };
  },

  async countMatching(filters: PurchaseOrderFilters = {}): Promise<number> {
    let q = supabase
      .from("purchase_orders")
      .select("*", { count: "exact", head: true });
    if (filters.search?.trim()) {
      q = q.ilike("order_number", `%${sanitizeSearch(filters.search.trim())}%`);
    }
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.supplierId) q = q.eq("supplier_id", filters.supplierId);
    const { count, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر حساب أوامر الشراء.");
    return count ?? 0;
  },

  async findById(id: string): Promise<PurchaseOrderWithRelations | null> {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, suppliers(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw mapRepoError(error, "تعذّر تحميل أمر الشراء.");
    return (data as PurchaseOrderWithRelations) ?? null;
  },

  async listItems(orderId: string): Promise<PurchaseOrderItemRow[]> {
    const { data, error } = await supabase
      .from("purchase_order_items")
      .select("*, products(id, name, sku), product_variants(id, name)")
      .eq("order_id", orderId);
    if (error) throw mapRepoError(error, "تعذّر تحميل بنود أمر الشراء.");
    return (data ?? []) as PurchaseOrderItemRow[];
  },

  async listPaymentsByOrder(orderId: string) {
    const { data, error } = await supabase
      .from("supplier_payments")
      .select("*")
      .eq("purchase_order_id", orderId)
      .order("payment_date", { ascending: false });
    if (error) throw mapRepoError(error, "تعذّر تحميل مدفوعات الأمر.");
    return data ?? [];
  },

  async listActivity(orderId: string, limit = 20) {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, action, created_at")
      .eq("entity_type", "purchase_order")
      .eq("entity_id", orderId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw mapRepoError(error, "تعذّر تحميل سجل النشاط.");
    return data ?? [];
  },

  // ============================================
  // Writes
  // ============================================

  async create(
    header: PurchaseOrderHeaderInput,
    items: PurchaseOrderItemInput[],
  ): Promise<{ id: string; order_number: string }> {
    if (items.length === 0) throw new Error("يجب إضافة بند واحد على الأقل.");
    const { data: row, error } = await supabase
      .from("purchase_orders")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(header as any)
      .select("id, order_number")
      .single();
    if (error) throw mapRepoError(error, "تعذّر إنشاء أمر الشراء.");

    const { error: iErr } = await supabase
      .from("purchase_order_items")
      .insert(buildItemRows(row.id, items));
    if (iErr) throw mapRepoError(iErr, "تعذّر حفظ بنود أمر الشراء.");

    return row as { id: string; order_number: string };
  },

  async update(
    id: string,
    header: Partial<PurchaseOrderHeaderInput>,
    items: PurchaseOrderItemInput[],
  ): Promise<void> {
    if (items.length === 0) throw new Error("يجب إضافة بند واحد على الأقل.");
    const { error: uErr } = await supabase
      .from("purchase_orders")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(header as any)
      .eq("id", id);
    if (uErr) throw mapRepoError(uErr, "تعذّر تحديث أمر الشراء.");

    const { error: delErr } = await supabase
      .from("purchase_order_items")
      .delete()
      .eq("order_id", id);
    if (delErr) throw mapRepoError(delErr, "تعذّر تحديث بنود أمر الشراء.");

    const { error: insErr } = await supabase
      .from("purchase_order_items")
      .insert(buildItemRows(id, items));
    if (insErr) throw mapRepoError(insErr, "تعذّر حفظ بنود أمر الشراء.");
  },

  async remove(id: string): Promise<void> {
    const { error: itemsErr } = await supabase
      .from("purchase_order_items")
      .delete()
      .eq("order_id", id);
    if (itemsErr) throw mapRepoError(itemsErr, "تعذّر حذف بنود أمر الشراء.");
    const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر حذف أمر الشراء.");
  },
};

export { lineTotal as purchaseOrderLineTotal };
