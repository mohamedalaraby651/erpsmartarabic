/**
 * Sales Order Repository — Canonical data access for `sales_orders`
 * (+ `sales_order_items`). All UI / hooks must depend on this module
 * instead of calling `supabase.from('sales_orders')` directly.
 *
 * Conversion RPCs live in `quotationRepository`
 * (`convertOrderToInvoice`, `convertInvoiceToDelivery`) to keep the
 * sales-cycle pipeline grouped.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapRepoError, type RepoListResult } from "./_base";
import { sanitizeSearch } from "@/lib/utils/sanitize";

type T = Database["public"]["Tables"];

export type SalesOrderRow = T["sales_orders"]["Row"] & {
  customers?: { id?: string; name: string; phone?: string | null } | null;
};

export type SalesOrderWithRelations = T["sales_orders"]["Row"] & {
  customers: T["customers"]["Row"] | null;
  quotations: { id: string; quotation_number: string } | null;
};

export type SalesOrderItemRow = T["sales_order_items"]["Row"] & {
  products?: { id: string; name: string; sku: string | null } | null;
  product_variants?: { id: string; name: string } | null;
};

export type SalesOrderStatus = T["sales_orders"]["Row"]["status"];

export interface SalesOrderFilters {
  search?: string;
  status?: SalesOrderStatus;
  customerId?: string;
}

export interface SalesOrderItemInput {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  notes?: string | null;
}

export interface SalesOrderHeaderInput {
  customer_id: string;
  delivery_date?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  status?: SalesOrderStatus;
  order_number?: string;
  created_by?: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function lineTotal(it: SalesOrderItemInput): number {
  return round2(
    Number(it.quantity) *
      Number(it.unit_price) *
      (1 - Number(it.discount_percentage ?? 0) / 100),
  );
}

function buildItemRows(orderId: string, items: SalesOrderItemInput[]) {
  return items.map((it) => ({
    order_id: orderId,
    product_id: it.product_id,
    variant_id: it.variant_id ?? null,
    quantity: round2(Number(it.quantity)),
    unit_price: round2(Number(it.unit_price)),
    discount_percentage: round2(Number(it.discount_percentage ?? 0)),
    total_price: lineTotal(it),
    notes: it.notes ?? null,
  }));
}

export const salesOrderRepository = {
  // ============================================
  // Reads
  // ============================================

  async list(
    filters: SalesOrderFilters = {},
    limit = 200,
  ): Promise<RepoListResult<SalesOrderRow>> {
    let q = supabase
      .from("sales_orders")
      .select("*, customers(id, name, phone)", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filters.search?.trim()) {
      q = q.ilike("order_number", `%${sanitizeSearch(filters.search.trim())}%`);
    }
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.customerId) q = q.eq("customer_id", filters.customerId);

    const { data, error, count } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل أوامر البيع.");
    return { data: (data ?? []) as SalesOrderRow[], count: count ?? 0 };
  },

  async findById(id: string): Promise<SalesOrderWithRelations | null> {
    const { data, error } = await supabase
      .from("sales_orders")
      .select("*, customers(*), quotations(id, quotation_number)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw mapRepoError(error, "تعذّر تحميل أمر البيع.");
    return (data as SalesOrderWithRelations) ?? null;
  },

  async listItems(orderId: string): Promise<SalesOrderItemRow[]> {
    const { data, error } = await supabase
      .from("sales_order_items")
      .select("*, products(id, name, sku), product_variants(id, name)")
      .eq("order_id", orderId);
    if (error) throw mapRepoError(error, "تعذّر تحميل بنود أمر البيع.");
    return (data ?? []) as SalesOrderItemRow[];
  },

  async listInvoicesByOrder(orderId: string) {
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, created_at, total_amount, payment_status")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (error) throw mapRepoError(error, "تعذّر تحميل فواتير الأمر.");
    return data ?? [];
  },

  async listActivity(orderId: string, limit = 20) {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, action, created_at")
      .eq("entity_type", "sales_order")
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
    header: SalesOrderHeaderInput,
    items: SalesOrderItemInput[],
  ): Promise<{ id: string; order_number: string }> {
    if (items.length === 0) throw new Error("يجب إضافة بند واحد على الأقل.");
    const { data: row, error } = await supabase
      .from("sales_orders")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(header as any)
      .select("id, order_number")
      .single();
    if (error) throw mapRepoError(error, "تعذّر إنشاء أمر البيع.");

    const { error: iErr } = await supabase
      .from("sales_order_items")
      .insert(buildItemRows(row.id, items));
    if (iErr) throw mapRepoError(iErr, "تعذّر حفظ بنود أمر البيع.");

    return row as { id: string; order_number: string };
  },

  async update(
    id: string,
    header: Partial<SalesOrderHeaderInput>,
    items: SalesOrderItemInput[],
  ): Promise<void> {
    if (items.length === 0) throw new Error("يجب إضافة بند واحد على الأقل.");
    const { error: uErr } = await supabase
      .from("sales_orders")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(header as any)
      .eq("id", id);
    if (uErr) throw mapRepoError(uErr, "تعذّر تحديث أمر البيع.");

    const { error: delErr } = await supabase
      .from("sales_order_items")
      .delete()
      .eq("order_id", id);
    if (delErr) throw mapRepoError(delErr, "تعذّر تحديث بنود أمر البيع.");

    const { error: insErr } = await supabase
      .from("sales_order_items")
      .insert(buildItemRows(id, items));
    if (insErr) throw mapRepoError(insErr, "تعذّر حفظ بنود أمر البيع.");
  },

  async remove(id: string): Promise<void> {
    const { error: itemsErr } = await supabase
      .from("sales_order_items")
      .delete()
      .eq("order_id", id);
    if (itemsErr) throw mapRepoError(itemsErr, "تعذّر حذف بنود أمر البيع.");
    const { error } = await supabase.from("sales_orders").delete().eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر حذف أمر البيع.");
  },

  async bulkInsertItems(
    orderId: string,
    items: SalesOrderItemInput[],
  ): Promise<void> {
    if (!items.length) return;
    const { error } = await supabase
      .from("sales_order_items")
      .insert(buildItemRows(orderId, items));
    if (error) throw mapRepoError(error, "تعذّر حفظ بنود أمر البيع.");
  },
};

export { lineTotal as salesOrderLineTotal };

