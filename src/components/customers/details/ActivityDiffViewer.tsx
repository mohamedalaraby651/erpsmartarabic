import React, { memo } from 'react';
import { cn } from '@/lib/utils';

/** Arabic field name map */
const fieldLabelMap: Record<string, string> = {
  name: 'الاسم',
  phone: 'الهاتف',
  phone2: 'الهاتف 2',
  email: 'البريد الإلكتروني',
  credit_limit: 'حد الائتمان',
  current_balance: 'الرصيد الحالي',
  customer_type: 'النوع',
  vip_level: 'مستوى VIP',
  is_active: 'الحالة',
  governorate: 'المحافظة',
  city: 'المدينة',
  discount_percentage: 'نسبة الخصم',
  contact_person: 'شخص الاتصال',
  contact_person_role: 'منصب شخص الاتصال',
  payment_terms_days: 'مدة السداد',
  preferred_payment_method: 'طريقة الدفع المفضلة',
  notes: 'الملاحظات',
  category_id: 'التصنيف',
  tax_number: 'الرقم الضريبي',
  total_amount: 'المبلغ الإجمالي',
  paid_amount: 'المبلغ المدفوع',
  payment_status: 'حالة الدفع',
  status: 'الحالة',
  amount: 'المبلغ',
  invoice_number: 'رقم الفاتورة',
  payment_number: 'رقم الدفعة',
  due_date: 'تاريخ الاستحقاق',
  image_url: 'الصورة',
  facebook_url: 'فيسبوك',
  website_url: 'الموقع',
  updated_at: 'آخر تحديث',
};

const valueDisplayMap: Record<string, Record<string, string>> = {
  customer_type: { individual: 'فرد', company: 'شركة', farm: 'مزرعة' },
  vip_level: { regular: 'عادي', silver: 'فضي', gold: 'ذهبي', platinum: 'بلاتيني' },
  is_active: { true: 'نشط', false: 'غير نشط' },
  payment_status: { pending: 'معلق', partial: 'جزئي', paid: 'مسدد' },
};

/** Fields to skip in diff display */
const skipFields = new Set([
  'id', 'tenant_id', 'created_at', 'updated_at', 'last_activity_at',
  'total_purchases_cached', 'invoice_count_cached', 'last_communication_at',
  'last_transaction_date', 'price_list_id',
]);

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  const mapped = valueDisplayMap[field]?.[String(value)];
  if (mapped) return mapped;
  if (typeof value === 'number') return value.toLocaleString('ar-EG');
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  return String(value);
}

interface ActivityDiffViewerProps {
  oldValues: unknown;
  newValues: unknown;
  maxItems?: number;
}

export const ActivityDiffViewer = memo(function ActivityDiffViewer({
  oldValues,
  newValues,
  maxItems = 6,
}: ActivityDiffViewerProps) {
  if (!oldValues && !newValues) return null;

  const oldObj = (typeof oldValues === 'object' && oldValues !== null ? oldValues : {}) as Record<string, unknown>;
  const newObj = (typeof newValues === 'object' && newValues !== null ? newValues : {}) as Record<string, unknown>;

  const changedKeys = Object.keys(newObj).filter(k => {
    if (skipFields.has(k)) return false;
    return JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]);
  });

  if (changedKeys.length === 0) return null;

  const visible = changedKeys.slice(0, maxItems);
  const remaining = changedKeys.length - maxItems;

  return (
    <div className="mt-2 space-y-1.5">
      {visible.map(key => {
        const label = fieldLabelMap[key] || key;
        const oldVal = formatValue(key, oldObj[key]);
        const newVal = formatValue(key, newObj[key]);
        const isCreate = oldObj[key] === undefined;

        return (
          <div
            key={key}
            className="flex items-center gap-2 text-[11px] bg-muted/50 rounded-md px-2.5 py-1.5 border border-border/50"
          >
            <span className="font-medium text-foreground shrink-0">{label}:</span>
            {!isCreate && oldVal !== '—' && (
              <span className="text-destructive/70 line-through truncate max-w-[120px]">{oldVal}</span>
            )}
            <span className={cn(
              "truncate max-w-[160px]",
              "text-success"
            )}>
              {!isCreate && '← '}{newVal}
            </span>
          </div>
        );
      })}
      {remaining > 0 && (
        <p className="text-[10px] text-muted-foreground pr-1">+{remaining} تغييرات أخرى</p>
      )}
    </div>
  );
});
