import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null;
  color: string;
  icon: React.ElementType;
}

const agingBuckets: AgingBucket[] = [
  { label: 'حالي (0-30 يوم)', minDays: 0, maxDays: 30, color: 'hsl(var(--success))', icon: CheckCircle },
  { label: 'متأخر (31-60 يوم)', minDays: 31, maxDays: 60, color: 'hsl(var(--warning))', icon: Clock },
  { label: 'خطر (61-90 يوم)', minDays: 61, maxDays: 90, color: 'hsl(var(--destructive))', icon: AlertTriangle },
  { label: 'حرج (>90 يوم)', minDays: 91, maxDays: null, color: 'hsl(142 76% 36%)', icon: AlertCircle },
];

export function AgingReport() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['aging-report'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          paid_amount,
          created_at,
          due_date,
          payment_status,
          customers(id, name, phone)
        `)
        .neq('payment_status', 'paid')
        .order('created_at', { ascending: true });
      return data || [];
    },
    staleTime: 60000,
  });

  interface AgingInvoice {
    id: string;
    invoice_number: string;
    total_amount: number;
    paid_amount: number | null;
    customers: { id: string; name: string; phone: string | null } | null;
    daysPastDue: number;
    remainingAmount: number;
  }

  const agingData = useMemo(() => {
    if (!invoices) return [];

    const today = new Date();
    const bucketData = agingBuckets.map(bucket => ({
      ...bucket,
      invoices: [] as AgingInvoice[],
      totalAmount: 0,
      count: 0,
    }));

    invoices.forEach(invoice => {
      const dueDate = invoice.due_date ? new Date(invoice.due_date) : new Date(invoice.created_at);
      const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const remainingAmount = (invoice.total_amount || 0) - (invoice.paid_amount || 0);

      for (const bucketInfo of bucketData) {
        if (
          daysPastDue >= bucketInfo.minDays &&
          (bucketInfo.maxDays === null || daysPastDue <= bucketInfo.maxDays)
        ) {
          bucketInfo.invoices.push({
            ...invoice,
            daysPastDue,
            remainingAmount,
          });
          bucketInfo.totalAmount += remainingAmount;
          bucketInfo.count++;
          break;
        }
      }
    });

    return bucketData;
  }, [invoices]);

  const totalOutstanding = useMemo(() => {
    return agingData.reduce((sum, bucket) => sum + bucket.totalAmount, 0);
  }, [agingData]);

  const chartData = useMemo(() => {
    return agingData.map(bucket => ({
      name: bucket.label.split(' ')[0],
      amount: bucket.totalAmount,
      count: bucket.count,
      color: bucket.color,
    }));
  }, [agingData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {agingData.map((bucket) => {
          const Icon = bucket.icon;
          const percentage = totalOutstanding > 0 
            ? (bucket.totalAmount / totalOutstanding) * 100 
            : 0;

          return (
            <Card key={bucket.label}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{bucket.label}</p>
                    <p className="text-2xl font-bold mt-1">
                      {bucket.totalAmount.toLocaleString('ar-EG')} ج.م
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {bucket.count} فاتورة
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div 
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: bucket.color + '20' }}
                  >
                    <Icon className="h-5 w-5" style={{ color: bucket.color }} />
                  </div>
                </div>
                <Progress 
                  value={percentage} 
                  className="mt-3 h-2"
                  style={{ 
                    '--progress-background': bucket.color 
                  } as React.CSSProperties}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>توزيع أعمار الديون</CardTitle>
          <CardDescription>
            إجمالي المستحقات: {totalOutstanding.toLocaleString('ar-EG')} ج.م
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [
                    value.toLocaleString('ar-EG') + ' ج.م',
                    'المبلغ'
                  ]}
                />
                <Bar dataKey="amount" radius={4}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed List */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الفواتير المتأخرة</CardTitle>
          <CardDescription>قائمة بجميع الفواتير غير المسددة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agingData.map((bucket) => (
              bucket.invoices.length > 0 && (
                <div key={bucket.label} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: bucket.color }}
                    />
                    <h4 className="font-medium">{bucket.label}</h4>
                    <Badge variant="outline">{bucket.count}</Badge>
                  </div>
                  <div className="space-y-2 pr-5">
                    {bucket.invoices.slice(0, 5).map((invoice) => (
                      <div 
                        key={invoice.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.customers?.name || 'عميل'}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold">
                            {invoice.remainingAmount.toLocaleString('ar-EG')} ج.م
                          </p>
                          <p className="text-xs text-muted-foreground">
                            متأخر {invoice.daysPastDue} يوم
                          </p>
                        </div>
                      </div>
                    ))}
                    {bucket.invoices.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        و{bucket.invoices.length - 5} فواتير أخرى...
                      </p>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
