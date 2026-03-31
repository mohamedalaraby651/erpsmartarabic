import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { calculateCustomerHealth } from "@/lib/services/customerService";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import { customerRepository } from "@/lib/repositories/customerRepository";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Customer, CustomerAddress } from "@/lib/customerConstants";

export function useCustomerDetail(id: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('financial');

  // === CORE queries (always loaded) ===
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

  // === LAZY queries (loaded on tab open, or all at once on mobile) ===
  const invoicesNeeded = isMobile || ['invoices', 'financial', 'statement', 'aging', 'analytics'].includes(activeTab);
  const { data: invoices = [] } = useQuery({
    queryKey: ['customer-invoices', id],
    queryFn: () => customerRepository.findInvoices(id!),
    enabled: !!id && invoicesNeeded,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const paymentsNeeded = isMobile || ['payments', 'financial', 'statement', 'analytics'].includes(activeTab);
  const { data: payments = [] } = useQuery({
    queryKey: ['customer-payments', id],
    queryFn: () => customerRepository.findPayments(id!),
    enabled: !!id && paymentsNeeded,
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

  // Computed stats via domain service
  const healthMetrics = calculateCustomerHealth(invoices, payments);
  const { totalPurchases, totalPayments, paymentRatio, avgInvoiceValue, dso, clv, totalOutstanding } = healthMetrics;
  const lastPurchaseDate = invoices.length > 0 ? invoices[0].created_at : null;

  const creditLimit = Number(customer?.credit_limit || 0);
  const currentBalance = Number(customer?.current_balance || 0);
  const creditUsagePercent = creditLimit > 0 ? Math.min((currentBalance / creditLimit) * 100, 100) : 0;
  const balanceIsDebit = currentBalance > 0;

  return {
    customer, isLoading, addresses, invoices, payments, creditNotes,
    salesOrders, quotations, activities,
    activeTab, setActiveTab,
    updateImageMutation, deleteAddressMutation,
    totalPurchases, totalPayments, paymentRatio, avgInvoiceValue,
    lastPurchaseDate, dso, clv, totalOutstanding,
    creditLimit, currentBalance, creditUsagePercent, balanceIsDebit,
  };
}
