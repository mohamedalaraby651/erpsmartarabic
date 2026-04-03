import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { supplierRepository } from "@/lib/repositories/supplierRepository";
import { supplierRelationsRepo } from "@/lib/repositories/supplierRelationsRepo";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

interface FinancialSummary {
  totalPurchases: number;
  totalPayments: number;
  totalOutstanding: number;
  orderCount: number;
  pendingOrderCount: number;
  lastOrderDate: string | null;
  avgOrderValue: number;
  paymentRatio: number;
  dso: number | null;
}

export function useSupplierDetail(id: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('info');
  const [orderPage, setOrderPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const orderPageSize = 20;
  const paymentPageSize = 20;

  // === CORE: supplier data ===
  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => supplierRepository.findById(id!),
    enabled: !!id,
  });

  // === FINANCIAL SUMMARY via server-side RPC ===
  const { data: financialSummary } = useQuery({
    queryKey: ['supplier-financial-summary', id],
    queryFn: async (): Promise<FinancialSummary> => {
      const { data, error } = await supabase.rpc('get_supplier_financial_summary', {
        _supplier_id: id!,
      });
      if (error) throw error;
      const d = data as Record<string, number | null>;
      return {
        totalPurchases: d.total_purchases ?? 0,
        totalPayments: d.total_payments ?? 0,
        totalOutstanding: d.total_outstanding ?? 0,
        orderCount: d.order_count ?? 0,
        pendingOrderCount: d.pending_order_count ?? 0,
        lastOrderDate: (d.last_order_date as unknown as string) ?? null,
        avgOrderValue: d.avg_order_value ?? 0,
        paymentRatio: d.payment_ratio ?? 0,
        dso: d.dso ?? null,
      };
    },
    enabled: !!id,
    staleTime: 60000,
  });

  // === CHART DATA via server-side RPC ===
  const { data: chartData } = useQuery({
    queryKey: ['supplier-chart-data', id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_supplier_chart_data', { _supplier_id: id! });
      if (error) throw error;
      return data as {
        monthly_data: Array<{ month: string; purchase_total: number; purchase_count: number; payment_total: number; payment_count: number }>;
        top_products: Array<{ product_name: string; total_quantity: number; total_cost: number }>;
      };
    },
    enabled: !!id && (isMobile || activeTab === 'analytics'),
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  // === LAZY queries (paginated only) ===
  const { data: paginatedOrders } = useQuery({
    queryKey: ['supplier-orders-paginated', id, orderPage, orderPageSize],
    queryFn: () => supplierRelationsRepo.findPurchaseOrdersPaginated(id!, orderPage, orderPageSize),
    enabled: !!id && (isMobile || activeTab === 'orders'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: paginatedPayments } = useQuery({
    queryKey: ['supplier-payments-paginated', id, paymentPage, paymentPageSize],
    queryFn: () => supplierRelationsRepo.findPaymentsPaginated(id!, paymentPage, paymentPageSize),
    enabled: !!id && (isMobile || activeTab === 'payments'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['supplier-activities', id],
    queryFn: () => supplierRelationsRepo.findActivities(id!),
    enabled: !!id && (isMobile || activeTab === 'activity'),
  });

  // === MUTATIONS ===
  const updateRatingMutation = useMutation({
    mutationFn: async (rating: number) => {
      const { error } = await supabase.from('suppliers').update({ rating }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier', id] });
      toast({ title: "تم تحديث التقييم بنجاح" });
    },
    onError: (error) => {
      logErrorSafely('SupplierDetail', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  // Derived values from RPC (no more redundant fetches)
  const fs = financialSummary;
  const totalPurchases = fs?.totalPurchases ?? 0;
  const totalPayments = fs?.totalPayments ?? 0;
  const totalOutstanding = fs?.totalOutstanding ?? 0;
  const orderCount = fs?.orderCount ?? 0;
  const pendingOrderCount = fs?.pendingOrderCount ?? 0;
  const avgOrderValue = fs?.avgOrderValue ?? 0;
  const paymentRatio = fs?.paymentRatio ?? 0;
  const dso = fs?.dso ?? null;
  const lastOrderDate = fs?.lastOrderDate ?? null;

  const currentBalance = Number(supplier?.current_balance || 0);
  const creditLimit = Number(supplier?.credit_limit || 0);
  const hasHighBalance = currentBalance > 50000;
  const creditExceeded = creditLimit > 0 && currentBalance >= creditLimit;

  const goToOrderPage = useCallback((p: number) => setOrderPage(p), []);
  const goToPaymentPage = useCallback((p: number) => setPaymentPage(p), []);

  return {
    supplier, isLoading, activities, chartData,
    activeTab, setActiveTab,
    updateRatingMutation,
    totalPurchases, totalPayments, totalOutstanding, orderCount,
    pendingOrderCount, avgOrderValue, paymentRatio, dso,
    currentBalance, creditLimit, hasHighBalance, creditExceeded, lastOrderDate,
    // Paginated
    paginatedOrders, orderPage, orderPageSize, goToOrderPage,
    paginatedPayments, paymentPage, paymentPageSize, goToPaymentPage,
  };
}
