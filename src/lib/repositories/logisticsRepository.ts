/**
 * Logistics Repository — canonical data access for:
 *  - goods_receipts (+ items)
 *  - delivery_notes (+ items)
 *  - purchase_invoices (+ items)
 *
 * UI / hooks must use this module instead of calling supabase.from(...) directly.
 * RPCs (post_*, cancel_*) are also wrapped here.
 */

import { supabase } from "@/integrations/supabase/client";
import { mapRepoError } from "./_base";
import { sanitizeSearch } from "@/lib/utils/sanitize";

const round2 = (n: number) => Math.round(n * 100) / 100;

async function currentTenant(): Promise<string> {
  const { data } = await supabase.rpc("get_current_tenant");
  const tenant_id = data as string | null;
  if (!tenant_id) throw new Error("لم يتم تحديد المنشأة الحالية");
  return tenant_id;
}

// ============================================
// Goods Receipts
// ============================================

export interface GoodsReceiptItemInput {
  product_id: string;
  variant_id?: string | null;
  ordered_qty: number;
  received_qty: number;
  unit_cost: number;
  notes?: string | null;
}

export interface GoodsReceiptDraft {
  supplier_id: string;
  warehouse_id: string;
  purchase_order_id?: string | null;
  received_date: string;
  notes?: string | null;
  items: GoodsReceiptItemInput[];
}

export const goodsReceiptRepository = {
  async list(search = "") {
    let q = supabase
      .from("goods_receipts")
      .select("*, suppliers(id,name), warehouses(id,name), purchase_orders(id,order_number)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (search.trim()) q = q.ilike("receipt_number", `%${sanitizeSearch(search.trim())}%`);
    const { data, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل إيصالات الاستلام.");
    return data ?? [];
  },

  async findById(id: string) {
    const { data, error } = await supabase
      .from("goods_receipts")
      .select("*, suppliers(id,name), warehouses(id,name), purchase_orders(id,order_number)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw mapRepoError(error, "تعذّر تحميل إيصال الاستلام.");
    return data;
  },

  async listItems(receiptId: string) {
    const { data, error } = await supabase
      .from("goods_receipt_items")
      .select("*, products(id,name,sku)")
      .eq("receipt_id", receiptId);
    if (error) throw mapRepoError(error, "تعذّر تحميل بنود إيصال الاستلام.");
    return data ?? [];
  },

  async create(draft: GoodsReceiptDraft) {
    const tenant_id = await currentTenant();
    const { data: header, error: hErr } = await supabase
      .from("goods_receipts")
      .insert({
        tenant_id,
        supplier_id: draft.supplier_id,
        warehouse_id: draft.warehouse_id,
        purchase_order_id: draft.purchase_order_id ?? null,
        received_date: draft.received_date,
        notes: draft.notes ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select("id, receipt_number")
      .single();
    if (hErr) throw mapRepoError(hErr, "تعذّر إنشاء إيصال الاستلام.");

    if (draft.items.length > 0) {
      const { error: iErr } = await supabase.from("goods_receipt_items").insert(
        draft.items.map((it) => ({
          tenant_id,
          receipt_id: header.id,
          product_id: it.product_id,
          variant_id: it.variant_id ?? null,
          ordered_qty: round2(it.ordered_qty ?? 0),
          received_qty: round2(it.received_qty),
          unit_cost: round2(it.unit_cost),
          notes: it.notes ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any,
      );
      if (iErr) throw mapRepoError(iErr, "تعذّر حفظ بنود إيصال الاستلام.");
    }
    return header as { id: string; receipt_number: string };
  },

  async post(id: string) {
    const { data, error } = await supabase.rpc("post_goods_receipt", { p_id: id });
    if (error) throw mapRepoError(error, "فشل الترحيل.");
    const res = data as { success: boolean; error?: string; items_processed?: number };
    if (!res?.success) throw new Error(res?.error || "فشل الترحيل");
    return res;
  },

  async cancel(id: string, reason?: string) {
    const { data, error } = await supabase.rpc("cancel_goods_receipt", {
      p_id: id,
      _reason: reason ?? null,
    });
    if (error) throw mapRepoError(error, "فشل الإلغاء.");
    const res = data as { success: boolean; error?: string };
    if (!res?.success) throw new Error(res?.error || "فشل الإلغاء");
    return res;
  },
};

// ============================================
// Delivery Notes
// ============================================

export interface DeliveryNoteItemInput {
  product_id: string;
  variant_id?: string | null;
  ordered_qty: number;
  delivered_qty: number;
  notes?: string | null;
}

export interface DeliveryNoteDraft {
  customer_id: string;
  warehouse_id: string;
  sales_order_id?: string | null;
  invoice_id?: string | null;
  delivery_date: string;
  notes?: string | null;
  items: DeliveryNoteItemInput[];
}

export const deliveryNoteRepository = {
  async list(search = "") {
    let q = supabase
      .from("delivery_notes")
      .select(
        "*, customers(id,name), warehouses(id,name), sales_orders(id,order_number), invoices(id,invoice_number)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (search.trim()) q = q.ilike("delivery_number", `%${sanitizeSearch(search.trim())}%`);
    const { data, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل أذونات التسليم.");
    return data ?? [];
  },

  async findById(id: string) {
    const { data, error } = await supabase
      .from("delivery_notes")
      .select(
        "*, customers(id,name), warehouses(id,name), sales_orders(id,order_number), invoices(id,invoice_number)",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw mapRepoError(error, "تعذّر تحميل إذن التسليم.");
    return data;
  },

  async listItems(deliveryId: string) {
    const { data, error } = await supabase
      .from("delivery_note_items")
      .select("*, products(id,name,sku)")
      .eq("delivery_id", deliveryId);
    if (error) throw mapRepoError(error, "تعذّر تحميل بنود إذن التسليم.");
    return data ?? [];
  },

  async create(draft: DeliveryNoteDraft) {
    const tenant_id = await currentTenant();
    const { data: header, error: hErr } = await supabase
      .from("delivery_notes")
      .insert({
        tenant_id,
        customer_id: draft.customer_id,
        warehouse_id: draft.warehouse_id,
        sales_order_id: draft.sales_order_id ?? null,
        invoice_id: draft.invoice_id ?? null,
        delivery_date: draft.delivery_date,
        notes: draft.notes ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select("id, delivery_number")
      .single();
    if (hErr) throw mapRepoError(hErr, "تعذّر إنشاء إذن التسليم.");

    if (draft.items.length > 0) {
      const { error: iErr } = await supabase.from("delivery_note_items").insert(
        draft.items.map((it) => ({
          tenant_id,
          delivery_id: header.id,
          product_id: it.product_id,
          variant_id: it.variant_id ?? null,
          ordered_qty: round2(it.ordered_qty ?? 0),
          delivered_qty: round2(it.delivered_qty),
          notes: it.notes ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any,
      );
      if (iErr) throw mapRepoError(iErr, "تعذّر حفظ بنود إذن التسليم.");
    }
    return header as { id: string; delivery_number: string };
  },

  async post(id: string) {
    const { data, error } = await supabase.rpc("post_delivery_note", { p_id: id });
    if (error) throw mapRepoError(error, "فشل الترحيل.");
    const res = data as {
      success: boolean;
      error?: string;
      items_processed?: number;
      stock_warnings?: number;
    };
    if (!res?.success) throw new Error(res?.error || "فشل الترحيل");
    return res;
  },

  async cancel(id: string, reason?: string) {
    const { data, error } = await supabase.rpc("cancel_delivery_note", {
      p_id: id,
      _reason: reason ?? null,
    });
    if (error) throw mapRepoError(error, "فشل الإلغاء.");
    const res = data as { success: boolean; error?: string };
    if (!res?.success) throw new Error(res?.error || "فشل الإلغاء");
    return res;
  },
};

// ============================================
// Purchase Invoices
// ============================================

export type MatchingStatus =
  | "matched"
  | "over_received"
  | "under_received"
  | "no_receipt"
  | "pending";

export interface PurchaseInvoiceItemInput {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
  notes?: string | null;
}

export interface PurchaseInvoiceDraft {
  supplier_id: string;
  purchase_order_id?: string | null;
  invoice_date: string;
  due_date?: string | null;
  tax_amount?: number;
  discount_amount?: number;
  notes?: string | null;
  items: PurchaseInvoiceItemInput[];
}

export const purchaseInvoiceRepository = {
  async list(search = "") {
    let q = supabase
      .from("purchase_invoices")
      .select("*, suppliers(id,name), purchase_orders(id,order_number)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (search.trim()) q = q.ilike("invoice_number", `%${sanitizeSearch(search.trim())}%`);
    const { data, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل فواتير المشتريات.");
    return data ?? [];
  },

  async findById(id: string) {
    const { data, error } = await supabase
      .from("purchase_invoices")
      .select("*, suppliers(id,name), purchase_orders(id,order_number)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw mapRepoError(error, "تعذّر تحميل فاتورة المشتريات.");
    return data;
  },

  async listItems(invoiceId: string) {
    const { data, error } = await supabase
      .from("purchase_invoice_items")
      .select("*, products(id,name,sku)")
      .eq("invoice_id", invoiceId);
    if (error) throw mapRepoError(error, "تعذّر تحميل بنود الفاتورة.");
    return data ?? [];
  },

  async create(draft: PurchaseInvoiceDraft) {
    const tenant_id = await currentTenant();
    const subtotal = round2(draft.items.reduce((s, it) => s + it.quantity * it.unit_price, 0));
    const tax = round2(draft.tax_amount ?? 0);
    const discount = round2(draft.discount_amount ?? 0);
    const total = round2(subtotal + tax - discount);

    const { data: header, error: hErr } = await supabase
      .from("purchase_invoices")
      .insert({
        tenant_id,
        supplier_id: draft.supplier_id,
        purchase_order_id: draft.purchase_order_id ?? null,
        invoice_date: draft.invoice_date,
        due_date: draft.due_date ?? null,
        subtotal,
        tax_amount: tax,
        discount_amount: discount,
        total_amount: total,
        notes: draft.notes ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select("id, invoice_number")
      .single();
    if (hErr) throw mapRepoError(hErr, "تعذّر إنشاء فاتورة المشتريات.");

    if (draft.items.length > 0) {
      const { error: iErr } = await supabase.from("purchase_invoice_items").insert(
        draft.items.map((it) => ({
          tenant_id,
          invoice_id: header.id,
          product_id: it.product_id,
          variant_id: it.variant_id ?? null,
          quantity: round2(it.quantity),
          unit_price: round2(it.unit_price),
          total_price: round2(it.quantity * it.unit_price),
          notes: it.notes ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any,
      );
      if (iErr) throw mapRepoError(iErr, "تعذّر حفظ بنود الفاتورة.");
    }
    return header as { id: string; invoice_number: string };
  },

  async post(id: string) {
    const { data, error } = await supabase.rpc("post_purchase_invoice", { p_id: id });
    if (error) throw mapRepoError(error, "فشل الترحيل.");
    const res = data as {
      success: boolean;
      error?: string;
      matching_status?: MatchingStatus;
      approval_required?: boolean;
    };
    if (!res?.success) throw new Error(res?.error || "فشل الترحيل");
    return res;
  },
};
