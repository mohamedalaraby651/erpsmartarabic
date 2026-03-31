import type { AlertType, AlertSeverity } from '@/hooks/useCustomerAlerts';

export interface AlertTypeInfo {
  type: AlertType;
  label: string;
  icon: string; // lucide icon name
  color: string; // tailwind text color for the icon
  bgColor: string; // light bg for badge
  severity: AlertSeverity;
}

export const ALERT_TYPE_CONFIG: Record<AlertType, AlertTypeInfo> = {
  credit_exceeded: {
    type: 'credit_exceeded',
    label: 'تجاوز ائتمان',
    icon: 'AlertOctagon',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    severity: 'error',
  },
  overdue_payment: {
    type: 'overdue_payment',
    label: 'فواتير متأخرة',
    icon: 'Clock',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    severity: 'error',
  },
  credit_approaching: {
    type: 'credit_approaching',
    label: 'اقتراب ائتمان',
    icon: 'TrendingUp',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    severity: 'warning',
  },
  upcoming_due: {
    type: 'upcoming_due',
    label: 'دفعات قريبة',
    icon: 'CalendarClock',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    severity: 'warning',
  },
  vip_no_contact: {
    type: 'vip_no_contact',
    label: 'VIP بدون تواصل',
    icon: 'Crown',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    severity: 'warning',
  },
  sales_decline: {
    type: 'sales_decline',
    label: 'انخفاض مبيعات',
    icon: 'TrendingDown',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    severity: 'info',
  },
  inactive: {
    type: 'inactive',
    label: 'عملاء خاملون',
    icon: 'UserMinus',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    severity: 'info',
  },
  new_customer: {
    type: 'new_customer',
    label: 'عملاء جدد',
    icon: 'UserPlus',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    severity: 'success',
  },
};

// Ordered by priority for display
export const ALERT_TYPE_ORDER: AlertType[] = [
  'credit_exceeded', 'overdue_payment', 'credit_approaching',
  'upcoming_due', 'vip_no_contact', 'sales_decline', 'inactive', 'new_customer',
];
