import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useServerPagination } from "@/hooks/useServerPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PurchaseOrderFormDialog from "@/components/purchase-orders/PurchaseOrderFormDialog";
import { PurchaseOrderPrintView } from "@/components/print/PurchaseOrderPrintView";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { MobileListSkeleton, MobileStatSkeleton } from "@/components/mobile/MobileListSkeleton";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import {
  usePurchaseOrdersList,
  usePurchaseOrdersCount,
  useDeletePurchaseOrder,
} from "@/hooks/usePurchaseOrders";
import type { PurchaseOrderRow } from "@/lib/repositories/purchaseOrderRepository";
import { PurchaseOrderStats } from "./components/PurchaseOrderStats";
import { PurchaseOrderTable } from "./components/PurchaseOrderTable";
import { PurchaseOrderMobileList } from "./components/PurchaseOrderMobileList";
import { ListErrorState } from "@/components/shared/ListErrorState";

const PAGE_SIZE = 25;

type PurchaseOrder = PurchaseOrderRow & { suppliers: { name: string } | null };


const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  pending: 'قيد الانتظار',
  approved: 'معتمد',
  cancelled: 'ملغي',
  completed: 'مكتمل',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
  completed: 'bg-info/10 text-info',
};

const PurchaseOrdersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [prefillSupplierId, setPrefillSupplierId] = useState<string | undefined>(undefined);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);
  const { toast } = useToast();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const canEdit = userRole === 'admin' || userRole === 'warehouse';
  const canDelete = userRole === 'admin';

  // URL action: open form dialog
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Prefill from navigation state
  useEffect(() => {
    const state = location.state as { prefillSupplierId?: string } | null;
    if (state?.prefillSupplierId) {
      setPrefillSupplierId(state.prefillSupplierId);
      setSelectedOrder(null);
      setDialogOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filters = { search: debouncedSearch };
  const { data: totalCount = 0 } = usePurchaseOrdersCount(filters);
  const pagination = useServerPagination({ pageSize: PAGE_SIZE, totalCount });
  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
  } = usePurchaseOrdersList(filters, pagination.range);

  const deleteMutation = useDeletePurchaseOrder();
  const handleDelete = async (id: string) => {
    const ok = await verifyPermissionOnServer('purchase_orders', 'delete');
    if (!ok) {
      toast({ title: "غير مصرح", description: "ليس لديك صلاحية حذف أوامر الشراء", variant: "destructive" });
      return;
    }
    deleteMutation.mutate(id);
  };

  const { filteredData, filters: tableFilters, setFilter } = useTableFilter(orders);
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredData);

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    totalValue: orders.reduce((sum, o) => sum + Number(o.total_amount), 0),
  };

  const handleEdit = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedOrder(null);
    setDialogOpen(true);
  };

  const handleRefresh = async () => {

    await refetch();
  };

  const handlePrint = (id: string) => {
    setPrintOrderId(id);
    setPrintDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">أوامر الشراء</h1>
          <p className="text-muted-foreground">إدارة أوامر الشراء من الموردين</p>
        </div>
        <div className="flex gap-2">
          {!isMobile && (
            <ExportWithTemplateButton
              section="purchase_orders"
              sectionLabel="أوامر الشراء"
              data={sortedData}
              columns={[
                { key: 'order_number', label: 'رقم الأمر' },
                { key: 'suppliers.name', label: 'المورد' },
                { key: 'total_amount', label: 'الإجمالي' },
                { key: 'status', label: 'الحالة' },
                { key: 'expected_date', label: 'تاريخ التوريد المتوقع' },
                { key: 'created_at', label: 'تاريخ الإنشاء' },
              ]}
            />
          )}
          <Button onClick={handleNew} size={isMobile ? "sm" : "default"}>
            <Plus className="h-4 w-4 ml-2" />
            {isMobile ? "جديد" : "أمر شراء جديد"}
          </Button>
        </div>
      </div>

      {/* Error state (shared between mobile & desktop, only when no cached data) */}
      {error && orders.length === 0 && (
        <ListErrorState error={error} onRetry={() => refetch()} />
      )}

      {/* Mobile View */}
      {!error && isMobile ? (
        isLoading ? (
          <div className="space-y-4">
            <MobileStatSkeleton count={4} />
            <MobileListSkeleton count={5} variant="order" />
          </div>
        ) : (
          <PullToRefresh onRefresh={handleRefresh}>
            <div className="space-y-4">
              <PurchaseOrderStats {...stats} variant="mobile" />

              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الأمر أو اسم المورد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>

              <PurchaseOrderMobileList
                orders={sortedData as unknown as PurchaseOrder[]}
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onNew={handleNew}
                statusLabels={statusLabels}
              />

            </div>
          </PullToRefresh>
        )
      ) : (
        /* Desktop View */
        <>
          <PurchaseOrderStats {...stats} variant="desktop" />

          <Card>
            <CardContent className="p-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الأمر أو اسم المورد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>قائمة أوامر الشراء</CardTitle>
            </CardHeader>
            <CardContent>
              <PurchaseOrderTable
                orders={sortedData as unknown as PurchaseOrder[]}
                isLoading={isLoading}
                sortConfig={sortConfig}
                requestSort={requestSort}
                filters={tableFilters}
                setFilter={setFilter}
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPrint={handlePrint}
                onNew={handleNew}

                statusLabels={statusLabels}
                statusColors={statusColors}
              />
            </CardContent>
          </Card>
        </>
      )}

      <PurchaseOrderFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setPrefillSupplierId(undefined);
        }}
        order={selectedOrder}
        prefillSupplierId={prefillSupplierId}
      />

      {printOrderId && (
        <PurchaseOrderPrintView
          orderId={printOrderId}
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
        />
      )}

      <ServerPagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={pagination.goToPage}
        hasNextPage={pagination.hasNextPage}
        hasPrevPage={pagination.hasPrevPage}
      />
    </div>
  );
};

export default PurchaseOrdersPage;
