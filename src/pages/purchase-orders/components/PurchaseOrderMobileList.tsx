import { useNavigate } from "react-router-dom";
import { ClipboardList, Plus, Calendar } from "lucide-react";
import { DataCard } from "@/components/mobile/DataCard";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Database } from "@/integrations/supabase/types";

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'] & {
  suppliers: { name: string } | null;
};

interface PurchaseOrderMobileListProps {
  orders: PurchaseOrder[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (order: PurchaseOrder) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  statusLabels: Record<string, string>;
}

export const PurchaseOrderMobileList = ({
  orders, canEdit, canDelete, onEdit, onDelete, onNew, statusLabels,
}: PurchaseOrderMobileListProps) => {
  const navigate = useNavigate();

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="لا توجد أوامر شراء"
        description="ابدأ بإضافة أمر شراء جديد"
        action={{ label: "أمر شراء جديد", onClick: onNew, icon: Plus }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <DataCard
          key={order.id}
          title={order.order_number}
          subtitle={order.suppliers?.name || 'بدون مورد'}
          badge={{
            text: statusLabels[order.status],
            variant: order.status === 'completed' ? 'default' : order.status === 'pending' ? 'secondary' : 'outline',
          }}
          icon={<ClipboardList className="h-5 w-5" />}
          fields={[
            { label: 'الإجمالي', value: `${Number(order.total_amount).toLocaleString()} ج.م` },
            { label: 'التاريخ', value: new Date(order.created_at).toLocaleDateString('ar-EG'), icon: <Calendar className="h-4 w-4" /> },
          ]}
          onClick={() => navigate(`/purchase-orders/${order.id}`)}
          onView={() => navigate(`/purchase-orders/${order.id}`)}
          onEdit={canEdit ? () => onEdit(order) : undefined}
          onDelete={canDelete ? () => onDelete(order.id) : undefined}
        />
      ))}
    </div>
  );
};
