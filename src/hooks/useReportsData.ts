import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ar } from "date-fns/locale";

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function useReportsData(startDate: Date, endDate: Date) {
  const periodDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const previousStartDate = subDays(startDate, periodDays);

  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ["sales-report", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("total_amount, created_at, payment_status")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());
      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIME,
  });

  const { data: prevSalesData } = useQuery({
    queryKey: ["prev-sales-report", previousStartDate.toISOString(), startDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("total_amount, payment_status")
        .gte("created_at", previousStartDate.toISOString())
        .lt("created_at", startDate.toISOString());
      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIME,
  });

  const { data: topProducts } = useQuery({
    queryKey: ["top-products", startDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_items")
        .select(`quantity, total_price, products (name), invoices!inner (created_at)`)
        .gte("invoices.created_at", startDate.toISOString());
      if (error) throw error;

      const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      data?.forEach((item) => {
        const name = item.products?.name || "غير معروف";
        const current = productMap.get(name) || { name, quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += Number(item.total_price);
        productMap.set(name, current);
      });
      return Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    },
    staleTime: STALE_TIME,
  });

  const { data: topCustomers } = useQuery({
    queryKey: ["top-customers", startDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`total_amount, customers (name)`)
        .gte("created_at", startDate.toISOString());
      if (error) throw error;

      const customerMap = new Map<string, { name: string; total: number; count: number }>();
      data?.forEach((invoice) => {
        const name = invoice.customers?.name || "غير معروف";
        const current = customerMap.get(name) || { name, total: 0, count: 0 };
        current.total += Number(invoice.total_amount);
        current.count += 1;
        customerMap.set(name, current);
      });
      return Array.from(customerMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);
    },
    staleTime: STALE_TIME,
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ["low-stock"],
    queryFn: async () => {
      const [{ data: products, error: productsError }, { data: stocks, error: stocksError }] = await Promise.all([
        supabase.from("products").select("id, name, min_stock, is_active").eq("is_active", true),
        supabase.from("product_stock").select("product_id, quantity"),
      ]);
      if (productsError) throw productsError;
      if (stocksError) throw stocksError;

      const stockMap = new Map<string, number>();
      stocks?.forEach((s) => stockMap.set(s.product_id, (stockMap.get(s.product_id) || 0) + s.quantity));

      return products
        ?.map((p) => ({ name: p.name, currentStock: stockMap.get(p.id) || 0, minStock: p.min_stock || 0 }))
        .filter((p) => p.currentStock <= p.minStock)
        .slice(0, 10);
    },
    staleTime: STALE_TIME,
  });

  const { data: paymentDistribution } = useQuery({
    queryKey: ["payment-distribution", startDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("payment_status, total_amount")
        .gte("created_at", startDate.toISOString());
      if (error) throw error;

      const statusMap = new Map<string, number>();
      data?.forEach((inv) => statusMap.set(inv.payment_status, (statusMap.get(inv.payment_status) || 0) + Number(inv.total_amount)));

      const labels: Record<string, string> = { paid: "مدفوع", pending: "معلق", partial: "جزئي", overdue: "متأخر" };
      return Array.from(statusMap.entries()).map(([status, value]) => ({ name: labels[status] || status, value }));
    },
    staleTime: STALE_TIME,
  });

  // Optimized: single batched query instead of 6 sequential ones
  const { data: monthlyTrend } = useQuery({
    queryKey: ["monthly-trend"],
    queryFn: async () => {
      const months = Array.from({ length: 6 }, (_, i) => {
        const monthStart = startOfMonth(subMonths(new Date(), 5 - i));
        const monthEnd = endOfMonth(subMonths(new Date(), 5 - i));
        return { month: format(monthStart, "MMM", { locale: ar }), start: monthStart.toISOString(), end: monthEnd.toISOString() };
      });

      // Batch: 2 queries instead of 12
      const [{ data: invoices }, { data: purchases }] = await Promise.all([
        supabase.from("invoices").select("total_amount, created_at").gte("created_at", months[0].start).lte("created_at", months[5].end),
        supabase.from("purchase_orders").select("total_amount, created_at").gte("created_at", months[0].start).lte("created_at", months[5].end),
      ]);

      return months.map(({ month, start, end }) => {
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        return {
          month,
          sales: invoices?.filter(i => { const t = new Date(i.created_at).getTime(); return t >= s && t <= e; }).reduce((sum, i) => sum + Number(i.total_amount), 0) || 0,
          purchases: purchases?.filter(p => { const t = new Date(p.created_at).getTime(); return t >= s && t <= e; }).reduce((sum, p) => sum + Number(p.total_amount), 0) || 0,
        };
      });
    },
    staleTime: STALE_TIME,
  });

  // Computed stats
  const totalSales = salesData?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const paidAmount = salesData?.filter((s) => s.payment_status === "paid").reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const unpaidAmount = totalSales - paidAmount;
  const invoiceCount = salesData?.length || 0;
  const prevTotalSales = prevSalesData?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const prevPaidAmount = prevSalesData?.filter(s => s.payment_status === "paid").reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const salesTrend = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales * 100) : null;
  const collectionTrend = prevPaidAmount > 0 ? ((paidAmount - prevPaidAmount) / prevPaidAmount * 100) : null;

  return {
    salesData, loadingSales,
    topProducts, topCustomers, lowStockProducts,
    paymentDistribution, monthlyTrend,
    totalSales, paidAmount, unpaidAmount, invoiceCount,
    salesTrend, collectionTrend,
  };
}
