import { memo, useCallback } from "react";
import { MobileExpandableCard } from "@/components/ui/data/MobileExpandableCard";
import { Amount } from "@/components/shared/amount/Amount";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTableActions } from "@/components/ui/data-table-actions";
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
    <MobileExpandableCard
      title={<Button variant="link" className="min-h-11 h-auto whitespace-normal px-0 text-start" onClick={() => onRowClick(supplier)}>{supplier.name}</Button>}
      amount={<Amount value={supplier.current_balance} />}
      status={<Badge variant={supplier.is_active ? 'default' : 'secondary'}>{supplier.is_active ? 'نشط' : 'غير نشط'}</Badge>}
      details={[
        { label: 'جهة الاتصال', value: supplier.contact_person || '-' },
        { label: 'الهاتف', value: supplier.phone || '-' },
        { label: 'المحافظة', value: supplier.governorate || '-' },
      ]}
      actions={<DataTableActions onEdit={canEdit && onEdit ? () => onEdit(supplier) : undefined} onDelete={canDelete && onDelete ? () => onDelete(supplier.id) : undefined} canEdit={canEdit} canDelete={canDelete} />}
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
        <div className="space-y-3">{suppliers.map(s => <div key={s.id}>{renderItem(s)}</div>)}</div>
      </ListStateRenderer>
    </PullToRefresh>
  );
});
