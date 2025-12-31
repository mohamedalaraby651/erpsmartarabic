import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingCart,
  TrendingUp,
  Wallet,
  Calculator,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface SupplierStatsCardsProps {
  totalOrders: number;
  totalPurchases: number;
  currentBalance: number;
  averageOrderValue: number;
  lastOrderDate: string | null;
  hasHighBalance?: boolean;
}

const SupplierStatsCards = ({
  totalOrders,
  totalPurchases,
  currentBalance,
  averageOrderValue,
  lastOrderDate,
  hasHighBalance = false,
}: SupplierStatsCardsProps) => {
  const stats = [
    {
      title: "إجمالي الطلبات",
      value: totalOrders.toString(),
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "إجمالي المشتريات",
      value: `${totalPurchases.toLocaleString()} ج.م`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-500/10",
    },
    {
      title: "الرصيد الحالي",
      value: `${currentBalance.toLocaleString()} ج.م`,
      icon: Wallet,
      color: hasHighBalance ? "text-red-600" : "text-orange-600",
      bgColor: hasHighBalance ? "bg-red-500/10" : "bg-orange-500/10",
      alert: hasHighBalance,
    },
    {
      title: "متوسط قيمة الطلب",
      value: `${averageOrderValue.toLocaleString()} ج.م`,
      icon: Calculator,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "آخر طلب",
      value: lastOrderDate
        ? format(new Date(lastOrderDate), "d MMM yyyy", { locale: ar })
        : "لا يوجد",
      icon: Calendar,
      color: "text-indigo-600",
      bgColor: "bg-indigo-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              {stat.alert && (
                <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
              )}
            </div>
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">{stat.title}</p>
              <p className={`text-lg font-bold mt-1 ${stat.alert ? 'text-red-600' : ''}`}>
                {stat.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SupplierStatsCards;
