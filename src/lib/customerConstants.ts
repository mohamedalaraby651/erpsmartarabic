import { Users, Building2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export type Customer = Database['public']['Tables']['customers']['Row'];
export type CustomerAddress = Database['public']['Tables']['customer_addresses']['Row'];

export const vipColors: Record<string, string> = {
  regular: "bg-muted text-muted-foreground",
  silver: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
  gold: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  platinum: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export const vipLabels: Record<string, string> = {
  regular: "عادي",
  silver: "فضي",
  gold: "ذهبي",
  platinum: "بلاتيني",
};

export const typeLabels: Record<string, string> = {
  individual: "فرد",
  company: "شركة",
  farm: "مزرعة",
};

export const typeIcons = {
  individual: Users,
  company: Building2,
  farm: Users,
};

export const getBalanceColor = (balance: number, creditLimit: number): string => {
  if (balance <= 0) return 'text-emerald-600 dark:text-emerald-400';
  if (creditLimit > 0 && balance >= creditLimit * 0.5) return 'text-destructive';
  if (balance > 0) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
};

export const vipOptions = [
  { value: 'regular', label: 'عادي' },
  { value: 'silver', label: 'فضي' },
  { value: 'gold', label: 'ذهبي' },
  { value: 'platinum', label: 'بلاتيني' },
];

export const statusOptions = [
  { value: 'active', label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
];

// Tab group definitions for details page
export const tabGroups = [
  {
    id: 'basic',
    label: 'الأساسي',
    tabs: [
      { value: 'addresses', label: 'العناوين', iconName: 'MapPin' as const },
      { value: 'attachments', label: 'المرفقات', iconName: 'Paperclip' as const },
      { value: 'reminders', label: 'التذكيرات', iconName: 'Bell' as const },
    ],
  },
  {
    id: 'sales',
    label: 'المبيعات',
    tabs: [
      { value: 'invoices', label: 'الفواتير', iconName: 'FileText' as const },
      { value: 'quotations', label: 'عروض الأسعار', iconName: 'Globe' as const },
      { value: 'orders', label: 'أوامر البيع', iconName: 'ShoppingCart' as const },
    ],
  },
  {
    id: 'financial',
    label: 'المالي',
    tabs: [
      { value: 'payments', label: 'المدفوعات', iconName: 'CreditCard' as const },
      { value: 'financial', label: 'الملخص المالي', iconName: 'Wallet' as const },
      { value: 'statement', label: 'كشف الحساب', iconName: 'Printer' as const },
      { value: 'aging', label: 'أعمار الديون', iconName: 'Clock' as const },
    ],
  },
  {
    id: 'analytics',
    label: 'التحليلات',
    tabs: [
      { value: 'analytics', label: 'التحليلات', iconName: 'BarChart3' as const },
      { value: 'communications', label: 'التواصل', iconName: 'MessageSquare' as const },
      { value: 'activity', label: 'النشاط', iconName: 'Activity' as const },
    ],
  },
];
