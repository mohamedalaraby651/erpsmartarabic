/**
 * Reports Repository — read-only aggregations for analytical dashboards
 * (cash-flow, etc.). Keeps UI components free of direct supabase.from() calls.
 */

import { supabase } from "@/integrations/supabase/client";
import { mapRepoError } from "./_base";

export interface CashFlowRow {
  amount: number;
  date: string; // ISO
  payment_method?: string | null;
}

export interface CashFlowBundle {
  payments: CashFlowRow[];
  expenses: CashFlowRow[];
  supplierPayments: CashFlowRow[];
}

export const reportsRepository = {
  async cashFlow(from: Date, to: Date): Promise<CashFlowBundle> {
    const fromStr = from.toISOString();
    const toStr = to.toISOString();

    const [payRes, expRes, spRes] = await Promise.all([
      supabase
        .from("payments")
        .select("amount, payment_date, payment_method")
        .gte("payment_date", fromStr)
        .lte("payment_date", toStr),
      supabase
        .from("expenses")
        .select("amount, expense_date, payment_method")
        .gte("expense_date", fromStr)
        .lte("expense_date", toStr)
        .eq("status", "approved"),
      supabase
        .from("supplier_payments")
        .select("amount, payment_date, payment_method")
        .gte("payment_date", fromStr)
        .lte("payment_date", toStr),
    ]);

    if (payRes.error) throw mapRepoError(payRes.error, "تعذّر تحميل التحصيلات.");
    if (expRes.error) throw mapRepoError(expRes.error, "تعذّر تحميل المصروفات.");
    if (spRes.error) throw mapRepoError(spRes.error, "تعذّر تحميل مدفوعات الموردين.");

    const toRow = (r: any, dateKey: string): CashFlowRow => ({
      amount: Number(r.amount ?? 0),
      date: String(r[dateKey] ?? ""),
      payment_method: r.payment_method ?? null,
    });

    return {
      payments: (payRes.data ?? []).map((r) => toRow(r, "payment_date")),
      expenses: (expRes.data ?? []).map((r) => toRow(r, "expense_date")),
      supplierPayments: (spRes.data ?? []).map((r) => toRow(r, "payment_date")),
    };
  },
};
