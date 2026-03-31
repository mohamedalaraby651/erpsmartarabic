import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, CreditCard, Percent, Clock, Wallet } from "lucide-react";

interface CustomerFinancialSummaryProps {
  totalPurchases: number;
  totalPayments: number;
  currentBalance: number;
  creditLimit: number;
  discountPercentage: number;
  paymentTermsDays: number;
  invoiceCount: number;
  totalOutstanding?: number;
}

const CustomerFinancialSummary = ({
  totalPurchases,
  totalPayments,
  currentBalance,
  creditLimit,
  discountPercentage,
  paymentTermsDays,
  invoiceCount,
}: CustomerFinancialSummaryProps) => {
  const paymentRatio = totalPurchases > 0 ? (totalPayments / totalPurchases) * 100 : 0;
  const creditUsage = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;
  const avgInvoice = invoiceCount > 0 ? totalPurchases / invoiceCount : 0;

  const items = [
    {
      icon: TrendingUp,
      label: 'إجمالي المشتريات',
      value: `${totalPurchases.toLocaleString()} ج.م`,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: TrendingDown,
      label: 'إجمالي المدفوعات',
      value: `${totalPayments.toLocaleString()} ج.م`,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: Wallet,
      label: 'الرصيد المستحق',
      value: `${currentBalance.toLocaleString()} ج.م`,
      color: currentBalance > 0 ? 'text-destructive' : 'text-emerald-600',
      bgColor: currentBalance > 0 ? 'bg-destructive/10' : 'bg-emerald-500/10',
    },
    {
      icon: CreditCard,
      label: 'متوسط قيمة الفاتورة',
      value: `${avgInvoice.toLocaleString()} ج.م`,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Percent,
      label: 'نسبة الخصم المخصصة',
      value: `${discountPercentage}%`,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: Clock,
      label: 'مدة السداد',
      value: paymentTermsDays > 0 ? `${paymentTermsDays} يوم` : 'فوري',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>الملخص المالي</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <div className={`p-2 rounded-lg ${item.bgColor}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">نسبة السداد</span>
              <span className="font-medium">{paymentRatio.toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(paymentRatio, 100)} className="h-2" />
          </div>

          {creditLimit > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">استخدام حد الائتمان</span>
                <span className="font-medium">
                  {currentBalance.toLocaleString()} / {creditLimit.toLocaleString()} ج.م
                </span>
              </div>
              <Progress
                value={Math.min(creditUsage, 100)}
                className={`h-2 ${creditUsage > 80 ? '[&>div]:bg-destructive' : creditUsage > 50 ? '[&>div]:bg-amber-500' : ''}`}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerFinancialSummary;
