import { memo, useCallback } from "react";
import { DataCard } from "@/components/mobile/DataCard";
import { VirtualizedMobileList } from "@/components/table/VirtualizedMobileList";
import { EmptyState } from "@/components/shared/EmptyState";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { Building2, Phone, MapPin, Users, Plus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

interface SupplierMobileViewProps {
  suppliers: Supplier[];
  isLoading: boolean;
  onRowClick: (supplier: Supplier) => void;
  onEdit?: (supplier: Supplier) => void;
  onDelete?: (id: string) => void;
  onAdd: () => void;
  onRefresh: () => Promise<void>;
  canEdit: boolean;
  canDelete: boolean;
}

export const SupplierMobileView = memo(function SupplierMobileView({
  suppliers, isLoading, onRowClick, onEdit, onDelete, onAdd, onRefresh, canEdit, canDelete,
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

  if (isLoading) return <MobileListSkeleton count={5} />;

  return (
    <PullToRefresh onRefresh={onRefresh}>
      {suppliers.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد موردين" description="ابدأ بإضافة مورد جديد" action={{ label: "مورد جديد", onClick: onAdd, icon: Plus }} />
      ) : suppliers.length > 50 ? (
        <VirtualizedMobileList data={suppliers} renderItem={renderItem} getItemKey={(s: Supplier) => s.id} itemHeight={150} />
      ) : (
        <div className="space-y-3">{suppliers.map(s => <div key={s.id}>{renderItem(s)}</div>)}</div>
      )}
    </PullToRefresh>
  );
});
