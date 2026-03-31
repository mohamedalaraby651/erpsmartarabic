import React from 'react';
import { Users, Plus, FileSpreadsheet, Search } from 'lucide-react';
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
      <div className="text-center py-16 animate-fade-in">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mb-4">
          <Search className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold mb-1.5">لا توجد نتائج</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">لا يوجد عملاء يطابقون الفلاتر المحددة</p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters} className="rounded-xl">إزالة الفلاتر</Button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-16 animate-fade-in">
      {/* Decorative illustration */}
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className="absolute h-28 w-28 rounded-full bg-primary/5 animate-pulse-subtle" />
        <div className="absolute h-20 w-20 rounded-full bg-primary/10" />
        <div className="relative flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
          <Users className="h-8 w-8 text-primary-foreground" />
        </div>
      </div>

      <h3 className="text-xl font-bold mb-2">ابدأ بإدارة عملائك</h3>
      <p className="text-muted-foreground text-sm mb-8 max-w-xs mx-auto leading-relaxed">
        أضف عملاءك وتتبع معاملاتهم المالية وأرصدتهم بسهولة
      </p>

      <div className="flex items-center justify-center gap-3">
        {onAdd && (
          <Button onClick={onAdd} size="lg" className="min-h-12 rounded-xl px-6 shadow-md shadow-primary/20">
            <Plus className="h-5 w-5 ml-2" /> إضافة عميل
          </Button>
        )}
        {onImport && (
          <Button variant="outline" onClick={onImport} size="lg" className="min-h-12 rounded-xl px-6">
            <FileSpreadsheet className="h-5 w-5 ml-2" /> استيراد
          </Button>
        )}
      </div>
    </div>
  );
}
