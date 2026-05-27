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
      (s, r) => s + Number(r.current_balance ?? 0),
      0,
    );
    const income = todayTx
      .filter((t) => t.transaction_type === "income")
      .reduce((s, t) => s + Number(t.amount), 0);
    const expense = todayTx
      .filter((t) => t.transaction_type === "expense")
      .reduce((s, t) => s + Number(t.amount), 0);
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
};
