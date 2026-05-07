import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, CreditCard, Percent, Clock, Wallet, Star, Timer } from "lucide-react";

interface CustomerFinancialSummaryProps {
  totalPurchases: number;
  totalPayments: number;
  currentBalance: number;
  creditLimit: number;
  discountPercentage: number;
  paymentTermsDays: number;
  invoiceCount: number;
  totalOutstanding?: number;
  paymentRatio?: number;
  avgInvoiceValue?: number;
  dso?: number | null;
  clv?: number;
}

const CustomerFinancialSummary = ({
  totalPurchases,
  totalPayments,
  currentBalance,
  creditLimit,
  discountPercentage,
  paymentTermsDays,
  invoiceCount,
  totalOutstanding,
  paymentRatio: paymentRatioProp,
  avgInvoiceValue: avgInvoiceProp,
  dso,
  clv,
}: CustomerFinancialSummaryProps) => {
  // Use pre-calculated values if provided, otherwise fallback to local calc
  const paymentRatio = paymentRatioProp ?? (totalPurchases > 0 ? (totalPayments / totalPurchases) * 100 : 0);
  const creditUsage = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;
  const avgInvoice = avgInvoiceProp ?? (invoiceCount > 0 ? totalPurchases / invoiceCount : 0);

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
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      icon: Wallet,
      label: 'المستحق',
      value: `${(totalOutstanding ?? (totalPurchases - totalPayments)).toLocaleString()} ج.م`,
      color: (totalOutstanding ?? (totalPurchases - totalPayments)) > 0 ? 'text-destructive' : 'text-success',
      bgColor: (totalOutstanding ?? (totalPurchases - totalPayments)) > 0 ? 'bg-destructive/10' : 'bg-success/10',
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
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      icon: Clock,
      label: 'مدة السداد',
      value: paymentTermsDays > 0 ? `${paymentTermsDays} يوم` : 'فوري',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
    ...(dso !== undefined && dso !== null ? [{
      icon: Timer,
      label: 'متوسط أيام السداد (DSO)',
      value: `${dso} يوم`,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    }] : []),
    ...(clv !== undefined ? [{
      icon: Star,
      label: 'قيمة العميل (CLV)',
      value: `${clv.toLocaleString()} ج.م`,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    }] : []),
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
                className={`h-2 ${creditUsage > 80 ? '[&>div]:bg-destructive' : creditUsage > 50 ? '[&>div]:bg-warning' : ''}`}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerFinancialSummary;
