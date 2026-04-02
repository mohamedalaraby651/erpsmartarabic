import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info, Clock, TrendingDown } from "lucide-react";

interface SupplierAlertsBannerProps {
  currentBalance: number;
  creditLimit: number;
  pendingOrderCount: number;
  lastOrderDate: string | null;
}

const HIGH_BALANCE_THRESHOLD = 50000;
const INACTIVITY_DAYS = 90;

const SupplierAlertsBanner = ({
  currentBalance, creditLimit, pendingOrderCount, lastOrderDate,
}: SupplierAlertsBannerProps) => {
  const alerts: Array<{ variant: 'destructive' | 'default'; icon: React.ReactNode; title: string; description: string }> = [];

  // High balance
  if (currentBalance > HIGH_BALANCE_THRESHOLD) {
    alerts.push({
      variant: 'destructive',
      icon: <AlertTriangle className="h-4 w-4" />,
      title: 'رصيد مرتفع',
      description: `الرصيد الحالي (${currentBalance.toLocaleString()} ج.م) يتجاوز الحد المسموح.`,
    });
  }

  // Credit exceeded
  if (creditLimit > 0 && currentBalance >= creditLimit) {
    alerts.push({
      variant: 'destructive',
      icon: <TrendingDown className="h-4 w-4" />,
      title: 'تجاوز حد الائتمان',
      description: `الرصيد (${currentBalance.toLocaleString()}) تجاوز حد الائتمان (${creditLimit.toLocaleString()} ج.م).`,
    });
  }

  // Pending orders
  if (pendingOrderCount > 0) {
    alerts.push({
      variant: 'default',
      icon: <Info className="h-4 w-4" />,
      title: 'طلبات معلقة',
      description: `يوجد ${pendingOrderCount} أمر شراء في انتظار المراجعة أو الاعتماد.`,
    });
  }

  // Inactivity
  if (lastOrderDate) {
    const daysSince = Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > INACTIVITY_DAYS) {
      alerts.push({
        variant: 'default',
        icon: <Clock className="h-4 w-4" />,
        title: 'عدم نشاط',
        description: `لم يتم إنشاء أي أمر شراء منذ ${daysSince} يوم.`,
      });
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert, i) => (
        <Alert key={i} variant={alert.variant}>
          {alert.icon}
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.description}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

export default SupplierAlertsBanner;
