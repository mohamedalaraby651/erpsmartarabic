/**
 * Payment Repository — مركز الوصول الوحيد لجدول `payments`.
 *
 * يغلّف كل عمليات CRUD + الإحصاءات + الحذف المؤمَّن.
 * الحذف يمرّ عبر paymentService (يتحقق من الصلاحية) — هنا فقط نوفّر
 * deleteById للاستخدام الداخلي من الـ service.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { sanitizeSearch } from "@/lib/utils/sanitize";
import { buildRange, mapRepoError } from "./_base";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];

export type PaymentWithRelations = PaymentRow & {
  customers: { name: string } | null;
  invoices: { invoice_number: string } | null;
};

export interface PaymentFilters {
  search?: string;
  paymentMethod?: string;
}

export interface PaymentListParams {
  filters?: PaymentFilters;
  page?: number;
  pageSize?: number;
}

export interface PaymentListResult {
  data: PaymentWithRelations[];
  count: number;
}

function applySearch<Q extends { or: (filter: string) => Q }>(q: Q, search?: string): Q {
  if (!search) return q;
  const s = sanitizeSearch(search);
  return q.or(`payment_number.ilike.%${s}%`);
}

export const paymentRepository = {
  async list({ filters, page = 1, pageSize = 25 }: PaymentListParams): Promise<PaymentListResult> {
    const range = buildRange({ page, pageSize })!;
    let q = supabase
      .from("payments")
      .select("*, customers(name), invoices(invoice_number)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(range.from, range.to);
    q = applySearch(q, filters?.search);
    const { data, count, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل المدفوعات.");
    return {
      data: (data || []) as PaymentWithRelations[],
      count: count ?? 0,
    };
  },

  async count(filters?: PaymentFilters): Promise<number> {
    let q = supabase.from("payments").select("*", { count: "exact", head: true });
    q = applySearch(q, filters?.search);
    const { count, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر حساب المدفوعات.");
    return count ?? 0;
  },

  async findById(id: string): Promise<PaymentRow | null> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw mapRepoError(error);
    return data;
  },

  async create(payload: PaymentInsert): Promise<PaymentRow> {
    const { data, error } = await supabase
      .from("payments")
      .insert(payload)
      .select()
      .single();
    if (error) throw mapRepoError(error, "تعذّر إنشاء الدفعة.");
    return data;
  },

  /**
   * حذف مباشر — يُستخدم فقط من paymentService بعد التحقق من الصلاحية.
   * Trigger `reverse_payment_on_delete` يعكس رصيد العميل تلقائياً.
   */
  async deleteById(id: string): Promise<void> {
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر حذف الدفعة.");
  },
};
