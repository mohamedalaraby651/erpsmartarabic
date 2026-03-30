import React, { memo } from "react";
import { Plus, Users, Search } from "lucide-react";
import CustomerGridCard from "@/components/customers/CustomerGridCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/customerConstants";

interface CustomerGridViewProps {
  data: Customer[];
  isLoading: boolean;
  canEdit: boolean;
  canDelete?: boolean;
  onNavigate: (id: string) => void;
  onNewInvoice: (id: string) => void;
  onWhatsApp: (phone: string) => void;
  onEdit?: (customer: Customer) => void;
  onDelete?: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleSelectAll?: (checked: boolean) => void;
  isAllSelected?: boolean;
  hasSelection: boolean;
  onAdd?: () => void;
  deletingId?: string | null;
  onRowHover?: (id: string) => void;
  onRowLeave?: () => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

// Grid skeleton component
function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center gap-3 animate-pulse">
              <Skeleton className="h-14 w-14 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16" />
              <div className="w-full space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4 mx-auto" />
              </div>
              <Skeleton className="h-4 w-20 mt-2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export const CustomerGridView = memo(function CustomerGridView({
  data, isLoading, canEdit, canDelete, onNavigate, onNewInvoice, onWhatsApp,
  onEdit, onDelete, selectedIds, onToggleSelect, onToggleSelectAll, isAllSelected,
  hasSelection, onAdd, deletingId, onRowHover, onRowLeave, hasActiveFilters, onClearFilters,
}: CustomerGridViewProps) {
  if (isLoading) return <GridSkeleton />;

  if (data.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="text-center py-12">
          <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">لا توجد نتائج</h3>
          <p className="text-muted-foreground text-sm mb-6">لا يوجد عملاء يطابقون الفلاتر المحددة</p>
          {onClearFilters && (
            <Button variant="outline" onClick={onClearFilters}>إزالة الفلاتر</Button>
          )}
        </div>
      );
    }
    return <EmptyState icon={Users} title="لا يوجد عملاء" description="ابدأ بإضافة عميلك الأول" action={onAdd ? { label: 'إضافة عميل جديد', onClick: onAdd, icon: Plus } : undefined} />;
  }

  return (
    <div>
      {/* Select All for Grid */}
      {onToggleSelectAll && (
        <div className="flex items-center gap-2 mb-3">
          <Checkbox checked={isAllSelected} onCheckedChange={() => onToggleSelectAll()} />
          <span className="text-sm text-muted-foreground">تحديد الكل ({data.length})</span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {data.map((customer) => (
          <CustomerGridCard
            key={customer.id}
            customer={customer}
            onClick={() => onNavigate(customer.id)}
            onNewInvoice={canEdit ? () => onNewInvoice(customer.id) : undefined}
            onWhatsApp={customer.phone ? () => onWhatsApp(customer.phone!) : undefined}
            onEdit={canEdit && onEdit ? () => onEdit(customer) : undefined}
            onDelete={canDelete && onDelete ? () => onDelete(customer.id) : undefined}
            isSelected={selectedIds.has(customer.id)}
            onSelect={(checked) => onToggleSelect(customer.id, checked)}
            showSelect={hasSelection}
            isDeleting={deletingId === customer.id}
            onMouseEnter={onRowHover ? () => onRowHover(customer.id) : undefined}
            onMouseLeave={onRowLeave}
          />
        ))}
      </div>
    </div>
  );
});
