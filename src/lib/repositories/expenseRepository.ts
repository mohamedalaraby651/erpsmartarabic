/**
 * Expense Repository — canonical data access for `expenses`
 * (+ supporting lookups: expense_categories, cash_registers).
 *
 * Approval / rejection flows MUST go through the `approve-expense` Edge
 * Function — this repository deliberately does NOT expose status mutations.
 */

import { supabase } from "@/integrations/supabase/client";
import { mapRepoError } from "./_base";

export type ExpensePaymentMethod = "cash" | "bank" | "card";
export type ExpenseStatus = "pending" | "approved" | "rejected";

export interface ExpenseFilters {
  status?: ExpenseStatus | "all";
}

export interface ExpenseInput {
  category_id?: string | null;
  amount: number;
  payment_method: ExpensePaymentMethod;
  register_id?: string | null;
  expense_date: string;
  description?: string | null;
  supplier_id?: string | null;
  created_by?: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const expenseRepository = {
  async list(filters: ExpenseFilters = {}) {
    let q = supabase
      .from("expenses")
      .select(`
        *,
        category:expense_categories(id, name),
        supplier:suppliers(id, name)
      `)
      .order("created_at", { ascending: false });

    if (filters.status && filters.status !== "all") {
      q = q.eq("status", filters.status);
    }

    const { data, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل المصروفات.");
    return data ?? [];
  },

  async stats() {
    const { data, error } = await supabase.from("expenses").select("status, amount");
    if (error) throw mapRepoError(error, "تعذّر حساب إحصائيات المصروفات.");

    const pending = round2(
      (data ?? [])
        .filter((e) => e.status === "pending")
        .reduce((s, e) => s + Number(e.amount), 0),
    );
    const approved = round2(
      (data ?? [])
        .filter((e) => e.status === "approved")
        .reduce((s, e) => s + Number(e.amount), 0),
    );
    const pendingCount = (data ?? []).filter((e) => e.status === "pending").length;
    return { pending, approved, pendingCount };
  },

  async create(input: ExpenseInput): Promise<void> {
    const expense_number = `EXP-${Date.now()}`;
    const { error } = await supabase.from("expenses").insert({
      ...input,
      amount: round2(input.amount),
      expense_number,
      register_id:
        input.payment_method === "cash" ? input.register_id ?? null : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (error) throw mapRepoError(error, "تعذّر إضافة المصروف.");
  },

  async update(id: string, input: ExpenseInput): Promise<void> {
    const { error } = await supabase
      .from("expenses")
      .update({
        ...input,
        amount: round2(input.amount),
        register_id:
          input.payment_method === "cash" ? input.register_id ?? null : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر تحديث المصروف.");
  },

  // ----- Reference lookups -----
  async listCategories() {
    const { data, error } = await supabase
      .from("expense_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    if (error) throw mapRepoError(error, "تعذّر تحميل تصنيفات المصروفات.");
    return data ?? [];
  },

  async listActiveCashRegisters() {
    const { data, error } = await supabase
      .from("cash_registers")
      .select("id, name, current_balance")
      .eq("is_active", true)
      .order("name");
    if (error) throw mapRepoError(error, "تعذّر تحميل الصناديق.");
    return data ?? [];
  },
};
