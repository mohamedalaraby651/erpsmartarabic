/**
 * Legacy Quotations Repository
 * ------------------------------------------------------------
 * Wraps the legacy `quotations` / `quotation_items` tables which are still
 * powering `src/pages/quotations/*`. The canonical sales-cycle quote lives
 * in `quotes` / `quote_items` (see quotationRepository.ts).
 *
 * Purpose: eliminate `supabase.from()` leakage from page components while
 * we plan the migration that copies legacy rows into the canonical tables.
 * No business logic — only typed data access.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapRepoError } from "./_base";

type Tables = Database["public"]["Tables"];
type QuotationRow = Tables["quotations"]["Row"];
type QuotationInsert = Tables["quotations"]["Insert"];
type QuotationItemRow = Tables["quotation_items"]["Row"];
type QuotationItemInsert = Tables["quotation_items"]["Insert"];

export type LegacyQuotationWithCustomer = QuotationRow & {
  customers: { id: string; name: string } | null;
};
export type LegacyQuotationItemWithRefs = QuotationItemRow & {
  products?: { id: string; name: string; sku: string | null } | null;
  product_variants?: { id: string; name: string } | null;
};

export const legacyQuotationsRepository = {
  // -------- List page --------
  async count(search?: string): Promise<number> {
    let q = supabase
      .from("quotations")
      .select("*", { count: "exact", head: true });
    if (search) q = q.or(`quotation_number.ilike.%${search}%`);
    const { count, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر عدّ عروض الأسعار.");
    return count ?? 0;
  },

  async list(params: {
    search?: string;
    from: number;
    to: number;
  }): Promise<LegacyQuotationWithCustomer[]> {
    let q = supabase
      .from("quotations")
      .select("*, customers(id, name)")
      .order("created_at", { ascending: false })
      .range(params.from, params.to);
    if (params.search)
      q = q.or(`quotation_number.ilike.%${params.search}%`);
    const { data, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل عروض الأسعار.");
    return (data ?? []) as LegacyQuotationWithCustomer[];
  },

  // -------- Details page --------
  async findById(id: string): Promise<LegacyQuotationWithCustomer | null> {
    const { data, error } = await supabase
      .from("quotations")
      .select("*, customers(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw mapRepoError(error, "تعذّر تحميل عرض السعر.");
    return (data as LegacyQuotationWithCustomer) ?? null;
  },

  async listItems(quotationId: string): Promise<LegacyQuotationItemWithRefs[]> {
    const { data, error } = await supabase
      .from("quotation_items")
      .select(
        "*, products(id, name, sku), product_variants(id, name)",
      )
      .eq("quotation_id", quotationId);
    if (error) throw mapRepoError(error, "تعذّر تحميل بنود عرض السعر.");
    return (data ?? []) as LegacyQuotationItemWithRefs[];
  },

  async listLinkedSalesOrders(quotationId: string) {
    const { data, error } = await supabase
      .from("sales_orders")
      .select("*")
      .eq("quotation_id", quotationId)
      .order("created_at", { ascending: false });
    if (error) throw mapRepoError(error, "تعذّر تحميل أوامر البيع المرتبطة.");
    return data ?? [];
  },

  // -------- Writes --------
  async create(
    header: Omit<QuotationInsert, "id" | "created_at" | "updated_at">,
    items: Array<Omit<QuotationItemInsert, "id" | "quotation_id" | "created_at">>,
  ): Promise<QuotationRow> {
    const { data: newQuotation, error: hErr } = await supabase
      .from("quotations")
      .insert(header)
      .select()
      .single();
    if (hErr || !newQuotation)
      throw mapRepoError(hErr, "تعذّر إنشاء عرض السعر.");

    if (items.length > 0) {
      const payload = items.map((it) => ({
        ...it,
        quotation_id: newQuotation.id,
      })) as QuotationItemInsert[];
      const { error: iErr } = await supabase
        .from("quotation_items")
        .insert(payload);
      if (iErr) throw mapRepoError(iErr, "تعذّر حفظ بنود عرض السعر.");
    }

    return newQuotation as QuotationRow;
  },

  async delete(id: string): Promise<void> {
    // Items first (FK), then header.
    const { error: iErr } = await supabase
      .from("quotation_items")
      .delete()
      .eq("quotation_id", id);
    if (iErr) throw mapRepoError(iErr, "تعذّر حذف بنود عرض السعر.");
    const { error } = await supabase.from("quotations").delete().eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر حذف عرض السعر.");
  },
};
