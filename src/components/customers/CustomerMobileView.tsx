import React, { memo, useCallback } from "react";
import { Phone, MapPin, DollarSign, Plus, Users } from "lucide-react";
import CustomerAvatar from "@/components/customers/CustomerAvatar";
import { vipLabels, typeLabels } from "@/lib/customerConstants";
import type { Customer } from "@/lib/customerConstants";
import { DataCard } from "@/components/mobile/DataCard";
import { SwipeableRow } from "@/components/mobile/SwipeableRow";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { VirtualizedList } from "@/components/table/VirtualizedList";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";

interface CustomerMobileViewProps {
  data: Customer[];
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onNavigate: (id: string) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onRefresh: () => Promise<void>;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export const CustomerMobileView = memo(function CustomerMobileView({
  data, isLoading, canEdit, canDelete, onNavigate, onEdit, onDelete, onRefresh,
  hasActiveFilters, onClearFilters,
}: CustomerMobileViewProps) {
  const renderCard = useCallback((customer: Customer) => (
    <SwipeableRow
      key={customer.id}
      onEdit={canEdit ? () => onEdit(customer) : undefined}
      onDelete={canDelete ? () => onDelete(customer.id) : undefined}
      onCall={customer.phone ? () => window.open(`tel:${customer.phone}`) : undefined}
    >
      <DataCard
        title={customer.name}
        subtitle={typeLabels[customer.customer_type] || customer.customer_type}
        icon={<CustomerAvatar name={customer.name} imageUrl={customer.image_url} customerType={customer.customer_type} size="sm" />}
        badge={{ text: vipLabels[customer.vip_level] || customer.vip_level, variant: customer.vip_level === 'regular' ? 'secondary' : 'default' }}
        fields={[
          ...(customer.phone ? [{ label: 'الهاتف', value: customer.phone, icon: <Phone className="h-3 w-3" /> }] : []),
          ...(customer.governorate ? [{ label: 'المحافظة', value: customer.governorate, icon: <MapPin className="h-3 w-3" /> }] : []),
          { label: 'الرصيد', value: <span className={Number(customer.current_balance) > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}>{Number(customer.current_balance || 0).toLocaleString()} ج.م</span>, icon: <DollarSign className="h-3 w-3" /> },
        ]}
        onClick={() => onNavigate(customer.id)}
        onView={() => onNavigate(customer.id)}
        onEdit={canEdit ? () => onEdit(customer) : undefined}
        onDelete={canDelete ? () => onDelete(customer.id) : undefined}
      />
    </SwipeableRow>
  ), [canEdit, canDelete, onEdit, onDelete, onNavigate]);

  if (isLoading) return <MobileListSkeleton count={5} />;

  if (data.length === 0) {
    return <EmptyState icon={Users} title="لا يوجد عملاء" description="ابدأ بإضافة عميلك الأول" />;
  }

  if (data.length > 50) {
    return (
      <PullToRefresh onRefresh={onRefresh}>
        <VirtualizedList data={data} renderItem={renderCard} getItemKey={(c) => c.id} itemHeight={140} maxHeight={window.innerHeight - 280} gap={12} className="px-1" />
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <div className="space-y-3">{data.map(renderCard)}</div>
    </PullToRefresh>
  );
});
