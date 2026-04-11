import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, CreditCard, Wallet, ShoppingCart } from 'lucide-react';
import SupplierTimelineDrawer from './SupplierTimelineDrawer';

interface SupplierKPICardsProps {
  supplierId: string;
  totalPurchases: number;
  totalPayments: number;
  totalOutstanding: number;
  orderCount: number;
}

type KPIType = 'purchases' | 'payments' | 'outstanding' | 'orders';

const SupplierKPICards = ({ supplierId, totalPurchases, totalPayments, totalOutstanding, orderCount }: SupplierKPICardsProps) => {
  const [drawerType, setDrawerType] = useState<KPIType | null>(null);

  const kpis: Array<{ key: KPIType; label: string; value: string; icon: typeof TrendingUp; color: string }> = [
    { key: 'purchases', label: 'المشتريات', value: totalPurchases.toLocaleString(), icon: TrendingUp, color: 'text-primary' },
    { key: 'payments', label: 'المدفوعات', value: totalPayments.toLocaleString(), icon: CreditCard, color: 'text-green-600' },
    { key: 'outstanding', label: 'المستحق', value: totalOutstanding.toLocaleString(), icon: Wallet, color: totalOutstanding > 0 ? 'text-destructive' : 'text-green-600' },
    { key: 'orders', label: 'الطلبات', value: orderCount.toString(), icon: ShoppingCart, color: 'text-blue-600' },
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        {kpis.map((kpi) => (
          <Card
            key={kpi.key}
            className="bg-background/60 backdrop-blur-sm border-border/50 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
            onClick={() => setDrawerType(kpi.key)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/50"><kpi.icon className={`h-4 w-4 ${kpi.color}`} /></div>
              <div>
                <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SupplierTimelineDrawer
        supplierId={supplierId}
        type={drawerType}
        open={!!drawerType}
        onClose={() => setDrawerType(null)}
      />
    </>
  );
};

export default SupplierKPICards;
