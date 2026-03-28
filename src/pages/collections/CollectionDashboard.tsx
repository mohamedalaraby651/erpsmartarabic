import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, differenceInDays, parseISO } from 'date-fns';
import { AlertTriangle, Clock, DollarSign, Users, TrendingDown, CreditCard, ArrowLeft } from 'lucide-react';
import { DataCard } from '@/components/mobile/DataCard';

const CollectionDashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Fetch unpaid/partial invoices with customer info
  const { data: unpaidInvoices = [], isLoading } = useQuery({
    queryKey: ['collection-invoices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, paid_amount, due_date, created_at, payment_status, customers(id, name, phone)')
        .in('payment_status', ['pending', 'partial'])
        .neq('status', 'cancelled')
        .order('due_date', { ascending: true });
      return data || [];
    },
  });

  const today = new Date();

  const stats = useMemo(() => {
    let overdue = 0, overdueAmount = 0;
    let dueSoon = 0, dueSoonAmount = 0;
    let totalUnpaid = 0;

    unpaidInvoices.forEach(inv => {
      const remaining = Number(inv.total_amount) - Number(inv.paid_amount || 0);
      totalUnpaid += remaining;

      if (inv.due_date) {
        const days = differenceInDays(parseISO(inv.due_date), today);
        if (days < 0) { overdue++; overdueAmount += remaining; }
        else if (days <= 7) { dueSoon++; dueSoonAmount += remaining; }
      }
    });

    return { overdue, overdueAmount, dueSoon, dueSoonAmount, totalUnpaid, total: unpaidInvoices.length };
  }, [unpaidInvoices]);

  // Top 10 debtors
  const topDebtors = useMemo(() => {
    const debtorMap = new Map<string, { name: string; phone: string | null; customerId: string; total: number; count: number }>();
    unpaidInvoices.forEach(inv => {
      const cust = inv.customers as { id: string; name: string; phone: string | null } | null;
      if (!cust) return;
      const existing = debtorMap.get(cust.id) || { name: cust.name, phone: cust.phone, customerId: cust.id, total: 0, count: 0 };
      existing.total += Number(inv.total_amount) - Number(inv.paid_amount || 0);
      existing.count++;
      debtorMap.set(cust.id, existing);
    });
    return Array.from(debtorMap.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [unpaidInvoices]);

  // Aging buckets
  const aging = useMemo(() => {
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    unpaidInvoices.forEach(inv => {
      const remaining = Number(inv.total_amount) - Number(inv.paid_amount || 0);
      const age = differenceInDays(today, parseISO(inv.created_at));
      if (age <= 30) buckets.current += remaining;
      else if (age <= 60) buckets.days30 += remaining;
      else if (age <= 90) buckets.days60 += remaining;
      else buckets.over90 += remaining;
    });
    return buckets;
  }, [unpaidInvoices]);

  const agingTotal = aging.current + aging.days30 + aging.days60 + aging.over90;

  const getAgeBadge = (dueDate: string | null) => {
    if (!dueDate) return <Badge variant="secondary">بدون تاريخ</Badge>;
    const days = differenceInDays(today, parseISO(dueDate));
    if (days > 0) return <Badge variant="destructive">متأخر {days} يوم</Badge>;
    if (days >= -7) return <Badge variant="default" className="bg-amber-500">خلال {Math.abs(days)} أيام</Badge>;
    return <Badge variant="secondary">مجدول</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحصيلات</h1>
          <p className="text-muted-foreground">متابعة الفواتير المستحقة وإدارة التحصيل</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/payments')}>
          <CreditCard className="h-4 w-4 ml-2" /> تسجيل دفعة
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-destructive/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-sm text-muted-foreground">متأخرة</p>
                <p className="text-xl font-bold text-destructive">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">{stats.overdueAmount.toLocaleString()} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">تستحق قريباً</p>
                <p className="text-xl font-bold text-amber-600">{stats.dueSoon}</p>
                <p className="text-xs text-muted-foreground">{stats.dueSoonAmount.toLocaleString()} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المستحق</p>
                <p className="text-xl font-bold">{stats.totalUnpaid.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">فواتير مفتوحة</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Debtors */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5" /> أكبر 10 مدينين</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topDebtors.map((debtor, i) => (
              <div key={debtor.customerId} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/customers/${debtor.customerId}`)}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                  <div>
                    <p className="font-medium text-sm">{debtor.name}</p>
                    <p className="text-xs text-muted-foreground">{debtor.count} فاتورة</p>
                  </div>
                </div>
                <span className="font-bold text-destructive">{debtor.total.toLocaleString()} ج.م</span>
              </div>
            ))}
            {topDebtors.length === 0 && <p className="text-center text-muted-foreground py-4">لا توجد ديون مستحقة</p>}
          </CardContent>
        </Card>

        {/* Aging Report */}
        <Card>
          <CardHeader><CardTitle>أعمار الديون</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: '0-30 يوم', value: aging.current, color: 'bg-emerald-500' },
              { label: '31-60 يوم', value: aging.days30, color: 'bg-amber-500' },
              { label: '61-90 يوم', value: aging.days60, color: 'bg-orange-500' },
              { label: '90+ يوم', value: aging.over90, color: 'bg-destructive' },
            ].map(bucket => (
              <div key={bucket.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{bucket.label}</span>
                  <span className="font-medium">{bucket.value.toLocaleString()} ج.م</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${bucket.color}`}
                    style={{ width: agingTotal > 0 ? `${(bucket.value / agingTotal) * 100}%` : '0%' }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Overdue invoices list */}
      <Card>
        <CardHeader><CardTitle>الفواتير المستحقة</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isMobile ? (
            <div className="p-4 space-y-3">
              {unpaidInvoices.slice(0, 20).map(inv => {
                const cust = inv.customers as { name: string } | null;
                const remaining = Number(inv.total_amount) - Number(inv.paid_amount || 0);
                return (
                  <DataCard key={inv.id} title={cust?.name || ''} subtitle={inv.invoice_number}
                    badge={{ text: `${remaining.toLocaleString()} ج.م`, variant: 'destructive' }}
                    fields={[
                      { label: 'الاستحقاق', value: inv.due_date || '—' },
                    ]}
                    onClick={() => navigate(`/invoices/${inv.id}`)} />
                );
              })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الفاتورة</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>المبلغ الكلي</TableHead>
                  <TableHead>المدفوع</TableHead>
                  <TableHead>المتبقي</TableHead>
                  <TableHead>الاستحقاق</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaidInvoices.slice(0, 30).map(inv => {
                  const cust = inv.customers as { name: string } | null;
                  const remaining = Number(inv.total_amount) - Number(inv.paid_amount || 0);
                  return (
                    <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{cust?.name}</TableCell>
                      <TableCell>{Number(inv.total_amount).toLocaleString()}</TableCell>
                      <TableCell>{Number(inv.paid_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-destructive">{remaining.toLocaleString()}</TableCell>
                      <TableCell>{inv.due_date || '—'}</TableCell>
                      <TableCell>{getAgeBadge(inv.due_date)}</TableCell>
                    </TableRow>
                  );
                })}
                {unpaidInvoices.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد فواتير مستحقة 🎉</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CollectionDashboard;
