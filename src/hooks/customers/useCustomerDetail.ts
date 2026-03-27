import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { calculateCustomerHealth } from "@/lib/services/customerService";
import type { Customer, CustomerAddress } from "@/lib/customerConstants";
import type { Database } from "@/integrations/supabase/types";

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

export function useCustomerDetail(id: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('addresses');

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as Customer;
    },
    enabled: !!id,
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ['customer-addresses', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('customer_addresses').select('*').eq('customer_id', id!).order('is_default', { ascending: false });
      if (error) throw error;
      return data as CustomerAddress[];
    },
    enabled: !!id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['customer-invoices', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('*').eq('customer_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!id && ['invoices', 'financial', 'statement', 'analytics', 'aging'].includes(activeTab),
    staleTime: 30000,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['customer-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('*').eq('customer_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!id && ['payments', 'financial', 'statement', 'analytics'].includes(activeTab),
    staleTime: 30000,
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['customer-sales-orders', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('sales_orders').select('*').eq('customer_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && activeTab === 'orders',
    staleTime: 30000,
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ['customer-quotations', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('quotations').select('*').eq('customer_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && activeTab === 'quotations',
    staleTime: 30000,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['customer-activities', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('activity_logs').select('*').eq('entity_type', 'customer').eq('entity_id', id!).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: !!id && activeTab === 'activity',
  });

  const updateImageMutation = useMutation({
    mutationFn: async (imageUrl: string | null) => {
      const { error } = await supabase.from('customers').update({ image_url: imageUrl }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      toast({ title: "تم تحديث صورة العميل" });
    },
    onError: (error) => {
      logErrorSafely('CustomerDetailsPage', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      const { error } = await supabase.from('customer_addresses').delete().eq('id', addressId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', id] });
      toast({ title: "تم حذف العنوان بنجاح" });
    },
  });

  // Computed stats
  const totalPurchases = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalPayments = payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
  const paymentRatio = totalPurchases > 0 ? (totalPayments / totalPurchases) * 100 : 0;
  const avgInvoiceValue = invoices.length > 0 ? totalPurchases / invoices.length : 0;
  const lastPurchaseDate = invoices.length > 0 ? invoices[0].created_at : null;

  // DSO — Fixed: uses actual payment dates instead of due dates
  const dso = (() => {
    const paidInvoices = invoices.filter(inv => inv.payment_status === 'paid');
    if (paidInvoices.length === 0 || payments.length === 0) return null;

    // Build a map of invoice_id → latest payment date
    const paymentDatesByInvoice = new Map<string, string>();
    for (const payment of payments) {
      const invId = payment.invoice_id;
      if (!invId) continue;
      const existing = paymentDatesByInvoice.get(invId);
      if (!existing || payment.payment_date > existing) {
        paymentDatesByInvoice.set(invId, payment.payment_date);
      }
    }

    let totalDays = 0;
    let count = 0;
    for (const inv of paidInvoices) {
      const paidAt = paymentDatesByInvoice.get(inv.id);
      if (!paidAt) continue;
      const created = new Date(inv.created_at).getTime();
      const paid = new Date(paidAt).getTime();
      totalDays += Math.max(0, (paid - created) / (1000 * 60 * 60 * 24));
      count++;
    }

    return count > 0 ? Math.round(totalDays / count) : null;
  })();

  const clv = totalPurchases;

  const creditLimit = Number(customer?.credit_limit || 0);
  const currentBalance = Number(customer?.current_balance || 0);
  const creditUsagePercent = creditLimit > 0 ? Math.min((currentBalance / creditLimit) * 100, 100) : 0;
  const balanceIsDebit = currentBalance > 0;

  return {
    customer, isLoading, addresses, invoices, payments,
    salesOrders, quotations, activities,
    activeTab, setActiveTab,
    updateImageMutation, deleteAddressMutation,
    // Computed
    totalPurchases, totalPayments, paymentRatio, avgInvoiceValue,
    lastPurchaseDate, dso, clv,
    creditLimit, currentBalance, creditUsagePercent, balanceIsDebit,
  };
}
