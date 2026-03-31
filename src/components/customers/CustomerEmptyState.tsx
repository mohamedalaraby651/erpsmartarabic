import React from 'react';
import { Users, Plus, FileSpreadsheet } from 'lucide-react';
import { SharedEmptyState } from '@/components/shared/SharedEmptyState';

interface CustomerEmptyStateProps {
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onAdd?: () => void;
  onImport?: () => void;
}

export function CustomerEmptyState({ hasActiveFilters, onClearFilters, onAdd, onImport }: CustomerEmptyStateProps) {
  if (hasActiveFilters) {
    return (
      <SharedEmptyState
        type="no-results"
        title="لا توجد نتائج"
        description="لا يوجد عملاء يطابقون الفلاتر المحددة"
        secondaryAction={onClearFilters ? { label: 'إزالة الفلاتر', onClick: onClearFilters } : undefined}
      />
    );
  }

  return (
    <SharedEmptyState
      type="no-data"
      icon={Users}
      title="ابدأ بإدارة عملائك"
      description="أضف عملاءك وتتبع معاملاتهم المالية وأرصدتهم بسهولة"
      action={onAdd ? {
        label: 'إضافة عميل',
        onClick: onAdd,
        icon: <Plus className="h-4 w-4" />,
      } : undefined}
      secondaryAction={onImport ? {
        label: 'استيراد',
        onClick: onImport,
      } : undefined}
    />
  );
}
