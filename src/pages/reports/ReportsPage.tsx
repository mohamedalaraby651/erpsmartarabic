import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, subDays } from "date-fns";
import { TrendingUp, TrendingDown, DollarSign, FileText, AlertTriangle } from "lucide-react";
import { ExportButton } from "@/components/reports/ExportButton";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import PageHeader from "@/components/navigation/PageHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { useReportsData } from "@/hooks/useReportsData";

// Lazy-loaded tab components
import { SalesReportTab } from "@/components/reports/SalesReportTab";
import { ProductsReportTab } from "@/components/reports/ProductsReportTab";
import { CustomersReportTab } from "@/components/reports/CustomersReportTab";
import { InventoryReportTab } from "@/components/reports/InventoryReportTab";
import { ProfitabilityReport } from "@/components/reports/ProfitabilityReport";
import { AgingReport } from "@/components/reports/AgingReport";
import { InventoryFlowReport } from "@/components/reports/InventoryFlowReport";
import { TrialBalanceReport } from "@/components/reports/TrialBalanceReport";
import { IncomeStatementReport } from "@/components/reports/IncomeStatementReport";
import { GeographicReport } from "@/components/reports/GeographicReport";
import { InactiveCustomersReport } from "@/components/reports/InactiveCustomersReport";
import { CashFlowReport } from "@/components/reports/CashFlowReport";

export default function ReportsPage() {
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState("30");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const startDate = customFrom || subDays(new Date(), parseInt(period));
  const endDate = customTo || new Date();

  const {
    loadingSales, monthlyTrend, paymentDistribution,
    topProducts, topCustomers, lowStockProducts,
    totalSales, paidAmount, unpaidAmount, invoiceCount,
    salesTrend, collectionTrend, salesData,
  } = useReportsData(startDate, endDate);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + " ج.م";

  const salesExportData = salesData?.map((s) => ({
    date: format(new Date(s.created_at), 'yyyy-MM-dd'),
    amount: s.total_amount,
    status: s.payment_status,
  })) || [];

  const TrendIndicator = ({ value }: { value: number | null }) => {
    if (value === null) return null;
    const isPositive = value >= 0;
    return (
      <p className={`text-[10px] flex items-center gap-0.5 ${isPositive ? 'text-success' : 'text-destructive'}`}>
        {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </p>
    );
  };

  if (loadingSales) {
    return (
      <div className="space-y-6" dir="rtl">
        <PageHeader title="التقارير والتحليلات" description="نظرة شاملة على أداء الأعمال" showBack />
        {isMobile ? <MobileListSkeleton count={4} /> : (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="التقارير والتحليلات" description="نظرة شاملة على أداء الأعمال" showBack />

      <div className="flex flex-wrap items-center gap-4">
        <Select value={period} onValueChange={(value) => { setPeriod(value); setCustomFrom(undefined); setCustomTo(undefined); }}>
          <SelectTrigger className={isMobile ? "w-full" : "w-40"}><SelectValue placeholder="الفترة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">آخر 7 أيام</SelectItem>
            <SelectItem value="30">آخر 30 يوم</SelectItem>
            <SelectItem value="90">آخر 3 أشهر</SelectItem>
            <SelectItem value="365">آخر سنة</SelectItem>
          </SelectContent>
        </Select>
        {!isMobile && (
          <>
            <DateRangePicker from={customFrom} to={customTo} onSelect={(from, to) => { setCustomFrom(from); setCustomTo(to); }} />
            <ExportButton data={salesExportData} filename="تقرير_المبيعات" headers={{ date: 'التاريخ', amount: 'المبلغ', status: 'الحالة' }} />
          </>
        )}
      </div>

      {/* Summary Cards */}
      {isMobile ? (
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="p-3"><div className="flex items-center gap-2"><div className="p-1.5 rounded-lg bg-primary/10"><DollarSign className="h-4 w-4 text-primary" /></div><div><p className="text-lg font-bold">{formatCurrency(totalSales)}</p><p className="text-xs text-muted-foreground">إجمالي المبيعات</p><TrendIndicator value={salesTrend} /></div></div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="flex items-center gap-2"><div className="p-1.5 rounded-lg bg-success/10"><TrendingUp className="h-4 w-4 text-success" /></div><div><p className="text-lg font-bold text-success">{formatCurrency(paidAmount)}</p><p className="text-xs text-muted-foreground">المحصل</p><TrendIndicator value={collectionTrend} /></div></div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="flex items-center gap-2"><div className="p-1.5 rounded-lg bg-destructive/10"><TrendingDown className="h-4 w-4 text-destructive" /></div><div><p className="text-lg font-bold text-destructive">{formatCurrency(unpaidAmount)}</p><p className="text-xs text-muted-foreground">المستحق</p>{totalSales > 0 && <p className="text-[10px] text-muted-foreground">{((unpaidAmount / totalSales) * 100).toFixed(0)}% من الإجمالي</p>}</div></div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="flex items-center gap-2"><div className="p-1.5 rounded-lg bg-info/10"><FileText className="h-4 w-4 text-info" /></div><div><p className="text-lg font-bold">{invoiceCount}</p><p className="text-xs text-muted-foreground">الفواتير</p></div></div></CardContent></Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totalSales)}</div><div className="flex items-center gap-1"><TrendIndicator value={salesTrend} />{salesTrend === null && <p className="text-xs text-muted-foreground">خلال الفترة المحددة</p>}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">المبالغ المحصلة</CardTitle><TrendingUp className="h-4 w-4 text-success" /></CardHeader><CardContent><div className="text-2xl font-bold text-success">{formatCurrency(paidAmount)}</div><p className="text-xs text-muted-foreground">{totalSales > 0 ? ((paidAmount / totalSales) * 100).toFixed(1) : 0}% من الإجمالي</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">المبالغ المستحقة</CardTitle><TrendingDown className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{formatCurrency(unpaidAmount)}</div><p className="text-xs text-muted-foreground">{totalSales > 0 ? ((unpaidAmount / totalSales) * 100).toFixed(1) : 0}% من الإجمالي</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">عدد الفواتير</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{invoiceCount}</div><p className="text-xs text-muted-foreground">فاتورة خلال الفترة</p></CardContent></Card>
        </div>
      )}

      {/* Decision Hooks — Mobile smart alerts */}
      {isMobile && (lowStockProducts && lowStockProducts.length > 0 || (totalSales > 0 && unpaidAmount > totalSales * 0.5)) && (
        <div className="space-y-2">
          {lowStockProducts && lowStockProducts.length > 0 && (
            <Card className="border-warning/30 bg-warning/5"><CardContent className="p-3 flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-warning shrink-0" /><div><p className="text-sm font-medium">تنبيه المخزون</p><p className="text-xs text-muted-foreground">{lowStockProducts.length} منتج تحت الحد الأدنى</p></div></CardContent></Card>
          )}
          {totalSales > 0 && unpaidAmount > totalSales * 0.5 && (
            <Card className="border-destructive/30 bg-destructive/5"><CardContent className="p-3 flex items-center gap-3"><TrendingDown className="h-5 w-5 text-destructive shrink-0" /><div><p className="text-sm font-medium">تنبيه التحصيل</p><p className="text-xs text-muted-foreground">أكثر من 50% من المبيعات غير محصلة</p></div></CardContent></Card>
          )}
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
              <TabsTrigger value="cashflow" className="text-xs whitespace-nowrap px-2.5">التدفق النقدي</TabsTrigger>
              <TabsTrigger value="trial-balance" className="text-xs whitespace-nowrap px-2.5">ميزان المراجعة</TabsTrigger>
              <TabsTrigger value="income-statement" className="text-xs whitespace-nowrap px-2.5">قائمة الدخل</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <TabsList className="grid w-full grid-cols-12 lg:w-auto lg:inline-grid">
            <TabsTrigger value="sales" className="text-xs sm:text-sm">المبيعات</TabsTrigger>
            <TabsTrigger value="products" className="text-xs sm:text-sm">المنتجات</TabsTrigger>
            <TabsTrigger value="customers" className="text-xs sm:text-sm">العملاء</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs sm:text-sm">المخزون</TabsTrigger>
            <TabsTrigger value="profitability" className="text-xs sm:text-sm">الربحية</TabsTrigger>
            <TabsTrigger value="aging" className="text-xs sm:text-sm">أعمار الديون</TabsTrigger>
            <TabsTrigger value="flow" className="text-xs sm:text-sm">حركة المخزون</TabsTrigger>
            <TabsTrigger value="geographic" className="text-xs sm:text-sm">التوزيع الجغرافي</TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs sm:text-sm">غير النشطين</TabsTrigger>
            <TabsTrigger value="cashflow" className="text-xs sm:text-sm">التدفق النقدي</TabsTrigger>
            <TabsTrigger value="trial-balance" className="text-xs sm:text-sm">ميزان المراجعة</TabsTrigger>
            <TabsTrigger value="income-statement" className="text-xs sm:text-sm">قائمة الدخل</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="sales" className="space-y-4">
          <SalesReportTab monthlyTrend={monthlyTrend} paymentDistribution={paymentDistribution} formatCurrency={formatCurrency} />
        </TabsContent>
        <TabsContent value="products" className="space-y-4">
          <ProductsReportTab topProducts={topProducts} formatCurrency={formatCurrency} />
        </TabsContent>
        <TabsContent value="customers" className="space-y-4">
          <CustomersReportTab topCustomers={topCustomers} formatCurrency={formatCurrency} />
        </TabsContent>
        <TabsContent value="inventory" className="space-y-4">
          <InventoryReportTab lowStockProducts={lowStockProducts} />
        </TabsContent>
        <TabsContent value="profitability" className="space-y-4">
          <ProfitabilityReport startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="aging" className="space-y-4"><AgingReport /></TabsContent>
        <TabsContent value="flow" className="space-y-4">
          <InventoryFlowReport startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="geographic" className="space-y-4"><GeographicReport /></TabsContent>
        <TabsContent value="inactive" className="space-y-4"><InactiveCustomersReport /></TabsContent>
        <TabsContent value="trial-balance" className="space-y-4">
          <TrialBalanceReport asOfDate={endDate} />
        </TabsContent>
        <TabsContent value="income-statement" className="space-y-4">
          <IncomeStatementReport startDate={startDate} endDate={endDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
