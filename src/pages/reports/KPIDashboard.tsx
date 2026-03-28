import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, Percent, RotateCcw, Clock, ArrowUpDown, BarChart3 } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from 'recharts';

const KPIDashboard = () => {
  const [comparisonMonths, setComparisonMonths] = useState('6');
  const monthsCount = parseInt(comparisonMonths);

  // Generate month ranges
  const months = useMemo(() => {
    const result = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      result.push({
        label: format(date, 'MMM yyyy', { locale: ar }),
        shortLabel: format(date, 'MM/yy'),
        start: startOfMonth(date).toISOString(),
        end: endOfMonth(date).toISOString(),
      });
    }
    return result;
  }, [monthsCount]);

  // Fetch invoices for the period
  const { data: invoices = [] } = useQuery({
    queryKey: ['kpi-invoices', monthsCount],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('total_amount, paid_amount, payment_status, created_at, subtotal, discount_amount, tax_amount')
        .gte('created_at', months[0].start)
        .neq('status', 'cancelled')
        .order('created_at');
      return data || [];
    },
  });

  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ['kpi-payments', monthsCount],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('amount, payment_date, created_at')
        .gte('created_at', months[0].start);
      return data || [];
    },
  });

  // Fetch expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['kpi-expenses', monthsCount],
    queryFn: async () => {
      const { data } = await supabase
        .from('expenses')
        .select('amount, expense_date, created_at')
        .gte('created_at', months[0].start)
        .eq('status', 'approved');
      return data || [];
    },
  });

  // Fetch products for inventory turnover
  const { data: products = [] } = useQuery({
    queryKey: ['kpi-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, cost_price, selling_price');
      return data || [];
    },
  });

  // Fetch invoice items for COGS
  const { data: invoiceItems = [] } = useQuery({
    queryKey: ['kpi-invoice-items', monthsCount],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoice_items')
        .select('quantity, unit_price, total_price, created_at, products(cost_price)')
        .gte('created_at', months[0].start);
      return data || [];
    },
  });

  // Calculate monthly KPIs
  const monthlyData = useMemo(() => {
    return months.map(month => {
      const monthInvoices = invoices.filter(i => i.created_at >= month.start && i.created_at <= month.end);
      const monthPayments = payments.filter(p => p.created_at >= month.start && p.created_at <= month.end);
      const monthExpenses = expenses.filter(e => e.created_at >= month.start && e.created_at <= month.end);
      const monthItems = invoiceItems.filter(item => item.created_at >= month.start && item.created_at <= month.end);

      const revenue = monthInvoices.reduce((s, i) => s + Number(i.total_amount), 0);
      const collected = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
      const totalExpenses = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);

      // COGS from invoice items
      const cogs = monthItems.reduce((s, item) => {
        const costPrice = (item.products as { cost_price: number } | null)?.cost_price || 0;
        return s + (costPrice * item.quantity);
      }, 0);

      const grossProfit = revenue - cogs;
      const netProfit = grossProfit - totalExpenses;
      const collectionRate = revenue > 0 ? (collected / revenue) * 100 : 0;
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      return {
        month: month.shortLabel,
        label: month.label,
        revenue,
        collected,
        expenses: totalExpenses,
        cogs,
        grossProfit,
        netProfit,
        collectionRate: Math.round(collectionRate * 10) / 10,
        grossMargin: Math.round(grossMargin * 10) / 10,
        netMargin: Math.round(netMargin * 10) / 10,
        invoiceCount: monthInvoices.length,
        avgInvoice: monthInvoices.length > 0 ? Math.round(revenue / monthInvoices.length) : 0,
      };
    });
  }, [months, invoices, payments, expenses, invoiceItems]);

  // Current vs previous month
  const current = monthlyData[monthlyData.length - 1];
  const previous = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;

  const getChange = (curr: number, prev: number | null) => {
    if (!prev || prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100 * 10) / 10;
  };

  // Inventory turnover
  const inventoryValue = products.reduce((s, p) => s + Number(p.cost_price || 0), 0);
  const totalCOGS = monthlyData.reduce((s, m) => s + m.cogs, 0);
  const annualizedCOGS = (totalCOGS / monthsCount) * 12;
  const inventoryTurnover = inventoryValue > 0 ? Math.round((annualizedCOGS / inventoryValue) * 10) / 10 : 0;

  const kpiCards = [
    {
      title: 'معدل التحصيل', value: `${current?.collectionRate || 0}%`, icon: Percent,
      change: getChange(current?.collectionRate || 0, previous?.collectionRate || null),
      color: (current?.collectionRate || 0) >= 80 ? 'text-emerald-600' : 'text-amber-600',
      bgColor: (current?.collectionRate || 0) >= 80 ? 'bg-emerald-500/10' : 'bg-amber-500/10',
    },
    {
      title: 'هامش الربح الإجمالي', value: `${current?.grossMargin || 0}%`, icon: TrendingUp,
      change: getChange(current?.grossMargin || 0, previous?.grossMargin || null),
      color: (current?.grossMargin || 0) >= 30 ? 'text-emerald-600' : 'text-destructive',
      bgColor: (current?.grossMargin || 0) >= 30 ? 'bg-emerald-500/10' : 'bg-destructive/10',
    },
    {
      title: 'صافي الربح', value: `${(current?.netProfit || 0).toLocaleString()} ج.م`, icon: DollarSign,
      change: getChange(current?.netProfit || 0, previous?.netProfit || null),
      color: (current?.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-destructive',
      bgColor: (current?.netProfit || 0) >= 0 ? 'bg-emerald-500/10' : 'bg-destructive/10',
    },
    {
      title: 'دوران المخزون', value: `${inventoryTurnover}x`, icon: RotateCcw,
      change: null,
      color: inventoryTurnover >= 4 ? 'text-emerald-600' : 'text-amber-600',
      bgColor: inventoryTurnover >= 4 ? 'bg-emerald-500/10' : 'bg-amber-500/10',
    },
    {
      title: 'متوسط الفاتورة', value: `${(current?.avgInvoice || 0).toLocaleString()} ج.م`, icon: BarChart3,
      change: getChange(current?.avgInvoice || 0, previous?.avgInvoice || null),
      color: 'text-primary', bgColor: 'bg-primary/10',
    },
    {
      title: 'عدد الفواتير', value: current?.invoiceCount || 0, icon: Clock,
      change: getChange(current?.invoiceCount || 0, previous?.invoiceCount || null),
      color: 'text-blue-600', bgColor: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">مؤشرات الأداء (KPIs)</h1>
          <p className="text-muted-foreground">تحليل أداء الأعمال ومقارنات شهرية</p>
        </div>
        <Select value={comparisonMonths} onValueChange={setComparisonMonths}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">آخر 3 أشهر</SelectItem>
            <SelectItem value="6">آخر 6 أشهر</SelectItem>
            <SelectItem value="12">آخر 12 شهر</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${kpi.bgColor}`}><kpi.icon className={`h-4 w-4 ${kpi.color}`} /></div>
                <span className="text-xs text-muted-foreground">{kpi.title}</span>
              </div>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              {kpi.change !== null && (
                <div className="flex items-center gap-1 mt-1">
                  {kpi.change >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                  <span className={`text-xs ${kpi.change >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {kpi.change >= 0 ? '+' : ''}{kpi.change}% عن الشهر السابق
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">الإيرادات والمصروفات</TabsTrigger>
          <TabsTrigger value="margins">هوامش الربح</TabsTrigger>
          <TabsTrigger value="collection">التحصيل</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader><CardTitle>مقارنة الإيرادات والمصروفات الشهرية</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => v.toLocaleString() + ' ج.م'} />
                  <Legend />
                  <Bar dataKey="revenue" name="الإيرادات" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="المصروفات" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="netProfit" name="صافي الربح" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margins">
          <Card>
            <CardHeader><CardTitle>تطور هوامش الربح</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis unit="%" />
                  <Tooltip formatter={(v: number) => v + '%'} />
                  <Legend />
                  <Line type="monotone" dataKey="grossMargin" name="هامش إجمالي" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="netMargin" name="هامش صافي" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collection">
          <Card>
            <CardHeader><CardTitle>معدل التحصيل الشهري</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" name="المبيعات" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="المحصّل" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {monthlyData.slice(-4).map((m, i) => (
                  <div key={i} className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">{m.label}</p>
                    <p className={`text-lg font-bold ${m.collectionRate >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {m.collectionRate}%
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Monthly Comparison Table */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpDown className="h-5 w-5" /> مقارنة شهر بشهر</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-right py-2 px-3 font-medium">المؤشر</th>
                {monthlyData.map((m, i) => <th key={i} className="text-center py-2 px-3 font-medium">{m.month}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'الإيرادات', key: 'revenue', format: (v: number) => v.toLocaleString() },
                { label: 'المصروفات', key: 'expenses', format: (v: number) => v.toLocaleString() },
                { label: 'صافي الربح', key: 'netProfit', format: (v: number) => v.toLocaleString() },
                { label: 'هامش الربح %', key: 'grossMargin', format: (v: number) => v + '%' },
                { label: 'معدل التحصيل %', key: 'collectionRate', format: (v: number) => v + '%' },
                { label: 'عدد الفواتير', key: 'invoiceCount', format: (v: number) => String(v) },
                { label: 'متوسط الفاتورة', key: 'avgInvoice', format: (v: number) => v.toLocaleString() },
              ].map((row, ri) => (
                <tr key={ri} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2 px-3 font-medium">{row.label}</td>
                  {monthlyData.map((m, ci) => (
                    <td key={ci} className="text-center py-2 px-3">{row.format((m as Record<string, number>)[row.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default KPIDashboard;
