/**
 * Treasury Repository — typed access for cash registers and transactions.
 * Supplier-payment writes still flow through `recordSupplierPayment` to
 * preserve the atomic balance RPC contract.
 */
import { supabase } from "@/integrations/supabase/client";
import { mapRepoError } from "./_base";
import {
  recordSupplierPayment,
  type RecordSupplierPaymentData,
} from "@/lib/services/supplierService";

export interface CashRegisterRow {
  id: string;
  name: string;
  location: string | null;
  current_balance: number;
  is_active: boolean;
  assigned_to: string | null;
  created_at: string;
}

export interface CashTransactionRow {
  id: string;
  transaction_number: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  reference_type: string | null;
  register_id: string;
  created_at: string;
}

export interface CashTxFilters {
  registerId?: string;
  fromDate?: string; // ISO date (YYYY-MM-DD or full)
  toDate?: string;
  limit?: number;
}

export const treasuryRepository = {
  async listCashRegisters(): Promise<CashRegisterRow[]> {
    const { data, error } = await supabase
      .from("cash_registers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw mapRepoError(error, "تعذّر تحميل صناديق النقدية.");
    return (data ?? []) as CashRegisterRow[];
  },

  async getCashRegister(id: string): Promise<CashRegisterRow> {
    const { data, error } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw mapRepoError(error, "تعذّر تحميل بيانات الصندوق.");
    return data as CashRegisterRow;
  },

  async listCashTransactions(
    filters: CashTxFilters = {},
  ): Promise<CashTransactionRow[]> {
    let q = supabase
      .from("cash_transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters.registerId) q = q.eq("register_id", filters.registerId);
    if (filters.fromDate) q = q.gte("created_at", filters.fromDate);
    if (filters.toDate) q = q.lte("created_at", filters.toDate);
    if (filters.limit) q = q.limit(filters.limit);

    const { data, error } = await q;
    if (error) throw mapRepoError(error, "تعذّر تحميل حركات الصندوق.");
    return (data ?? []) as CashTransactionRow[];
  },

  /** Aggregate balance + today's income/expense net. */
  async getTreasuryBalances() {
    const today = new Date().toISOString().split("T")[0];
    const [registers, todayTx] = await Promise.all([
      this.listCashRegisters(),
      this.listCashTransactions({ fromDate: today }),
    ]);
    const totalBalance = registers.reduce(
      (s: number, r: CashRegisterRow) => s + Number(r.current_balance ?? 0),
      0,
    );
    const income = todayTx
      .filter((t: CashTransactionRow) => t.transaction_type === "income")
      .reduce((s: number, t: CashTransactionRow) => s + Number(t.amount), 0);
    const expense = todayTx
      .filter((t: CashTransactionRow) => t.transaction_type === "expense")
      .reduce((s: number, t: CashTransactionRow) => s + Number(t.amount), 0);
    return {
      totalBalance: Math.round(totalBalance * 100) / 100,
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      net: Math.round((income - expense) * 100) / 100,
    };
  },

  /** Thin wrapper — delegates to the atomic supplier-payment service. */
  async createSupplierPayment(input: RecordSupplierPaymentData): Promise<void> {
    return recordSupplierPayment(input);
  },

  // ============================================
  // Register CRUD
  // ============================================

  async createRegister(input: {
    name: string;
    location?: string | null;
    current_balance?: number;
    is_active?: boolean;
  }): Promise<void> {
    const { error } = await supabase.from("cash_registers").insert({
      name: input.name,
      location: input.location ?? null,
      current_balance: input.current_balance ?? 0,
      is_active: input.is_active ?? true,
    });
    if (error) throw mapRepoError(error, "تعذّر إضافة الصندوق.");
  },

  async updateRegister(
    id: string,
    input: { name: string; location?: string | null; is_active?: boolean },
  ): Promise<void> {
    const { error } = await supabase
      .from("cash_registers")
      .update({
        name: input.name,
        location: input.location ?? null,
        is_active: input.is_active ?? true,
      })
      .eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر تحديث الصندوق.");
  },

  // ============================================
  // Manual income / expense transaction
  // ============================================

  async recordCashTransaction(input: {
    registerId: string;
    currentBalance: number;
    transactionType: "income" | "expense";
    amount: number;
    description?: string | null;
    userId?: string | null;
  }): Promise<void> {
    const amt = Number(input.amount);
    const newBalance =
      input.transactionType === "income"
        ? Number(input.currentBalance) + amt
        : Number(input.currentBalance) - amt;
    if (input.transactionType === "expense" && newBalance < 0) {
      throw new Error("الرصيد غير كافي لإتمام عملية السحب");
    }
    const txnNumber = `TXN-${Date.now()}`;
    const { error: txnErr } = await supabase.from("cash_transactions").insert({
      transaction_number: txnNumber,
      register_id: input.registerId,
      transaction_type: input.transactionType,
      amount: amt,
      balance_after: newBalance,
      description: input.description ?? null,
      reference_type: "manual",
      created_by: input.userId ?? null,
    });
    if (txnErr) throw mapRepoError(txnErr, "تعذّر تسجيل الحركة.");
    const { error: regErr } = await supabase
      .from("cash_registers")
      .update({ current_balance: newBalance })
      .eq("id", input.registerId);
    if (regErr) throw mapRepoError(regErr, "تعذّر تحديث رصيد الصندوق.");
  },
};
