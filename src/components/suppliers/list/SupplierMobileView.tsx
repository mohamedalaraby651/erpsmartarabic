import { memo, useCallback } from "react";
import { DataCard } from "@/components/mobile/DataCard";
import { VirtualizedMobileList } from "@/components/table/VirtualizedMobileList";
import { ListStateRenderer } from "@/components/shared/ListStateRenderer";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { Building2, Phone, MapPin, Users, Plus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

interface SupplierMobileViewProps {
  suppliers: Supplier[];
  isLoading: boolean;
  error?: Error | null;
  onRowClick: (supplier: Supplier) => void;
  onEdit?: (supplier: Supplier) => void;
  onDelete?: (id: string) => void;
  onAdd: () => void;
  onRefresh: () => Promise<void>;
  onRetry?: () => void;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export const SupplierMobileView = memo(function SupplierMobileView({
  suppliers, isLoading, error, onRowClick, onEdit, onDelete, onAdd, onRefresh, onRetry,
  hasFilters, onClearFilters, canEdit, canDelete,
}: SupplierMobileViewProps) {
  const renderItem = useCallback((supplier: Supplier) => (
    <DataCard
      title={supplier.name}
      subtitle={supplier.contact_person || 'بدون جهة اتصال'}
      badge={{ text: supplier.is_active ? 'نشط' : 'غير نشط', variant: supplier.is_active ? 'default' : 'secondary' }}
      icon={<Building2 className="h-5 w-5" />}
      fields={[
        { label: 'الهاتف', value: supplier.phone || '-', icon: <Phone className="h-4 w-4" /> },
        { label: 'المحافظة', value: supplier.governorate || '-', icon: <MapPin className="h-4 w-4" /> },
        { label: 'الرصيد', value: `${(supplier.current_balance || 0).toLocaleString()} ج.م` },
      ]}
      onClick={() => onRowClick(supplier)}
      onView={() => onRowClick(supplier)}
      onEdit={canEdit && onEdit ? () => onEdit(supplier) : undefined}
      onDelete={canDelete && onDelete ? () => onDelete(supplier.id) : undefined}
    />
  ), [onRowClick, canEdit, canDelete, onEdit, onDelete]);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <ListStateRenderer
        data={suppliers}
        isLoading={isLoading}
        error={error}
        hasFilters={hasFilters}
        onRetry={onRetry}
        onClearFilters={onClearFilters}
        empty={{
          icon: Users,
          title: "لا يوجد موردين",
          description: "ابدأ بإضافة مورد جديد لإدارة المشتريات والمدفوعات بسهولة.",
          action: { label: "مورد جديد", onClick: onAdd, icon: Plus },
        }}
        skeletonCount={5}
      >
        {suppliers.length > 50 ? (
          <VirtualizedMobileList data={suppliers} renderItem={renderItem} getItemKey={(s: Supplier) => s.id} itemHeight={150} />
        ) : (
          <div className="space-y-3">{suppliers.map(s => <div key={s.id}>{renderItem(s)}</div>)}</div>
        )}
      </ListStateRenderer>
    </PullToRefresh>
  );
});
