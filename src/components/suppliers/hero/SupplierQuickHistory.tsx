import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SupplierQuickHistoryProps {
  supplierId: string;
}

const statusLabels: Record<string, string> = {
  draft: 'مسودة', pending: 'معلق', approved: 'معتمد', completed: 'مكتمل', cancelled: 'ملغي',
};
const statusColors: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  approved: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  pending: 'bg-muted text-muted-foreground',
  draft: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
};

const SupplierQuickHistory = ({ supplierId }: SupplierQuickHistoryProps) => {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['supplier-quick-history', supplierId],
    queryFn: async () => {
      const [ordersRes, paymentsRes] = await Promise.all([
        supabase.from('purchase_orders').select('id, order_number, total_amount, status, created_at')
          .eq('supplier_id', supplierId).order('created_at', { ascending: false }).limit(3),
        supabase.from('supplier_payments').select('id, payment_number, amount, payment_date')
          .eq('supplier_id', supplierId).order('payment_date', { ascending: false }).limit(1),
      ]);
      return {
        orders: ordersRes.data || [],
        lastPayment: paymentsRes.data?.[0] || null,
      };
    },
    staleTime: 60000,
  });

  if (!data || (data.orders.length === 0 && !data.lastPayment)) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {data.orders.map((o) => (
        <div key={o.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border cursor-pointer hover:bg-muted transition-colors" onClick={() => navigate(`/purchase-orders/${o.id}`)}>
          <ShoppingCart className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-xs">{o.order_number}</span>
          <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${statusColors[o.status] || ''}`}>
            {statusLabels[o.status] || o.status}
          </Badge>
        </div>
      ))}
      {data.lastPayment && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/5 border border-emerald-500/20">
          <CreditCard className="h-3 w-3 text-emerald-600" />
          <span className="text-muted-foreground">آخر دفعة:</span>
          <span className="font-medium">{Number(data.lastPayment.amount).toLocaleString()} ج.م</span>
          <span className="text-muted-foreground">{new Date(data.lastPayment.payment_date).toLocaleDateString('ar-EG')}</span>
        </div>
      )}
    </div>
  );
};

export default SupplierQuickHistory;
