import { WorkspaceTable, type WorkspaceColumn } from "@/components/table/WorkspaceTable";
import { TableViewOptions } from "@/components/table/TableViewOptions";
import { useTableLayout } from "@/hooks/useTableLayout";
import { MobileExpandableCard } from "@/components/ui/data/MobileExpandableCard";
import { LoadMoreFooter } from "@/components/ui/data/LoadMoreFooter";
import { Amount, KpiAmount } from "@/components/shared/amount/Amount";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/useDebounce";
import type { PurchaseInvoiceRow } from "@/hooks/logistics/usePurchaseInvoices";
import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, CheckCircle2 } from "lucide-react";
import {
  usePurchaseInvoicesList,
  useCreatePurchaseInvoice,
  usePostPurchaseInvoice,
} from "@/hooks/logistics/usePurchaseInvoices";
import { PurchaseInvoiceStatusBadge, MatchingStatusBadge } from "@/components/logistics/StatusBadges";
import { PurchaseInvoiceDialog } from "@/components/logistics/LogisticsDialogs";
import { ListErrorState } from "@/components/shared/ListErrorState";
import { EmptyState } from "@/components/shared/EmptyState";

const COLUMN_KEYS = ['number', 'supplier', 'order', 'date', 'amount', 'status', 'matching', 'actions'];

export default function PurchaseInvoicesPage() {
  const navigate = useNavigate();
  const layout = useTableLayout('purchase-invoices', COLUMN_KEYS);
  const isMobile = useIsMobile();
  const [visibleCount, setVisibleCount] = useState(25);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  useEffect(() => { setVisibleCount(25); }, [debouncedSearch]);
  const [open, setOpen] = useState(false);
  const { data: rows = [], isLoading, error, refetch } = usePurchaseInvoicesList(debouncedSearch);
  const create = useCreatePurchaseInvoice();
  const post = usePostPurchaseInvoice();

  const visibleRows = rows.slice(0, visibleCount);
  const renderActions = (row: PurchaseInvoiceRow) => row.status === 'draft' ? <Button size="sm" variant="ghost" className="min-h-11 text-success" onClick={() => post.mutate(row.id)} disabled={post.isPending}><CheckCircle2 className="h-4 w-4 ms-1" />ترحيل</Button> : null;
  const columns: WorkspaceColumn<PurchaseInvoiceRow>[] = [
    { key: 'number', label: 'الرقم', render: row => <Button variant="link" className="min-h-11 px-0" onClick={() => navigate(`/purchase-invoices/${row.id}`)}>{row.invoice_number}</Button> },
    { key: 'supplier', label: 'المورد', render: row => row.suppliers?.name || '-' },
    { key: 'order', label: 'أمر الشراء', render: row => row.purchase_orders?.order_number || '-' },
    { key: 'date', label: 'التاريخ', render: row => row.invoice_date },
    { key: 'amount', label: 'الإجمالي', render: row => <Amount value={Number(row.total_amount)} /> },
    { key: 'status', label: 'الحالة', render: row => <PurchaseInvoiceStatusBadge status={row.status} /> },
    { key: 'matching', label: 'المطابقة', render: row => <MatchingStatusBadge status={row.matching_status} /> },
    { key: 'actions', label: 'إجراءات', render: renderActions },
  ];

  const totalDue = rows
    .filter(r => r.status === "posted" && r.payment_status !== "paid")
    .reduce((s, r) => s + (Number(r.total_amount) - Number(r.paid_amount)), 0);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            فواتير المشتريات
          </h1>
          <p className="text-sm text-muted-foreground">المطابقة الثلاثية: أمر شراء ↔ استلام ↔ فاتورة</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 ml-1" /> فاتورة جديدة
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">الإجمالي</div><div className="text-2xl font-bold">{rows.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">مسودات</div><div className="text-2xl font-bold text-warning">{rows.filter(r => r.status === "draft").length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">تتطلب موافقة</div><div className="text-2xl font-bold text-destructive">{rows.filter(r => r.approval_required && r.status === "posted").length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">إجمالي المستحق</div><div className="text-2xl font-bold"><KpiAmount value={totalDue} /></div></Card>
      </div>

      <Card className="p-4">
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="ابحث برقم الفاتورة…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div>
        ) : error ? (
          <ListErrorState error={error} onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          search ? (
            <EmptyState
              icon={Search}
              title="لا توجد نتائج مطابقة"
              description="جرب تعديل أو مسح البحث."
              action={{ label: 'مسح البحث', onClick: () => setSearch(''), variant: 'outline' }}
              compact
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="لا توجد فواتير مشتريات بعد"
              description="ابدأ بإنشاء أول فاتورة شراء من المورد."
              action={{ label: 'فاتورة جديدة', onClick: () => setOpen(true), icon: Plus }}
            />
          )
        ) : (
          isMobile ? <div className="space-y-3">{visibleRows.map(row => <MobileExpandableCard key={row.id} title={columns[0].render(row)} amount={<Amount value={Number(row.total_amount)} />} status={<PurchaseInvoiceStatusBadge status={row.status} />} details={[{ label: 'المورد', value: row.suppliers?.name || '-' }, { label: 'أمر الشراء', value: row.purchase_orders?.order_number || '-' }, { label: 'التاريخ', value: row.invoice_date }, { label: 'المطابقة', value: <MatchingStatusBadge status={row.matching_status} /> }]} actions={renderActions(row)} />)}</div> : <><div className="mb-3 flex justify-end"><TableViewOptions layout={layout} columns={columns} /></div><WorkspaceTable rows={visibleRows} columns={columns} layout={layout} /></>
        )}
      </Card>

      {!isLoading && !error && <LoadMoreFooter shown={visibleRows.length} total={rows.length} hasMore={visibleRows.length < rows.length} onLoadMore={() => setVisibleCount(count => count + 25)} />}

      <PurchaseInvoiceDialog open={open} onOpenChange={setOpen} loading={create.isPending}
        onSubmit={async (draft) => { await create.mutateAsync(draft); }} />
    </div>
  );
}
