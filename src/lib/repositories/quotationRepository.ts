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
import { mapRepoError, unwrap, type RepoListResult } from "./_base";
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
    const tenant_id = await unwrap(
      // RPC returns the current tenant id (security definer)
      supabase.rpc("get_current_tenant") as unknown as PromiseLike<{
        data: string | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      }>,
      "تعذّر تحديد المنشأة الحالية.",
    );
    if (!tenant_id) throw new Error("لم يتم تحديد المنشأة الحالية.");

    const subtotal = round2(draft.items.reduce((s, it) => s + lineTotal(it), 0));

    const headerPayload = {
      tenant_id,
      customer_id: draft.customer_id,
      quote_date: draft.quote_date,
      valid_until: draft.valid_until,
      notes: draft.notes ?? null,
      subtotal,
      total_amount: subtotal,
    };
    const { data: header, error: hErr } = await supabase
      .from("quotes")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(headerPayload as any)
      .select("id, quote_number")
      .single();
    if (hErr) throw mapRepoError(hErr, "تعذّر إنشاء عرض السعر.");

    if (draft.items.length > 0) {
      const { error: iErr } = await supabase.from("quote_items").insert(
        draft.items.map((it) => ({
          tenant_id,
          quote_id: header.id,
          product_id: it.product_id,
          variant_id: it.variant_id ?? null,
          quantity: round2(Number(it.quantity)),
          unit_price: round2(Number(it.unit_price)),
          discount_percentage: round2(Number(it.discount_percentage ?? 0)),
          total_price: lineTotal(it),
          notes: it.notes ?? null,
        })),
      );
      if (iErr) throw mapRepoError(iErr, "تعذّر حفظ بنود العرض.");
    }
    return header as { id: string; quote_number: string };
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
};
