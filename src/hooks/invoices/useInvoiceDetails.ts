import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];

export type InvoiceWithCustomer = Invoice & { customers: Customer | null };

export interface PaymentRow {
  id: string; payment_number: string; payment_date: string;
  amount: number; payment_method: string; reference_number: string | null;
}

export interface ActivityRow { id: string; action: string; created_at: string; }

export function useInvoiceDetails(id: string | undefined) {
  const { data: invoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as InvoiceWithCustomer | null;
    },
    enabled: !!id,
  });

  const { data: invoiceItems = [] } = useQuery({
    queryKey: ['invoice-items', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*, products(id, name, sku), product_variants(id, name)')
        .eq('invoice_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['invoice-payments', id],
    queryFn: async (): Promise<PaymentRow[]> => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('payments').select('*').eq('invoice_id', id)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data as PaymentRow[];
    },
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['invoice-activities', id],
    queryFn: async (): Promise<ActivityRow[]> => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('activity_logs').select('*')
        .eq('entity_type', 'invoice').eq('entity_id', id)
        .order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data as ActivityRow[];
    },
    enabled: !!id,
  });

  const totalAmount = Number(invoice?.total_amount || 0);
  const paidAmount = Number(invoice?.paid_amount || 0);
  const remainingAmount = totalAmount - paidAmount;
  const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  const isOverdue = invoice?.due_date && new Date(invoice.due_date) < new Date() && invoice.payment_status !== 'paid';

  return {
    invoice, loadingInvoice, invoiceItems, payments, activities,
    totalAmount, paidAmount, remainingAmount, paymentProgress, isOverdue,
  };
}
