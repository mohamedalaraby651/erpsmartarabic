import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, CreditCard, Clock, Percent } from "lucide-react";

interface SupplierFinancialSummaryProps {
  totalPurchases: number;
  totalPayments: number;
  currentBalance: number;
  creditLimit: number;
  paymentTermsDays: number;
  discountPercentage: number;
}

const SupplierFinancialSummary = ({
  totalPurchases,
  totalPayments,
  currentBalance,
  creditLimit,
  paymentTermsDays,
  discountPercentage,
}: SupplierFinancialSummaryProps) => {
  const paymentRate = totalPurchases > 0 ? (totalPayments / totalPurchases) * 100 : 0;
  const creditUsage = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;

  const items = [
    { icon: TrendingUp, label: 'إجمالي المشتريات', value: `${totalPurchases.toLocaleString()} ج.م`, color: 'text-primary' },
    { icon: CreditCard, label: 'إجمالي المدفوعات', value: `${totalPayments.toLocaleString()} ج.م`, color: 'text-success' },
    { icon: DollarSign, label: 'الرصيد المستحق', value: `${currentBalance.toLocaleString()} ج.م`, color: currentBalance > 0 ? 'text-destructive' : 'text-success' },
    { icon: Clock, label: 'مدة السداد', value: paymentTermsDays > 0 ? `${paymentTermsDays} يوم` : 'غير محدد', color: 'text-muted-foreground' },
    { icon: Percent, label: 'نسبة الخصم', value: `${discountPercentage}%`, color: 'text-info' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          الملخص المالي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <div key={i} className="text-center p-3 rounded-lg bg-muted/50">
              <item.icon className={`h-5 w-5 mx-auto mb-1 ${item.color}`} />
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* نسبة السداد */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>نسبة السداد</span>
            <span className="font-medium">{paymentRate.toFixed(1)}%</span>
          </div>
          <Progress value={Math.min(paymentRate, 100)} className="h-2" />
        </div>

        {/* استخدام حد الائتمان */}
        {creditLimit > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>استخدام حد الائتمان</span>
              <span className="font-medium">{creditUsage.toFixed(1)}%</span>
            </div>
            <Progress
              value={Math.min(creditUsage, 100)}
              className={`h-2 ${creditUsage >= 80 ? '[&>div]:bg-destructive' : creditUsage >= 50 ? '[&>div]:bg-amber-500' : ''}`}
            />
            <p className="text-xs text-muted-foreground">
              {currentBalance.toLocaleString()} / {creditLimit.toLocaleString()} ج.م
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SupplierFinancialSummary;