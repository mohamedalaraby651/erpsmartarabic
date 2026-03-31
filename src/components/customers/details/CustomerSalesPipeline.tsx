import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ShoppingCart, Receipt, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Invoice = Database['public']['Tables']['invoices']['Row'];
type SalesOrder = Database['public']['Tables']['sales_orders']['Row'];
type Quotation = Database['public']['Tables']['quotations']['Row'];

interface CustomerSalesPipelineProps {
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
}

export const CustomerSalesPipeline = memo(function CustomerSalesPipeline({
  quotations,
  salesOrders,
  invoices,
}: CustomerSalesPipelineProps) {
  const stages = useMemo(() => {
    const openQuotes = quotations.filter(q => ['pending', 'draft'].includes(q.status || ''));
    const activeOrders = salesOrders.filter(o => ['pending', 'draft', 'confirmed'].includes(o.status || ''));
    const pendingInvoices = invoices.filter(i => ['pending', 'partial'].includes(i.payment_status));

    return [
      {
        key: 'quotes',
        label: 'عروض أسعار',
        icon: FileText,
        count: openQuotes.length,
        total: quotations.length,
        amount: openQuotes.reduce((s, q) => s + Number(q.total_amount || 0), 0),
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
      },
      {
        key: 'orders',
        label: 'أوامر بيع',
        icon: ShoppingCart,
        count: activeOrders.length,
        total: salesOrders.length,
        amount: activeOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
      },
      {
        key: 'invoices',
        label: 'فواتير معلقة',
        icon: Receipt,
        count: pendingInvoices.length,
        total: invoices.length,
        amount: pendingInvoices.reduce((s, i) => s + Number(i.total_amount || 0) - Number(i.paid_amount || 0), 0),
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
      },
    ];
  }, [quotations, salesOrders, invoices]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">مسار المبيعات</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            return (
              <div key={stage.key} className="flex items-center flex-1 min-w-0">
                <div className={cn(
                  'flex-1 rounded-lg border p-3 text-center transition-all',
                  stage.bg, stage.borderColor,
                  stage.count > 0 ? 'ring-1 ring-offset-1' : 'opacity-60'
                )}>
                  <Icon className={cn('h-5 w-5 mx-auto mb-1.5', stage.color)} />
                  <p className={cn('text-lg font-bold', stage.color)}>{stage.count}</p>
                  <p className="text-[10px] text-muted-foreground">{stage.label}</p>
                  {stage.count > 0 && (
                    <p className={cn('text-[10px] font-medium mt-0.5', stage.color)}>
                      {stage.amount.toLocaleString()} ج.م
                    </p>
                  )}
                </div>
                {i < stages.length - 1 && (
                  <ArrowLeft className="h-4 w-4 text-muted-foreground/40 shrink-0 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
