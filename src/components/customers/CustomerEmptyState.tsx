import React from 'react';
import { Users, FileText, Wallet, Plus, FileSpreadsheet, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CustomerEmptyStateProps {
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onAdd?: () => void;
  onImport?: () => void;
}

const steps = [
  { icon: Users, label: 'أضف عميلك الأول', description: 'سجّل بيانات العميل الأساسية' },
  { icon: FileText, label: 'أنشئ فاتورة أو عرض سعر', description: 'ابدأ بإصدار أول معاملة مالية' },
  { icon: Wallet, label: 'تتبع المدفوعات والأرصدة', description: 'راقب حركة الحسابات والتحصيل' },
];

export function CustomerEmptyState({ hasActiveFilters, onClearFilters, onAdd, onImport }: CustomerEmptyStateProps) {
  if (hasActiveFilters) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">لا توجد نتائج</h3>
        <p className="text-muted-foreground text-sm mb-6">لا يوجد عملاء يطابقون الفلاتر المحددة</p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>إزالة الفلاتر</Button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-10 animate-fade-in">
      <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-primary/10 mb-5">
        <Users className="h-10 w-10 text-primary" />
      </div>
      <h3 className="text-xl font-bold mb-2">ابدأ بإدارة عملائك</h3>
      <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
        أضف عملاءك وتتبع معاملاتهم المالية بسهولة
      </p>

      <div className="max-w-sm mx-auto space-y-3 mb-8 text-start">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
              {i + 1}
            </div>
            <div>
              <p className="font-medium text-sm">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3">
        {onAdd && (
          <Button onClick={onAdd} size="lg" className="min-h-11">
            <Plus className="h-4 w-4 ml-2" /> إضافة عميل
          </Button>
        )}
        {onImport && (
          <Button variant="outline" onClick={onImport} size="lg" className="min-h-11">
            <FileSpreadsheet className="h-4 w-4 ml-2" /> استيراد
          </Button>
        )}
      </div>
    </div>
  );
}
