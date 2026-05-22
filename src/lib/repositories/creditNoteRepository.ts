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
};
