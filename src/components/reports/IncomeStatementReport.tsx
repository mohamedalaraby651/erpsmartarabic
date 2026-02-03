import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, DollarSign, Minus, ArrowDown, ArrowUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface IncomeStatementReportProps {
  startDate: Date;
  endDate: Date;
}

interface IncomeStatementSection {
  title: string;
  items: { name: string; amount: number }[];
  total: number;
}

export function IncomeStatementReport({ startDate, endDate }: IncomeStatementReportProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['income-statement', startDate, endDate],
    queryFn: async () => {
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Fetch all relevant data in parallel
      const [invoicesRes, purchasesRes, expensesRes, paymentsRes] = await Promise.all([
        // Sales Revenue
        supabase
          .from('invoices')
          .select('total_amount, subtotal, tax_amount, discount_amount, status')
          .gte('created_at', startStr)
          .lte('created_at', endStr)
          .neq('status', 'draft')
          .neq('status', 'cancelled'),
        // Cost of Goods Sold (from purchase orders)
        supabase
          .from('purchase_orders')
          .select('total_amount, subtotal, tax_amount, status')
          .gte('created_at', startStr)
          .lte('created_at', endStr)
          .eq('status', 'completed'),
        // Operating Expenses (grouped by category)
        supabase
          .from('expenses')
          .select(`
            amount,
            status,
            expense_categories (name)
          `)
          .gte('expense_date', startStr)
          .lte('expense_date', endStr)
          .eq('status', 'approved'),
        // Returns and Refunds (negative payments or credit notes)
        supabase
          .from('payments')
          .select('amount, payment_method')
          .gte('payment_date', startStr)
          .lte('payment_date', endStr),
      ]);

      return {
        invoices: invoicesRes.data || [],
        purchases: purchasesRes.data || [],
        expenses: expensesRes.data || [],
        payments: paymentsRes.data || [],
      };
    },
    staleTime: 60000,
  });

  const incomeStatement = useMemo(() => {
    if (!data) return null;

    // Calculate Revenue
    const grossSales = data.invoices.reduce((sum, inv) => sum + (Number(inv.subtotal) || 0), 0);
    const salesTax = data.invoices.reduce((sum, inv) => sum + (Number(inv.tax_amount) || 0), 0);
    const salesDiscounts = data.invoices.reduce((sum, inv) => sum + (Number(inv.discount_amount) || 0), 0);
    const netSales = grossSales - salesDiscounts;

    // Cost of Goods Sold
    const cogs = data.purchases.reduce((sum, po) => sum + (Number(po.subtotal) || 0), 0);

    // Gross Profit
    const grossProfit = netSales - cogs;
    const grossProfitMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

    // Operating Expenses by Category
    const expensesByCategory = new Map<string, number>();
    data.expenses.forEach((exp) => {
      const categoryName = (exp.expense_categories as { name: string } | null)?.name || 'مصروفات عامة';
      const current = expensesByCategory.get(categoryName) || 0;
      expensesByCategory.set(categoryName, current + (Number(exp.amount) || 0));
    });

    const totalOperatingExpenses = Array.from(expensesByCategory.values()).reduce((a, b) => a + b, 0);

    // Operating Income
    const operatingIncome = grossProfit - totalOperatingExpenses;
    const operatingMargin = netSales > 0 ? (operatingIncome / netSales) * 100 : 0;

    // Net Income (before taxes)
    const netIncome = operatingIncome;
    const netProfitMargin = netSales > 0 ? (netIncome / netSales) * 100 : 0;

    return {
      revenue: {
        grossSales,
        salesDiscounts,
        salesTax,
        netSales,
      },
      cogs,
      grossProfit,
      grossProfitMargin,
      operatingExpenses: Array.from(expensesByCategory.entries()).map(([name, amount]) => ({
        name,
        amount,
      })),
      totalOperatingExpenses,
      operatingIncome,
      operatingMargin,
      netIncome,
      netProfitMargin,
    };
  }, [data]);

  const chartData = useMemo(() => {
    if (!incomeStatement) return [];
    return [
      { name: 'صافي المبيعات', value: incomeStatement.revenue.netSales, fill: 'hsl(var(--primary))' },
      { name: 'تكلفة المبيعات', value: incomeStatement.cogs, fill: 'hsl(var(--destructive))' },
      { name: 'مجمل الربح', value: incomeStatement.grossProfit, fill: 'hsl(var(--chart-2))' },
      { name: 'المصروفات', value: incomeStatement.totalOperatingExpenses, fill: 'hsl(var(--warning))' },
      { name: 'صافي الربح', value: incomeStatement.netIncome, fill: 'hsl(var(--success))' },
    ];
  }, [incomeStatement]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!incomeStatement) return null;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const LineItem = ({ label, amount, isSubtotal = false, isTotal = false, isPositive = true }: {
    label: string;
    amount: number;
    isSubtotal?: boolean;
    isTotal?: boolean;
    isPositive?: boolean;
  }) => (
    <div className={`flex items-center justify-between py-2 ${isTotal ? 'font-bold text-lg' : ''} ${isSubtotal ? 'font-medium border-t border-dashed pt-3' : ''}`}>
      <span className={isSubtotal || isTotal ? '' : 'pr-4'}>{label}</span>
      <span className={`font-mono ${isTotal && amount >= 0 ? 'text-success' : ''} ${isTotal && amount < 0 ? 'text-destructive' : ''}`}>
        {!isPositive && amount > 0 && '('}{formatCurrency(Math.abs(amount))}{!isPositive && amount > 0 && ')'} ج.م
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">صافي المبيعات</p>
                <p className="text-xl font-bold">{formatCurrency(incomeStatement.revenue.netSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-2/10">
                <ArrowUp className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مجمل الربح</p>
                <p className="text-xl font-bold">{formatCurrency(incomeStatement.grossProfit)}</p>
                <p className="text-xs text-muted-foreground">{incomeStatement.grossProfitMargin.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Minus className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المصروفات</p>
                <p className="text-xl font-bold">{formatCurrency(incomeStatement.totalOperatingExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={incomeStatement.netIncome >= 0 ? 'border-success/50' : 'border-destructive/50'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${incomeStatement.netIncome >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {incomeStatement.netIncome >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-success" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">صافي الربح</p>
                <p className={`text-xl font-bold ${incomeStatement.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(incomeStatement.netIncome)}
                </p>
                <p className="text-xs text-muted-foreground">{incomeStatement.netProfitMargin.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income Statement Details */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الدخل</CardTitle>
            <CardDescription>
              الفترة من {startDate.toLocaleDateString('ar-EG')} إلى {endDate.toLocaleDateString('ar-EG')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* Revenue Section */}
            <div className="pb-2">
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">الإيرادات</h4>
              <LineItem label="إجمالي المبيعات" amount={incomeStatement.revenue.grossSales} />
              <LineItem label="الخصومات والمرتجعات" amount={incomeStatement.revenue.salesDiscounts} isPositive={false} />
              <LineItem label="صافي المبيعات" amount={incomeStatement.revenue.netSales} isSubtotal />
            </div>

            <Separator />

            {/* COGS Section */}
            <div className="py-2">
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">تكلفة المبيعات</h4>
              <LineItem label="تكلفة البضاعة المباعة" amount={incomeStatement.cogs} isPositive={false} />
              <LineItem label="مجمل الربح" amount={incomeStatement.grossProfit} isSubtotal />
            </div>

            <Separator />

            {/* Operating Expenses */}
            <div className="py-2">
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">المصروفات التشغيلية</h4>
              {incomeStatement.operatingExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">لا توجد مصروفات</p>
              ) : (
                incomeStatement.operatingExpenses.map((exp) => (
                  <LineItem key={exp.name} label={exp.name} amount={exp.amount} isPositive={false} />
                ))
              )}
              <LineItem label="إجمالي المصروفات" amount={incomeStatement.totalOperatingExpenses} isSubtotal isPositive={false} />
            </div>

            <Separator />

            {/* Net Income */}
            <div className="pt-4">
              <LineItem label="صافي الربح / (الخسارة)" amount={incomeStatement.netIncome} isTotal />
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={incomeStatement.netIncome >= 0 ? 'default' : 'destructive'}>
                  {incomeStatement.netIncome >= 0 ? 'ربح' : 'خسارة'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  هامش صافي الربح: {incomeStatement.netProfitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visual Chart */}
        <Card>
          <CardHeader>
            <CardTitle>التحليل البياني</CardTitle>
            <CardDescription>مقارنة بنود قائمة الدخل</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value) + ' ج.م', '']}
                  />
                  <Bar dataKey="value" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}