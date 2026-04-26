import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, RefreshCw, type LucideIcon } from "lucide-react";

export interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

interface PurchaseOrderStatsProps {
  total: number;
  pending: number;
  completed: number;
  totalValue: number;
  variant?: 'desktop' | 'mobile';
}

export const buildPurchaseOrderStatItems = (s: {
  total: number; pending: number; completed: number; totalValue: number;
}): StatItem[] => [
  { label: 'إجمالي الأوامر', value: s.total, icon: ClipboardList, color: 'text-primary', bgColor: 'bg-primary/10' },
  { label: 'قيد الانتظار', value: s.pending, icon: RefreshCw, color: 'text-warning', bgColor: 'bg-warning/10' },
  { label: 'مكتملة', value: s.completed, icon: ClipboardList, color: 'text-success', bgColor: 'bg-success/10' },
  { label: 'إجمالي القيمة', value: s.totalValue.toLocaleString(), icon: ClipboardList, color: 'text-info', bgColor: 'bg-info/10' },
];

export const PurchaseOrderStats = ({ total, pending, completed, totalValue, variant = 'desktop' }: PurchaseOrderStatsProps) => {
  const items = buildPurchaseOrderStatItems({ total, pending, completed, totalValue });

  if (variant === 'mobile') {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {items.map((stat, i) => (
          <Card key={i} className="min-w-[140px] shrink-0">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((stat, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
