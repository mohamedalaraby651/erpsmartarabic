/**
 * Quotation Repository — Unified data access for sales quotations.
 *
 * Canonical table: `quotes` (+ `quote_items`) — the sales-cycle table that
 * powers the conversion RPCs (quote → order → invoice → delivery).
 *
 * NOTE: A legacy `quotations` / `quotation_items` pair still exists in the
 * database and is consumed by `src/pages/quotations/*`. A future migration
 * (pending approval) will copy legacy rows into `quotes`/`quote_items` and
 * drop the legacy tables. All new code MUST use this repository.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapRepoError, type RepoListResult } from "./_base";
import { sanitizeSearch } from "@/lib/utils/sanitize";

type T = Database["public"]["Tables"];
export type QuotationRow = T["quotes"]["Row"] & {
  customers?: { id: string; name: string } | null;
};
export type QuotationItemRow = T["quote_items"]["Row"] & {
  products?: { id: string; name: string; sku: string | null } | null;
};
export type QuotationStatus = QuotationRow["status"];

export interface QuotationFilters {
  search?: string;
  status?: QuotationStatus;
  customerId?: string;
}

export interface QuotationItemInput {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  notes?: string | null;
}

export interface QuotationDraft {
  customer_id: string;
  quote_date: string;
  valid_until: string;
  notes?: string | null;
  items: QuotationItemInput[];
  /** Optional pre-computed totals. If omitted, derived from items. */
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount?: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function lineTotal(it: QuotationItemInput): number {
  return round2(
    Number(it.quantity) *
      Number(it.unit_price) *
      (1 - Number(it.discount_percentage ?? 0) / 100),
  );
}

export const quotationRepository = {
  // ============================================
  // Reads
  // ============================================

  async list(
    filters: QuotationFilters = {},
    limit = 200,
  ): Promise<RepoListResult<QuotationRow>> {
    let q = supabase
      .from("quotes")
      .select("*, customers(id, name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filters.search?.trim()) {
      q = q.ilike("quote_number", `%${sanitizeSearch(filters.search.trim())}%`);
    }
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.customerId) q = q.eq("customer_id", filters.customerId);

    const { data, error, count } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل عروض الأسعار.");
    return { data: (data ?? []) as QuotationRow[], count: count ?? 0 };
  },

  async findById(id: string): Promise<QuotationRow | null> {
    const { data, error } = await supabase
      .from("quotes")
      .select("*, customers(id, name)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw mapRepoError(error, "تعذّر تحميل عرض السعر.");
    return (data as QuotationRow) ?? null;
  },

  async listItems(quoteId: string): Promise<QuotationItemRow[]> {
    const { data, error } = await supabase
      .from("quote_items")
      .select("*, products(id, name, sku)")
      .eq("quote_id", quoteId);
    if (error) throw mapRepoError(error, "تعذّر تحميل بنود العرض.");
    return (data ?? []) as QuotationItemRow[];
  },

  // ============================================
  // Writes
  // ============================================

  async create(draft: QuotationDraft): Promise<{ id: string; quote_number: string }> {
    const computedSubtotal = round2(draft.items.reduce((s, it) => s + lineTotal(it), 0));
    const subtotal = round2(draft.subtotal ?? computedSubtotal);
    const discount_amount = round2(draft.discount_amount ?? 0);
    const tax_amount = round2(draft.tax_amount ?? 0);
    const total_amount = round2(
      draft.total_amount ?? Math.max(0, subtotal - discount_amount) + tax_amount,
    );

    const header = {
      customer_id: draft.customer_id,
      quote_date: draft.quote_date,
      valid_until: draft.valid_until,
      notes: draft.notes ?? null,
      subtotal,
      discount_amount,
      tax_amount,
      total_amount,
    };

    const items = draft.items.map((it) => ({
      product_id: it.product_id,
      variant_id: it.variant_id ?? null,
      quantity: round2(Number(it.quantity)),
      unit_price: round2(Number(it.unit_price)),
      discount_percentage: round2(Number(it.discount_percentage ?? 0)),
      total_price: lineTotal(it),
      notes: it.notes ?? null,
    }));

    // Atomic single-transaction save (Phase 2 RPC).
    const { data: newId, error } = await supabase.rpc('save_quotation_with_items', {
      p_id: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p_header: header as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p_items: items as any,
    });
    if (error) throw mapRepoError(error, 'تعذّر إنشاء عرض السعر.');
    if (!newId) throw new Error('save_quotation_with_items returned no id');

    const { data: row } = await supabase
      .from('quotes')
      .select('id, quote_number')
      .eq('id', newId as string)
      .single();
    return (row ?? { id: newId as string, quote_number: '' }) as { id: string; quote_number: string };
  },

  async updateStatus(id: string, status: QuotationStatus): Promise<void> {
    const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر تحديث حالة العرض.");
  },

  // ============================================
  // Conversion RPCs (sales cycle pipeline)
  // ============================================

  async convertToOrder(quoteId: string): Promise<string> {
    const { data, error } = await supabase.rpc("convert_quote_to_order", {
      p_quote_id: quoteId,
    });
    if (error) throw mapRepoError(error, "فشل تحويل العرض إلى أمر بيع.");
    return data as string;
  },

  async convertOrderToInvoice(orderId: string): Promise<string> {
    const { data, error } = await supabase.rpc("convert_order_to_invoice", {
      p_order_id: orderId,
    });
    if (error) throw mapRepoError(error, "فشل إنشاء الفاتورة.");
    return data as string;
  },

  async convertInvoiceToDelivery(
    invoiceId: string,
    warehouseId: string | null = null,
  ): Promise<string> {
    const { data, error } = await supabase.rpc("convert_invoice_to_delivery", {
      p_invoice_id: invoiceId,
      p_warehouse_id: warehouseId,
    });
    if (error) throw mapRepoError(error, "فشل إنشاء إذن التسليم.");
    return data as string;
  },

  // ============================================
  // Pipeline aggregates (sales pipeline page)
  // ============================================

  async listPipelineOrders(limit = 50) {
    const { data, error } = await supabase
      .from("sales_orders")
      .select("id, order_number, total_amount, status, created_at, customers(name)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw mapRepoError(error, "تعذّر تحميل أوامر البيع.");
    return data ?? [];
  },

  async listPipelineInvoices(limit = 50) {
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, status, payment_status, created_at, customers(name)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw mapRepoError(error, "تعذّر تحميل الفواتير.");
    return data ?? [];
  },
};
