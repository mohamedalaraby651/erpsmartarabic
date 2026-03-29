import React, { memo } from "react";
import { Plus, Users } from "lucide-react";
import CustomerGridCard from "@/components/customers/CustomerGridCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
  hasSelection: boolean;
  onAdd?: () => void;
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
  data, isLoading, canEdit, onNavigate, onNewInvoice, onWhatsApp,
  selectedIds, onToggleSelect, hasSelection, onAdd,
}: CustomerGridViewProps) {
  if (isLoading) return <GridSkeleton />;

  if (data.length === 0) {
    return <EmptyState icon={Users} title="لا يوجد عملاء" description="ابدأ بإضافة عميلك الأول" action={onAdd ? { label: 'إضافة عميل جديد', onClick: onAdd, icon: Plus } : undefined} />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {data.map((customer) => (
        <CustomerGridCard
          key={customer.id}
          customer={customer}
          onClick={() => onNavigate(customer.id)}
          onNewInvoice={canEdit ? () => onNewInvoice(customer.id) : undefined}
          onWhatsApp={customer.phone ? () => onWhatsApp(customer.phone!) : undefined}
          isSelected={selectedIds.has(customer.id)}
          onSelect={(checked) => onToggleSelect(customer.id, checked)}
          showSelect={hasSelection}
        />
      ))}
    </div>
  );
});
