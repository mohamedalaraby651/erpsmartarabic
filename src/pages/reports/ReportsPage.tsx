import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ar } from "date-fns/locale";
import { TrendingUp, TrendingDown, DollarSign, Package, Users, FileText, AlertTriangle } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function ReportsPage() {
  const [period, setPeriod] = useState("30");

  const startDate = subDays(new Date(), parseInt(period));

  // Sales Report Data
  const { data: salesData } = useQuery({
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " ج.م";
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">التقارير والتحليلات</h1>
          <p className="text-muted-foreground">نظرة شاملة على أداء الأعمال</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="الفترة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">آخر 7 أيام</SelectItem>
            <SelectItem value="30">آخر 30 يوم</SelectItem>
            <SelectItem value="90">آخر 3 أشهر</SelectItem>
            <SelectItem value="365">آخر سنة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
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

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="sales">المبيعات</TabsTrigger>
          <TabsTrigger value="products">المنتجات</TabsTrigger>
          <TabsTrigger value="customers">العملاء</TabsTrigger>
          <TabsTrigger value="inventory">المخزون</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                المنتجات منخفضة المخزون
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockProducts && lowStockProducts.length > 0 ? (
                <div className="space-y-4">
                  {lowStockProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          الحد الأدنى: {product.minStock}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className={`text-lg font-bold ${product.currentStock === 0 ? "text-red-600" : "text-amber-600"}`}>
                          {product.currentStock}
                        </p>
                        <p className="text-xs text-muted-foreground">المتوفر</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>جميع المنتجات في مستوى مخزون جيد</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
