import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Printer } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityLink";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ClipboardList, Plus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'] & {
  suppliers: { name: string } | null;
};

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;
type FilterValue = string | number | boolean | string[] | null;

interface PurchaseOrderTableProps {
  orders: PurchaseOrder[];
  isLoading: boolean;
  sortConfig: SortConfig;
  requestSort: (key: string) => void;
  filters: Record<string, FilterValue>;
  setFilter: (key: string, value: FilterValue) => void;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (order: PurchaseOrder) => void;
  onDelete: (id: string) => void;
  onPrint: (id: string) => void;
  onNew: () => void;
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
}

export const PurchaseOrderTable = ({
  orders, isLoading, sortConfig, requestSort, filters, setFilter,
  canEdit, canDelete, onEdit, onDelete, onPrint, onNew,
  statusLabels, statusColors,
}: PurchaseOrderTableProps) => {
  const navigate = useNavigate();

  if (isLoading) return <TableSkeleton rows={5} columns={7} />;

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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <DataTableHeader label="رقم الأمر" sortKey="order_number" sortConfig={sortConfig} onSort={requestSort} />
            <DataTableHeader label="المورد" />
            <DataTableHeader label="الإجمالي" sortKey="total_amount" sortConfig={sortConfig} onSort={requestSort} />
            <DataTableHeader
              label="الحالة"
              filterKey="status"
              filterType="select"
              filterOptions={[
                { value: 'draft', label: 'مسودة' },
                { value: 'pending', label: 'قيد الانتظار' },
                { value: 'approved', label: 'معتمد' },
                { value: 'completed', label: 'مكتمل' },
                { value: 'cancelled', label: 'ملغي' },
              ]}
              filterValue={filters.status as string}
              onFilter={setFilter}
            />
            <DataTableHeader label="تاريخ التوريد" />
            <DataTableHeader label="تاريخ الإنشاء" sortKey="created_at" sortConfig={sortConfig} onSort={requestSort} />
            <DataTableHeader label="إجراءات" className="text-left" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/purchase-orders/${order.id}`)}>
              <TableCell>
                <EntityLink type="purchase-order" id={order.id}>{order.order_number}</EntityLink>
              </TableCell>
              <TableCell>
                {order.suppliers?.name ? (
                  <EntityLink type="supplier" id={order.supplier_id}>{order.suppliers.name}</EntityLink>
                ) : '-'}
              </TableCell>
              <TableCell><span className="font-bold">{Number(order.total_amount).toLocaleString()} ج.م</span></TableCell>
              <TableCell><Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge></TableCell>
              <TableCell>{order.expected_date ? new Date(order.expected_date).toLocaleDateString('ar-EG') : '-'}</TableCell>
              <TableCell>{new Date(order.created_at).toLocaleDateString('ar-EG')}</TableCell>
              <TableCell>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/purchase-orders/${order.id}`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onPrint(order.id)}>
                    <Printer className="h-4 w-4" />
                  </Button>
                  <DataTableActions
                    onEdit={() => onEdit(order)}
                    onDelete={() => onDelete(order.id)}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    deleteDescription="سيتم حذف أمر الشراء وجميع بنوده نهائياً."
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
