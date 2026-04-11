import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, CreditCard, Wallet, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SupplierTimelineDrawerProps {
  supplierId: string;
  type: 'purchases' | 'payments' | 'outstanding' | 'orders' | null;
  open: boolean;
  onClose: () => void;
}

const titles: Record<string, { label: string; icon: typeof TrendingUp }> = {
  purchases: { label: 'سجل المشتريات', icon: TrendingUp },
  payments: { label: 'سجل المدفوعات', icon: CreditCard },
  outstanding: { label: 'المستحقات المعلقة', icon: Wallet },
  orders: { label: 'أوامر الشراء', icon: ShoppingCart },
};

const SupplierTimelineDrawer = ({ supplierId, type, open, onClose }: SupplierTimelineDrawerProps) => {
  const navigate = useNavigate();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['supplier-timeline', supplierId, type],
    queryFn: async () => {
      if (!type) return [];
      if (type === 'payments') {
        const { data } = await supabase.from('supplier_payments').select('*')
          .eq('supplier_id', supplierId).order('payment_date', { ascending: false }).limit(20);
        return (data || []).map((p: any) => ({
          id: p.id, kind: 'payment' as const,
          title: p.payment_number, date: p.payment_date,
          amount: Number(p.amount), status: 'مسدد',
        }));
      }
      // orders / purchases / outstanding
      let query = supabase.from('purchase_orders').select('*')
        .eq('supplier_id', supplierId).order('created_at', { ascending: false }).limit(20);
      if (type === 'outstanding') {
        query = query.in('status', ['pending', 'approved']);
      }
      const { data } = await query;
      return (data || []).map((o: any) => ({
        id: o.id, kind: 'order' as const,
        title: o.order_number, date: o.created_at,
        amount: Number(o.total_amount),
        status: o.status === 'completed' ? 'مكتمل' : o.status === 'approved' ? 'معتمد' : o.status === 'pending' ? 'معلق' : o.status,
        navigateTo: `/purchase-orders/${o.id}`,
      }));
    },
    enabled: open && !!type,
  });

  const config = type ? titles[type] : null;
  const Icon = config?.icon || TrendingUp;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full sm:w-[400px]" dir="rtl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Icon className="h-5 w-5" />{config?.label}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 overflow-auto max-h-[calc(100vh-120px)]">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
          ) : (
            items.map((item: any) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors ${item.navigateTo ? 'cursor-pointer' : ''}`}
                onClick={() => item.navigateTo && navigate(item.navigateTo)}
              >
                <div>
                  <p className="font-mono text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString('ar-EG')}</p>
                </div>
                <div className="text-left">
                  <p className={`font-bold text-sm ${item.kind === 'payment' ? 'text-green-600' : ''}`}>{item.amount.toLocaleString()} ج.م</p>
                  <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SupplierTimelineDrawer;
