/**
 * Credit Note Repository — مركز الوصول الوحيد لجدول `credit_notes`.
 *
 * يغلّف القراءة (list/detail/items/journal) والاستدعاءات الآمنة عبر RPC
 * لتأكيد/إلغاء المرتجعات. الـ RLS + triggers تتكفّل بـ tenant_id ومسار
 * المخزون/القيد المحاسبي تلقائياً.
 */

import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearch } from "@/lib/utils/sanitize";
import { buildRange, mapRepoError } from "./_base";

export type CreditNoteRow = {
  id: string;
  credit_note_number: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  reason: string | null;
  status: string;
  created_at: string;
};

export type CreditNoteWithRelations = CreditNoteRow & {
  customers: { id?: string; name: string; phone?: string | null } | null;
  invoices: { id?: string; invoice_number: string; total_amount?: number; paid_amount?: number } | null;
};

export interface CreditNoteFilters {
  search?: string;
}

export interface CreditNoteListParams {
  filters?: CreditNoteFilters;
  page?: number;
  pageSize?: number;
}

export interface CreditNoteListResult {
  data: CreditNoteWithRelations[];
  count: number;
}

function applySearch<Q extends { or: (filter: string) => Q }>(q: Q, search?: string): Q {
  if (!search) return q;
  const s = sanitizeSearch(search);
  return q.or(`credit_note_number.ilike.%${s}%,reason.ilike.%${s}%`);
}

export const creditNoteRepository = {
  async list({ filters, page = 1, pageSize = 25 }: CreditNoteListParams): Promise<CreditNoteListResult> {
    const range = buildRange({ page, pageSize })!;
    let q = supabase
      .from("credit_notes")
      .select("*, customers(name), invoices(invoice_number)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(range.from, range.to);
    q = applySearch(q, filters?.search);
    const { data, count, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل المرتجعات.");
    return {
      data: (data || []) as unknown as CreditNoteWithRelations[],
      count: count ?? 0,
    };
  },

  async count(filters?: CreditNoteFilters): Promise<number> {
    let q = supabase.from("credit_notes").select("*", { count: "exact", head: true });
    q = applySearch(q, filters?.search);
    const { count, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر حساب المرتجعات.");
    return count ?? 0;
  },

  async findById(id: string): Promise<CreditNoteWithRelations | null> {
    const { data, error } = await supabase
      .from("credit_notes")
      .select("*, customers(id, name, phone), invoices(id, invoice_number, total_amount, paid_amount)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw mapRepoError(error);
    return (data as unknown as CreditNoteWithRelations) ?? null;
  },

  async listItems(creditNoteId: string) {
    const { data, error } = await supabase
      .from("credit_note_items")
      .select("*, products(name, sku), invoice_items:invoice_item_id(id, quantity, unit_price)")
      .eq("credit_note_id", creditNoteId);
    if (error) throw mapRepoError(error, "تعذّر تحميل بنود المرتجع.");
    return data || [];
  },

  async findJournal(creditNoteId: string) {
    const { data, error } = await supabase
      .from("journals")
      .select("id, journal_number, journal_date, description, is_posted")
      .eq("source_type", "credit_note")
      .eq("source_id", creditNoteId)
      .maybeSingle();
    if (error) throw mapRepoError(error);
    return data;
  },

  async confirm(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("confirm_credit_note", { p_credit_note_id: id });
    if (error) throw mapRepoError(error, "فشل تأكيد المرتجع.");
    return data;
  },

  async cancel(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)("cancel_credit_note", { p_credit_note_id: id });
    if (error) throw mapRepoError(error, "فشل إلغاء المرتجع.");
  },

  // ============================================
  // Form-dialog read helpers
  // ============================================

  async listCustomersForSelect() {
    const { data, error } = await supabase
      .from("customers_safe")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    if (error) throw mapRepoError(error, "تعذّر تحميل العملاء.");
    return data ?? [];
  },

  async listInvoicesForCustomer(customerId: string) {
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, paid_amount")
      .eq("customer_id", customerId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    if (error) throw mapRepoError(error, "تعذّر تحميل الفواتير.");
    return data ?? [];
  },

  async listInvoiceItemsWithProducts(invoiceId: string) {
    const { data, error } = await supabase
      .from("invoice_items")
      .select("id, product_id, quantity, unit_price, total_price, products:product_id(name, sku)")
      .eq("invoice_id", invoiceId);
    if (error) throw mapRepoError(error, "تعذّر تحميل بنود الفاتورة.");
    return (data ?? []) as unknown as Array<{
      id: string;
      product_id: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      products: { name: string; sku?: string | null } | null;
    }>;
  },

  async getReturnsSummary(invoiceId: string) {
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("invoice_item_returns_summary" as any)
      .select("invoice_item_id, confirmed_returned_qty, draft_returned_qty, remaining_qty")
      .eq("invoice_id", invoiceId);
    if (error) throw mapRepoError(error, "تعذّر تحميل ملخص المرتجعات.");
    const map: Record<string, { confirmed: number; draft: number; remaining: number }> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data ?? []).forEach((r: any) => {
      if (!r.invoice_item_id) return;
      map[r.invoice_item_id] = {
        confirmed: Number(r.confirmed_returned_qty || 0),
        draft: Number(r.draft_returned_qty || 0),
        remaining: Number(r.remaining_qty || 0),
      };
    });
    return map;
  },

  // ============================================
  // Draft write (header + items, with rollback)
  // ============================================

  async createDraft(input: CreateCreditNoteDraftInput): Promise<{ id: string }> {
    const { data: tenantId, error: tenantErr } = await supabase.rpc("get_current_tenant");
    if (tenantErr) throw mapRepoError(tenantErr, "تعذّر التحقق من السياق.");

    const { data: cn, error: cnErr } = await supabase
      .from("credit_notes")
      .insert({
        invoice_id: input.invoiceId,
        customer_id: input.customerId,
        amount: input.totalAmount,
        reason: input.reason ?? null,
        credit_note_number: "",
        created_by: input.userId ?? null,
        tenant_id: tenantId as string,
        status: "draft",
      })
      .select("id")
      .single();
    if (cnErr || !cn) throw mapRepoError(cnErr, "تعذّر إنشاء إشعار الإرجاع.");

    const itemsPayload = input.items.map((l) => ({
      credit_note_id: cn.id,
      invoice_item_id: l.invoice_item_id,
      product_id: l.product_id,
      quantity: l.quantity,
      unit_price: l.unit_price,
      unit_price_original: l.unit_price,
      total_price: Math.round(l.unit_price * l.quantity * 100) / 100,
      tenant_id: tenantId as string,
    }));
    const { error: itemsErr } = await supabase.from("credit_note_items").insert(itemsPayload);
    if (itemsErr) {
      // Rollback orphan header
      await supabase.from("credit_notes").delete().eq("id", cn.id);
      throw mapRepoError(itemsErr, "تعذّر حفظ بنود إشعار الإرجاع.");
    }
    return { id: cn.id };
  },
};

export interface CreateCreditNoteDraftItem {
  invoice_item_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface CreateCreditNoteDraftInput {
  invoiceId: string;
  customerId: string;
  reason?: string | null;
  totalAmount: number;
  userId?: string | null;
  items: CreateCreditNoteDraftItem[];
}
