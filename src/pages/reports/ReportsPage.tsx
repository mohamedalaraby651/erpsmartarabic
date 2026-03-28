import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ar } from "date-fns/locale";
import { TrendingUp, TrendingDown, DollarSign, Package, Users, FileText, AlertTriangle, BarChart3 } from "lucide-react";
import { ExportButton } from "@/components/reports/ExportButton";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import PageHeader from "@/components/navigation/PageHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { Badge } from "@/components/ui/badge";
import { ProfitabilityReport } from "@/components/reports/ProfitabilityReport";
import { AgingReport } from "@/components/reports/AgingReport";
import { InventoryFlowReport } from "@/components/reports/InventoryFlowReport";
import { TrialBalanceReport } from "@/components/reports/TrialBalanceReport";
import { IncomeStatementReport } from "@/components/reports/IncomeStatementReport";
import { GeographicReport } from "@/components/reports/GeographicReport";
import { InactiveCustomersReport } from "@/components/reports/InactiveCustomersReport";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function ReportsPage() {
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState("30");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const startDate = customFrom || subDays(new Date(), parseInt(period));
  const endDate = customTo || new Date();

  // Sales Report Data
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ["sales-report", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("total_amount, created_at, payment_status")
        .gte("created_at", startDate.toISOString());
      if (error) throw error;
      return data;
    },
  });

  // Previous period for trend comparison
  const periodDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const previousStartDate = subDays(startDate, periodDays);
  const { data: prevSalesData } = useQuery({
    queryKey: ["prev-sales-report", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("total_amount, payment_status")
        .gte("created_at", previousStartDate.toISOString())
        .lt("created_at", startDate.toISOString());
      if (error) throw error;
      return data;
    },
  });

  // Top Products
  const { data: topProducts } = useQuery({
    queryKey: ["top-products", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_items")
        .select(`
          quantity,
          total_price,
          products (name),
          invoices!inner (created_at)
        `)
        .gte("invoices.created_at", startDate.toISOString());
      if (error) throw error;

      const productMap = new Map();
      data?.forEach((item) => {
        const name = item.products?.name || "غير معروف";
        const current = productMap.get(name) || { name, quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += Number(item.total_price);
        productMap.set(name, current);
      });

      return Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
  });

  // Top Customers
  const { data: topCustomers } = useQuery({
    queryKey: ["top-customers", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          total_amount,
          customers (name)
        `)
        .gte("created_at", startDate.toISOString());
      if (error) throw error;

      const customerMap = new Map();
      data?.forEach((invoice) => {
        const name = invoice.customers?.name || "غير معروف";
        const current = customerMap.get(name) || { name, total: 0, count: 0 };
        current.total += Number(invoice.total_amount);
        current.count += 1;
        customerMap.set(name, current);
      });

      return Array.from(customerMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    },
  });

  // Low Stock Products
  const { data: lowStockProducts } = useQuery({
    queryKey: ["low-stock"],
    queryFn: async () => {
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, min_stock, is_active")
        .eq("is_active", true);
      if (productsError) throw productsError;

      const { data: stocks, error: stocksError } = await supabase
        .from("product_stock")
        .select("product_id, quantity");
      if (stocksError) throw stocksError;

      const stockMap = new Map();
      stocks?.forEach((s) => {
        const current = stockMap.get(s.product_id) || 0;
        stockMap.set(s.product_id, current + s.quantity);
      });

      return products
        ?.map((p) => ({
          name: p.name,
          currentStock: stockMap.get(p.id) || 0,
          minStock: p.min_stock || 0,
        }))
        .filter((p) => p.currentStock <= p.minStock)
        .slice(0, 10);
    },
  });

  // Payment Status Distribution
  const { data: paymentDistribution } = useQuery({
    queryKey: ["payment-distribution", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("payment_status, total_amount")
        .gte("created_at", startDate.toISOString());
      if (error) throw error;

      const statusMap = new Map();
      data?.forEach((inv) => {
        const current = statusMap.get(inv.payment_status) || 0;
        statusMap.set(inv.payment_status, current + Number(inv.total_amount));
      });

      const labels: Record<string, string> = {
        paid: "مدفوع",
        pending: "معلق",
        partial: "جزئي",
        overdue: "متأخر",
      };

      return Array.from(statusMap.entries()).map(([status, value]) => ({
        name: labels[status] || status,
        value,
      }));
    },
  });

  // Monthly Trend
  const { data: monthlyTrend } = useQuery({
    queryKey: ["monthly-trend"],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(subMonths(new Date(), i));
        months.push({
          month: format(monthStart, "MMM", { locale: ar }),
          start: monthStart.toISOString(),
          end: monthEnd.toISOString(),
        });
      }

      const results = await Promise.all(
        months.map(async ({ month, start, end }) => {
          const { data: invoices } = await supabase
            .from("invoices")
            .select("total_amount")
            .gte("created_at", start)
            .lte("created_at", end);

          const { data: purchases } = await supabase
            .from("purchase_orders")
            .select("total_amount")
            .gte("created_at", start)
            .lte("created_at", end);

          return {
            month,
            sales: invoices?.reduce((sum, i) => sum + Number(i.total_amount), 0) || 0,
            purchases: purchases?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0,
          };
        })
      );

      return results;
    },
  });

  // Calculate summary stats
  const totalSales = salesData?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const paidAmount = salesData?.filter((s) => s.payment_status === "paid").reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const unpaidAmount = totalSales - paidAmount;
  const invoiceCount = salesData?.length || 0;
  const prevTotalSales = prevSalesData?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const prevPaidAmount = prevSalesData?.filter(s => s.payment_status === "paid").reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const salesTrend = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales * 100) : null;
  const collectionTrend = prevPaidAmount > 0 ? ((paidAmount - prevPaidAmount) / prevPaidAmount * 100) : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " ج.م";
  };

  // Prepare export data
  const salesExportData = salesData?.map((s) => ({
    date: format(new Date(s.created_at), 'yyyy-MM-dd'),
    amount: s.total_amount,
    status: s.payment_status,
  })) || [];

  // Mobile Summary Cards Component
  const MobileSummaryCards = () => (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">{formatCurrency(totalSales)}</p>
              <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-success/10">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-lg font-bold text-success">{formatCurrency(paidAmount)}</p>
              <p className="text-xs text-muted-foreground">المحصل</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-destructive/10">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-lg font-bold text-destructive">{formatCurrency(unpaidAmount)}</p>
              <p className="text-xs text-muted-foreground">المستحق</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-info/10">
              <FileText className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="text-lg font-bold">{invoiceCount}</p>
              <p className="text-xs text-muted-foreground">الفواتير</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Mobile Top Items List
  const MobileTopItemsList = ({ items, type }: { items: Array<{ name: string; revenue?: number; total?: number }>; type: 'products' | 'customers' }) => (
    <div className="space-y-2">
      {items?.map((item, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
              {index + 1}
            </Badge>
            <span className="font-medium">{item.name}</span>
          </div>
          <span className="font-bold text-primary">
            {formatCurrency(type === 'products' ? item.revenue : item.total)}
          </span>
        </div>
      ))}
    </div>
  );

  // Mobile Low Stock List
  const MobileLowStockList = ({ items }: { items: Array<{ name: string; minStock: number; currentStock: number }> }) => (
    <div className="space-y-2">
      {items?.map((item, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">الحد الأدنى: {item.minStock}</p>
          </div>
          <Badge variant="destructive">{item.currentStock}</Badge>
        </div>
      ))}
    </div>
  );

  if (loadingSales) {
    return (
      <div className="space-y-6" dir="rtl">
        <PageHeader
          title="التقارير والتحليلات"
          description="نظرة شاملة على أداء الأعمال"
          showBack
        />
        {isMobile ? (
          <MobileListSkeleton count={4} />
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="التقارير والتحليلات"
        description="نظرة شاملة على أداء الأعمال"
        showBack
      />

      <div className="flex flex-wrap items-center gap-4">
        <Select value={period} onValueChange={(value) => {
          setPeriod(value);
          setCustomFrom(undefined);
          setCustomTo(undefined);
        }}>
          <SelectTrigger className={isMobile ? "w-full" : "w-40"}>
            <SelectValue placeholder="الفترة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">آخر 7 أيام</SelectItem>
            <SelectItem value="30">آخر 30 يوم</SelectItem>
            <SelectItem value="90">آخر 3 أشهر</SelectItem>
            <SelectItem value="365">آخر سنة</SelectItem>
          </SelectContent>
        </Select>

        {!isMobile && (
          <>
            <DateRangePicker
              from={customFrom}
              to={customTo}
              onSelect={(from, to) => {
                setCustomFrom(from);
                setCustomTo(to);
              }}
            />

            <ExportButton
              data={salesExportData}
              filename="تقرير_المبيعات"
              headers={{
                date: 'التاريخ',
                amount: 'المبلغ',
                status: 'الحالة',
              }}
            />
          </>
        )}
      </div>

      {/* Summary Cards */}
      {isMobile ? (
        <MobileSummaryCards />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                خلال الفترة المحددة
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">المبالغ المحصلة</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {totalSales > 0 ? ((paidAmount / totalSales) * 100).toFixed(1) : 0}% من الإجمالي
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">المبالغ المستحقة</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(unpaidAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {totalSales > 0 ? ((unpaidAmount / totalSales) * 100).toFixed(1) : 0}% من الإجمالي
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">عدد الفواتير</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoiceCount}</div>
              <p className="text-xs text-muted-foreground">فاتورة خلال الفترة</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue={isMobile ? "products" : "sales"} className="space-y-4">
        {isMobile ? (
          <ScrollArea className="w-full">
            <TabsList className="flex w-max h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger value="products" className="text-xs whitespace-nowrap px-2.5">المنتجات</TabsTrigger>
              <TabsTrigger value="customers" className="text-xs whitespace-nowrap px-2.5">العملاء</TabsTrigger>
              <TabsTrigger value="sales" className="text-xs whitespace-nowrap px-2.5">المبيعات</TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs whitespace-nowrap px-2.5">المخزون</TabsTrigger>
              <TabsTrigger value="profitability" className="text-xs whitespace-nowrap px-2.5">الربحية</TabsTrigger>
              <TabsTrigger value="aging" className="text-xs whitespace-nowrap px-2.5">أعمار الديون</TabsTrigger>
              <TabsTrigger value="flow" className="text-xs whitespace-nowrap px-2.5">حركة المخزون</TabsTrigger>
              <TabsTrigger value="geographic" className="text-xs whitespace-nowrap px-2.5">التوزيع الجغرافي</TabsTrigger>
              <TabsTrigger value="inactive" className="text-xs whitespace-nowrap px-2.5">غير النشطين</TabsTrigger>
              <TabsTrigger value="trial-balance" className="text-xs whitespace-nowrap px-2.5">ميزان المراجعة</TabsTrigger>
              <TabsTrigger value="income-statement" className="text-xs whitespace-nowrap px-2.5">قائمة الدخل</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <TabsList className="grid w-full grid-cols-11 lg:w-auto lg:inline-grid">
            <TabsTrigger value="sales" className="text-xs sm:text-sm">المبيعات</TabsTrigger>
            <TabsTrigger value="products" className="text-xs sm:text-sm">المنتجات</TabsTrigger>
            <TabsTrigger value="customers" className="text-xs sm:text-sm">العملاء</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs sm:text-sm">المخزون</TabsTrigger>
            <TabsTrigger value="profitability" className="text-xs sm:text-sm">الربحية</TabsTrigger>
            <TabsTrigger value="aging" className="text-xs sm:text-sm">أعمار الديون</TabsTrigger>
            <TabsTrigger value="flow" className="text-xs sm:text-sm">حركة المخزون</TabsTrigger>
            <TabsTrigger value="geographic" className="text-xs sm:text-sm">التوزيع الجغرافي</TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs sm:text-sm">غير النشطين</TabsTrigger>
            <TabsTrigger value="trial-balance" className="text-xs sm:text-sm">ميزان المراجعة</TabsTrigger>
            <TabsTrigger value="income-statement" className="text-xs sm:text-sm">قائمة الدخل</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="sales" className="space-y-4">
          {isMobile ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  اتجاه المبيعات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Line type="monotone" dataKey="sales" name="المبيعات" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>اتجاه المبيعات والمشتريات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="sales" name="المبيعات" stroke="hsl(var(--primary))" strokeWidth={2} />
                        <Line type="monotone" dataKey="purchases" name="المشتريات" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>توزيع حالات الدفع</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {paymentDistribution?.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                المنتجات الأكثر مبيعاً
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isMobile ? (
                <MobileTopItemsList items={topProducts || []} type="products" />
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="revenue" name="الإيرادات" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                أفضل العملاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isMobile ? (
                <MobileTopItemsList items={topCustomers || []} type="customers" />
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCustomers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === "total") return formatCurrency(value);
                          return value;
                        }} 
                      />
                      <Bar dataKey="total" name="إجمالي المشتريات" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                المنتجات منخفضة المخزون
                {lowStockProducts && lowStockProducts.length > 0 && (
                  <Badge variant="destructive">{lowStockProducts.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockProducts && lowStockProducts.length > 0 ? (
                isMobile ? (
                  <MobileLowStockList items={lowStockProducts} />
                ) : (
                  <div className="space-y-4">
                    {lowStockProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">الحد الأدنى: {product.minStock}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-600">{product.currentStock}</p>
                          <p className="text-xs text-muted-foreground">الكمية الحالية</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">جميع المنتجات في مستوى آمن</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profitability Tab */}
        <TabsContent value="profitability" className="space-y-4">
          <ProfitabilityReport startDate={startDate} endDate={endDate} />
        </TabsContent>

        {/* Aging Report Tab */}
        <TabsContent value="aging" className="space-y-4">
          <AgingReport />
        </TabsContent>

        {/* Inventory Flow Tab */}
        <TabsContent value="flow" className="space-y-4">
          <InventoryFlowReport startDate={startDate} endDate={endDate} />
        </TabsContent>

        {/* Geographic Report Tab */}
        <TabsContent value="geographic" className="space-y-4">
          <GeographicReport />
        </TabsContent>

        {/* Inactive Customers Tab */}
        <TabsContent value="inactive" className="space-y-4">
          <InactiveCustomersReport />
        </TabsContent>

        {/* Trial Balance Tab */}
        <TabsContent value="trial-balance" className="space-y-4">
          <TrialBalanceReport asOfDate={endDate} />
        </TabsContent>

        {/* Income Statement Tab */}
        <TabsContent value="income-statement" className="space-y-4">
          <IncomeStatementReport startDate={startDate} endDate={endDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
