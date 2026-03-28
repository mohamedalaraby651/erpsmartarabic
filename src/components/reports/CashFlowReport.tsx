import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpDown } from 'lucide-react';
import { format, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  startDate: Date;
  endDate: Date;
}

export function CashFlowReport({ startDate, endDate }: Props) {
  const fromStr = startDate.toISOString();
  const toStr = endDate.toISOString();

  // Payments (inflows)
  const { data: payments = [] } = useQuery({
    queryKey: ['cashflow-payments', fromStr, toStr],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('amount, payment_date, payment_method')
        .gte('payment_date', fromStr)
        .lte('payment_date', toStr);
      return data || [];
    },
  });

  // Expenses (outflows)
  const { data: expenses = [] } = useQuery({
    queryKey: ['cashflow-expenses', fromStr, toStr],
    queryFn: async () => {
      const { data } = await supabase
        .from('expenses')
        .select('amount, expense_date, payment_method')
        .gte('expense_date', fromStr)
        .lte('expense_date', toStr)
        .eq('status', 'approved');
      return data || [];
    },
  });

  // Supplier payments (outflows)
  const { data: supplierPayments = [] } = useQuery({
    queryKey: ['cashflow-supplier-payments', fromStr, toStr],
    queryFn: async () => {
      const { data } = await supabase
        .from('supplier_payments')
        .select('amount, payment_date, payment_method')
        .gte('payment_date', fromStr)
        .lte('payment_date', toStr);
      return data || [];
    },
  });

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const inflow = payments
        .filter(p => p.payment_date?.startsWith(dayStr))
        .reduce((s, p) => s + Number(p.amount), 0);
      const expenseOut = expenses
        .filter(e => e.expense_date?.startsWith(dayStr))
        .reduce((s, e) => s + Number(e.amount), 0);
      const supplierOut = supplierPayments
        .filter(sp => sp.payment_date?.startsWith(dayStr))
        .reduce((s, sp) => s + Number(sp.amount), 0);
      return {
        date: format(day, 'MM/dd', { locale: ar }),
        تحصيلات: inflow,
        مصروفات: expenseOut,
        موردين: supplierOut,
        صافي: inflow - expenseOut - supplierOut,
      };
    });
  }, [payments, expenses, supplierPayments, startDate, endDate]);

  const totalInflow = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalSupplier = supplierPayments.reduce((s, sp) => s + Number(sp.amount), 0);
  const totalOutflow = totalExpenses + totalSupplier;
  const netFlow = totalInflow - totalOutflow;

  const fmt = (n: number) => n.toLocaleString('ar-EG', { maximumFractionDigits: 0 }) + ' ج.م';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">التحصيلات</span>
            </div>
            <p className="text-xl font-bold text-success">{fmt(totalInflow)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">المصروفات</span>
            </div>
            <p className="text-xl font-bold text-destructive">{fmt(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-warning" />
              <span className="text-sm text-muted-foreground">مدفوعات الموردين</span>
            </div>
            <p className="text-xl font-bold text-warning">{fmt(totalSupplier)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpDown className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">صافي التدفق</span>
            </div>
            <p className={`text-xl font-bold ${netFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
              {fmt(netFlow)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            التدفق النقدي اليومي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number, name: string) => [fmt(value), name]}
                  labelFormatter={(label) => `التاريخ: ${label}`}
                />
                <Legend />
                <Bar dataKey="تحصيلات" fill="hsl(var(--success))" radius={[2, 2, 0, 0]} />
                <Bar dataKey="مصروفات" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
                <Bar dataKey="موردين" fill="hsl(var(--warning))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
