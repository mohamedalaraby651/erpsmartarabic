/**
 * Collection Repository — typed access for collection dashboard.
 * Reads unpaid/partial invoices with customer info; tenant scoping via RLS.
 */
import { supabase } from "@/integrations/supabase/client";
import { mapRepoError } from "./_base";

export interface CollectionInvoiceRow {
  id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number | null;
  due_date: string | null;
  created_at: string;
  payment_status: string;
  customers: { id: string; name: string; phone: string | null } | null;
}

export const collectionRepository = {
  async listUnpaidInvoices(): Promise<CollectionInvoiceRow[]> {
    const { data, error } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, total_amount, paid_amount, due_date, created_at, payment_status, customers(id, name, phone)",
      )
      .in("payment_status", ["pending", "partial"])
      .neq("status", "cancelled")
      .order("due_date", { ascending: true });
    if (error) throw mapRepoError(error, "تعذّر تحميل فواتير التحصيل.");
    return (data ?? []) as unknown as CollectionInvoiceRow[];
  },
};
