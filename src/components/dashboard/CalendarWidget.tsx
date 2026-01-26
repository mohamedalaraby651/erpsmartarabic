import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Receipt, FileText, ClipboardList, AlertCircle } from 'lucide-react';
import { format, addDays, isToday, isTomorrow, isPast } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'invoice_due' | 'quotation_expiry' | 'task_due' | 'order_delivery';
  status: 'upcoming' | 'today' | 'overdue';
  amount?: number;
}

export function CalendarWidget() {
  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-widget-events'],
    queryFn: async () => {
      const today = new Date();
      const nextWeek = addDays(today, 7);

      const [invoicesRes, quotationsRes, tasksRes, ordersRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, invoice_number, due_date, total_amount, payment_status')
          .neq('payment_status', 'paid')
          .not('due_date', 'is', null)
          .lte('due_date', nextWeek.toISOString().split('T')[0])
          .order('due_date', { ascending: true })
          .limit(10),
        supabase
          .from('quotations')
          .select('id, quotation_number, valid_until, total_amount, status')
          .eq('status', 'pending')
          .not('valid_until', 'is', null)
          .lte('valid_until', nextWeek.toISOString().split('T')[0])
          .order('valid_until', { ascending: true })
          .limit(10),
        supabase
          .from('tasks')
          .select('id, title, due_date, priority')
          .eq('is_completed', false)
          .not('due_date', 'is', null)
          .lte('due_date', nextWeek.toISOString().split('T')[0])
          .order('due_date', { ascending: true })
          .limit(10),
        supabase
          .from('sales_orders')
          .select('id, order_number, delivery_date, total_amount, status')
          .in('status', ['pending', 'approved'])
          .not('delivery_date', 'is', null)
          .lte('delivery_date', nextWeek.toISOString().split('T')[0])
          .order('delivery_date', { ascending: true })
          .limit(10),
      ]);

      const allEvents: CalendarEvent[] = [];

      // Process invoices
      (invoicesRes.data || []).forEach(inv => {
        const dueDate = new Date(inv.due_date!);
        allEvents.push({
          id: `inv-${inv.id}`,
          title: `فاتورة ${inv.invoice_number}`,
          date: dueDate,
          type: 'invoice_due',
          status: isPast(dueDate) && !isToday(dueDate) ? 'overdue' : isToday(dueDate) ? 'today' : 'upcoming',
          amount: inv.total_amount,
        });
      });

      // Process quotations
      (quotationsRes.data || []).forEach(q => {
        const expiryDate = new Date(q.valid_until!);
        allEvents.push({
          id: `quo-${q.id}`,
          title: `عرض سعر ${q.quotation_number}`,
          date: expiryDate,
          type: 'quotation_expiry',
          status: isPast(expiryDate) && !isToday(expiryDate) ? 'overdue' : isToday(expiryDate) ? 'today' : 'upcoming',
          amount: q.total_amount,
        });
      });

      // Process tasks
      (tasksRes.data || []).forEach(task => {
        const dueDate = new Date(task.due_date!);
        allEvents.push({
          id: `task-${task.id}`,
          title: task.title,
          date: dueDate,
          type: 'task_due',
          status: isPast(dueDate) && !isToday(dueDate) ? 'overdue' : isToday(dueDate) ? 'today' : 'upcoming',
        });
      });

      // Process orders
      (ordersRes.data || []).forEach(order => {
        const deliveryDate = new Date(order.delivery_date!);
        allEvents.push({
          id: `order-${order.id}`,
          title: `أمر بيع ${order.order_number}`,
          date: deliveryDate,
          type: 'order_delivery',
          status: isPast(deliveryDate) && !isToday(deliveryDate) ? 'overdue' : isToday(deliveryDate) ? 'today' : 'upcoming',
          amount: order.total_amount,
        });
      });

      // Sort by date
      return allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
    },
    staleTime: 30000,
  });

  const getIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'invoice_due': return Receipt;
      case 'quotation_expiry': return FileText;
      case 'task_due': return ClipboardList;
      case 'order_delivery': return CalendarDays;
      default: return AlertCircle;
    }
  };

  const getStatusColor = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'overdue': return 'destructive';
      case 'today': return 'default';
      case 'upcoming': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: CalendarEvent['status'], date: Date) => {
    if (status === 'overdue') return 'متأخر';
    if (isToday(date)) return 'اليوم';
    if (isTomorrow(date)) return 'غداً';
    return format(date, 'EEEE', { locale: ar });
  };

  if (isLoading) {
    return (
      <>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            التقويم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          التقويم
        </CardTitle>
        <CardDescription>المواعيد القادمة خلال الأسبوع</CardDescription>
      </CardHeader>
      <CardContent>
        {events && events.length > 0 ? (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {events.slice(0, 8).map((event) => {
              const Icon = getIcon(event.type);
              return (
                <div
                  key={event.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    event.status === 'overdue' 
                      ? 'bg-destructive/10 border border-destructive/20' 
                      : event.status === 'today'
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                    event.status === 'overdue' ? 'bg-destructive/20' :
                    event.status === 'today' ? 'bg-primary/20' : 'bg-muted'
                  }`}>
                    <Icon className={`h-4 w-4 ${
                      event.status === 'overdue' ? 'text-destructive' :
                      event.status === 'today' ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(event.date, 'd MMMM', { locale: ar })}
                      {event.amount && ` • ${event.amount.toLocaleString('ar-EG')} ج.م`}
                    </p>
                  </div>
                  <Badge variant={getStatusColor(event.status)} className="text-xs shrink-0">
                    {getStatusLabel(event.status, event.date)}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>لا توجد مواعيد قريبة</p>
          </div>
        )}
      </CardContent>
    </>
  );
}
