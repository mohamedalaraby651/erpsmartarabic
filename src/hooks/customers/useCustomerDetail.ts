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
    enabled: !!id,
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

  // Computed stats via domain service
  const healthMetrics = calculateCustomerHealth(invoices, payments);
  const { totalPurchases, totalPayments, paymentRatio, avgInvoiceValue, dso, clv } = healthMetrics;
  const lastPurchaseDate = invoices.length > 0 ? invoices[0].created_at : null;

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
