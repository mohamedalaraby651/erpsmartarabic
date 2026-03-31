import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import { customerRepository } from "@/lib/repositories/customerRepository";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import type { Customer, CustomerAddress } from "@/lib/customerConstants";

interface FinancialSummary {
  totalPurchases: number;
  totalPayments: number;
  totalOutstanding: number;
  totalCreditNotes: number;
  invoiceCount: number;
  avgInvoiceValue: number;
  paymentRatio: number;
  dso: number | null;
  clv: number;
}

export function useCustomerDetail(id: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('financial');
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const invoicePageSize = 20;
  const paymentPageSize = 20;

  // === CORE: customer data ===
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerRepository.findById(id!),
    enabled: !!id,
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ['customer-addresses', id],
    queryFn: () => customerRepository.findAddresses(id!),
    enabled: !!id,
  });

  // === FINANCIAL SUMMARY via server-side RPC (replaces client-side calculation) ===
  const { data: financialSummary } = useQuery({
    queryKey: ['customer-financial-summary', id],
    queryFn: async (): Promise<FinancialSummary> => {
      const { data, error } = await supabase.rpc('get_customer_financial_summary', {
        _customer_id: id!,
      });
      if (error) throw error;
      const d = data as Record<string, number | null>;
      return {
        totalPurchases: d.total_purchases ?? 0,
        totalPayments: d.total_payments ?? 0,
        totalOutstanding: d.total_outstanding ?? 0,
        totalCreditNotes: d.total_credit_notes ?? 0,
        invoiceCount: d.invoice_count ?? 0,
        avgInvoiceValue: d.avg_invoice_value ?? 0,
        paymentRatio: d.payment_ratio ?? 0,
        dso: d.dso ?? null,
        clv: d.clv ?? 0,
      };
    },
    enabled: !!id,
    staleTime: 60000,
  });

  // === LAZY queries (loaded on tab open) ===
  const invoicesNeeded = isMobile || ['invoices', 'statement', 'aging', 'analytics'].includes(activeTab);
  const { data: invoices = [] } = useQuery({
    queryKey: ['customer-invoices', id],
    queryFn: () => customerRepository.findInvoices(id!),
    enabled: !!id && invoicesNeeded,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Paginated invoices for display in tabs
  const { data: paginatedInvoices } = useQuery({
    queryKey: ['customer-invoices-paginated', id, invoicePage, invoicePageSize],
    queryFn: () => customerRepository.findInvoicesPaginated(id!, invoicePage, invoicePageSize),
    enabled: !!id && (isMobile || activeTab === 'invoices'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const paymentsNeeded = isMobile || ['payments', 'statement', 'analytics'].includes(activeTab);
  const { data: payments = [] } = useQuery({
    queryKey: ['customer-payments', id],
    queryFn: () => customerRepository.findPayments(id!),
    enabled: !!id && paymentsNeeded,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Paginated payments for display in tabs
  const { data: paginatedPayments } = useQuery({
    queryKey: ['customer-payments-paginated', id, paymentPage, paymentPageSize],
    queryFn: () => customerRepository.findPaymentsPaginated(id!, paymentPage, paymentPageSize),
    enabled: !!id && (isMobile || activeTab === 'payments'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: creditNotes = [] } = useQuery({
    queryKey: ['customer-credit-notes', id],
    queryFn: () => customerRepository.findCreditNotes(id!),
    enabled: !!id && (isMobile || ['statement', 'credit-notes'].includes(activeTab)),
    staleTime: 60000,
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['customer-sales-orders', id],
    queryFn: () => customerRepository.findSalesOrders(id!),
    enabled: !!id && (isMobile || activeTab === 'orders'),
    staleTime: 60000,
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ['customer-quotations', id],
    queryFn: () => customerRepository.findQuotations(id!),
    enabled: !!id && (isMobile || activeTab === 'quotations'),
    staleTime: 60000,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['customer-activities', id],
    queryFn: () => customerRepository.findActivities(id!),
    enabled: !!id && (isMobile || activeTab === 'activity'),
  });

  const updateImageMutation = useMutation({
    mutationFn: (imageUrl: string | null) => customerRepository.updateImage(id!, imageUrl),
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
      const hasPermission = await verifyPermissionOnServer('customers', 'delete');
      if (!hasPermission) {
        throw new Error('غير مصرح لك بحذف العناوين');
      }
      return customerRepository.deleteAddress(addressId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', id] });
      toast({ title: "تم حذف العنوان بنجاح" });
    },
    onError: (error) => {
      logErrorSafely('CustomerDetailsPage', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  // Use server-computed stats (fallback to 0 if not loaded yet)
  const fs = financialSummary;
  const totalPurchases = fs?.totalPurchases ?? 0;
  const totalPayments = fs?.totalPayments ?? 0;
  const paymentRatio = fs?.paymentRatio ?? 0;
  const avgInvoiceValue = fs?.avgInvoiceValue ?? 0;
  const dso = fs?.dso ?? null;
  const clv = fs?.clv ?? 0;
  const totalOutstanding = fs?.totalOutstanding ?? 0;
  const lastPurchaseDate = invoices.length > 0 ? invoices[0].created_at : null;

  const creditLimit = Number(customer?.credit_limit || 0);
  const currentBalance = Number(customer?.current_balance || 0);
  const creditUsagePercent = creditLimit > 0 ? Math.min((currentBalance / creditLimit) * 100, 100) : 0;
  const balanceIsDebit = currentBalance > 0;

  const goToInvoicePage = useCallback((p: number) => setInvoicePage(p), []);
  const goToPaymentPage = useCallback((p: number) => setPaymentPage(p), []);

  return {
    customer, isLoading, addresses, invoices, payments, creditNotes,
    salesOrders, quotations, activities,
    activeTab, setActiveTab,
    updateImageMutation, deleteAddressMutation,
    totalPurchases, totalPayments, paymentRatio, avgInvoiceValue,
    lastPurchaseDate, dso, clv, totalOutstanding,
    creditLimit, currentBalance, creditUsagePercent, balanceIsDebit,
    // Paginated data for tabs
    paginatedInvoices, invoicePage, invoicePageSize, goToInvoicePage,
    paginatedPayments, paymentPage, paymentPageSize, goToPaymentPage,
  };
}
