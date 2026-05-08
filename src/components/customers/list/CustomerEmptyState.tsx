import React from 'react';
import { Users, Plus, FileSpreadsheet, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CustomerEmptyStateProps {
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onAdd?: () => void;
  onImport?: () => void;
}

export function CustomerEmptyState({ hasActiveFilters, onClearFilters, onAdd, onImport }: CustomerEmptyStateProps) {
  if (hasActiveFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">لا توجد نتائج</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
          لا يوجد عملاء يطابقون الفلاتر المحددة. جرّب تعديل الفلاتر.
        </p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            إزالة الفلاتر
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      {/* Animated illustration */}
      <div className="relative mb-6">
        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite]">
          <Users className="h-10 w-10 text-primary" />
        </div>
        <div className="absolute -top-2 -right-2 h-8 w-8 rounded-lg bg-warning/15 flex items-center justify-center animate-[bounce_2s_ease-in-out_infinite]">
          <TrendingUp className="h-4 w-4 text-warning" />
        </div>
      </div>

      <h3 className="text-lg font-bold mb-2">ابدأ بإدارة عملائك</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        أضف عملاءك وتتبع معاملاتهم المالية وأرصدتهم بسهولة
      </p>

      {/* Steps */}
      <div className="flex items-center gap-6 mb-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</span>
          أضف أول عميل
        </div>
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold">2</span>
          أنشئ فاتورة
        </div>
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold">3</span>
          تابع المبيعات
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onAdd && (
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة أول عميل
          </Button>
        )}
        {onImport && (
          <Button variant="outline" onClick={onImport}>
            <FileSpreadsheet className="h-4 w-4 ml-2" />
            استيراد
          </Button>
        )}
      </div>
    </div>
  );
}
