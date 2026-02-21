import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { UserX, Clock } from 'lucide-react';

export function InactiveCustomersReport() {
  const [period, setPeriod] = useState('90');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['inactive-customers', period],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - parseInt(period) * 86400000).toISOString();
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, governorate, current_balance, last_transaction_date')
        .eq('is_active', true)
        .or(`last_transaction_date.is.null,last_transaction_date.lt.${cutoff}`)
        .order('last_transaction_date', { ascending: true, nullsFirst: true });
      return data || [];
    },
    staleTime: 60000,
  });

  const stats = useMemo(() => {
    if (!customers) return { count: 0, totalBalance: 0 };
    return {
      count: customers.length,
      totalBalance: customers.reduce((s, c) => s + Number(c.current_balance || 0), 0),
    };
  }, [customers]);

  if (isLoading) {
    return <div className="space-y-4">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold">{stats.count}</p>
                <p className="text-xs text-muted-foreground">عميل غير نشط</p>
              </div>
            </div>
          </Card>
          <Card className="px-4 py-2">
            <div>
              <p className="text-xl font-bold text-destructive">
                {stats.totalBalance.toLocaleString('ar-EG')} ج.م
              </p>
              <p className="text-xs text-muted-foreground">أرصدة معلقة</p>
            </div>
          </Card>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 يوم</SelectItem>
            <SelectItem value="60">60 يوم</SelectItem>
            <SelectItem value="90">90 يوم</SelectItem>
            <SelectItem value="180">180 يوم</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>العملاء غير النشطين</CardTitle>
          <CardDescription>عملاء لم يتعاملوا خلال {period} يوم</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customers?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا يوجد عملاء غير نشطين في هذه الفترة
              </div>
            ) : (
              customers?.map(c => {
                const days = c.last_transaction_date
                  ? Math.floor((Date.now() - new Date(c.last_transaction_date).getTime()) / 86400000)
                  : null;
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {c.phone && <span>{c.phone}</span>}
                        {c.governorate && <Badge variant="outline" className="text-xs">{c.governorate}</Badge>}
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-bold">
                        {Number(c.current_balance || 0).toLocaleString('ar-EG')} ج.م
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {days !== null ? `${days} يوم` : 'لم يتعامل أبداً'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
