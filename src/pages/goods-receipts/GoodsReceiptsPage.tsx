import { WorkspaceTable, type WorkspaceColumn } from '@/components/table/WorkspaceTable';
import { TableViewOptions } from '@/components/table/TableViewOptions';
import { useTableLayout } from '@/hooks/useTableLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDebounce } from '@/hooks/useDebounce';
import { useListState } from '@/hooks/useListState';
import { MobileExpandableCard } from '@/components/ui/data/MobileExpandableCard';
import { LoadMoreFooter } from '@/components/ui/data/LoadMoreFooter';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import type { GoodsReceiptRow } from "@/hooks/logistics/useGoodsReceipts";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, PackageCheck, CheckCircle2, XCircle } from "lucide-react";
import {
  useGoodsReceiptsList,
  useCreateGoodsReceipt,
  usePostGoodsReceipt,
  useCancelGoodsReceipt,
} from "@/hooks/logistics/useGoodsReceipts";
import { GoodsReceiptStatusBadge } from "@/components/logistics/StatusBadges";
import { GoodsReceiptDialog } from "@/components/logistics/LogisticsDialogs";
import { ListErrorState } from "@/components/shared/ListErrorState";
import { EmptyState } from "@/components/shared/EmptyState";

export default function GoodsReceiptsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const isMobile = useIsMobile();
  const [visibleCount, setVisibleCount] = useState(25);
  const layout = useTableLayout('goods-receipts', ['number', 'party', 'warehouse', 'date', 'status', 'actions']);
  const [action, setAction] = useState<{ row: GoodsReceiptRow; kind: 'post' | 'cancel' } | null>(null);
  const [reason, setReason] = useState('');
  useEffect(() => { setVisibleCount(25); }, [debouncedSearch]);
  const [open, setOpen] = useState(false);
  const { data: rows = [], isLoading, error, refetch } = useGoodsReceiptsList(debouncedSearch);
  const create = useCreateGoodsReceipt();
  const post = usePostGoodsReceipt();
  const cancel = useCancelGoodsReceipt();

  const draftCount = rows.filter(r => r.status === "draft").length;
  const postedCount = rows.filter(r => r.status === "posted").length;

  const listState = useListState({ data: rows, isLoading, error, hasFilters: !!debouncedSearch.trim() });
  const visibleRows = rows.slice(0, visibleCount);
  const requestAction = (row: GoodsReceiptRow, kind: 'post' | 'cancel') => { setReason(''); setAction({ row, kind }); };
  const actionBusy = post.isPending || cancel.isPending;
  const renderActions = (row: GoodsReceiptRow) => <div className="flex flex-wrap gap-1">
    {(row.status === "draft") && <Button size="sm" variant="ghost" className="min-h-11 text-success" disabled={actionBusy} onClick={() => requestAction(row, 'post')}><CheckCircle2 className="h-4 w-4" />ترحيل</Button>}
    {row.status !== 'cancelled' && <Button size="sm" variant="ghost" className="min-h-11 text-destructive" disabled={actionBusy} onClick={() => requestAction(row, 'cancel')}><XCircle className="h-4 w-4" />إلغاء</Button>}
  </div>;
  const columns: WorkspaceColumn<GoodsReceiptRow>[] = [
    { key: 'number', label: 'الرقم', render: row => <Button variant="link" className="min-h-11 px-0" onClick={() => navigate(`/goods-receipts/${row.id}`)}>{row.receipt_number}</Button> },
    { key: 'party', label: 'المورد', render: row => row.suppliers?.name ?? '—' },
    { key: 'warehouse', label: 'المستودع', render: row => row.warehouses?.name ?? '—' },
    { key: 'date', label: 'التاريخ', render: row => row.received_date },
    { key: 'status', label: 'الحالة', render: row => <GoodsReceiptStatusBadge status={row.status} /> },
    { key: 'actions', label: 'إجراءات', render: renderActions },
  ];
  const confirmAction = () => {
    if (!action || actionBusy) return;
    const onSuccess = () => setAction(null);
    if (action.kind === 'post') post.mutate(action.row.id, { onSuccess });
    else cancel.mutate({ id: action.row.id, reason: reason || undefined }, { onSuccess });
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-primary" />
            إيصالات استلام البضاعة
          </h1>
          <p className="text-sm text-muted-foreground">إدارة استلامات الموردين وحركة المخزون التلقائية</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 ml-1" /> إيصال جديد
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">الإجمالي</div><div className="text-2xl font-bold">{rows.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">مسودات</div><div className="text-2xl font-bold text-warning">{draftCount}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">مرحّلة</div><div className="text-2xl font-bold text-success">{postedCount}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">ملغاة</div><div className="text-2xl font-bold text-destructive">{rows.filter(r => r.status === "cancelled").length}</div></Card>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3"><div className="relative flex-1 min-w-40">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="ابحث برقم الإيصال…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {!isMobile && <TableViewOptions layout={layout} columns={columns} />}</div>
        {listState === "loading" ? (
          <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div>
        ) : listState === "error" ? (
          <ListErrorState error={error} onRetry={() => refetch()} />
        ) : listState === "empty" || listState === "empty-filtered" ? (
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
              icon={PackageCheck}
              title="لا توجد إيصالات بعد"
              description="ابدأ بإنشاء أول إيصال استلام من الموردين."
              action={{ label: 'إيصال جديد', onClick: () => setOpen(true), icon: Plus }}
            />
          )
        ) : (
          isMobile ? <div className="space-y-3">{visibleRows.map(row => <MobileExpandableCard key={row.id} title={columns[0].render(row)} status={<GoodsReceiptStatusBadge status={row.status} />} details={[{ label: 'المورد', value: row.suppliers?.name ?? '—' }, { label: 'المستودع', value: row.warehouses?.name ?? '—' }, { label: 'التاريخ', value: row.received_date }]} actions={renderActions(row)} />)}</div> : <WorkspaceTable rows={visibleRows} columns={columns} layout={layout} />
        )}
        {listState === 'data' && <LoadMoreFooter shown={visibleRows.length} total={rows.length} hasMore={visibleCount < rows.length} onLoadMore={() => setVisibleCount(count => count + 25)} />}
      </section>

      <AlertDialog open={!!action} onOpenChange={next => { if (!next && !actionBusy) setAction(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>{action?.kind === 'post' ? 'تأكيد ترحيل' : 'تأكيد الإلغاء'} {action?.row.receipt_number}</AlertDialogTitle>
            <AlertDialogDescription>{action?.kind === 'post' ? 'سيزيد رصيد المخزون للبنود المستلمة ويُسجل الأثر المحاسبي.' : 'سيُلغى المستند وتُعكس حركة المخزون والقيد إن كان مرحّلًا.'}</AlertDialogDescription>
          </AlertDialogHeader>
          {action?.kind === 'cancel' && <Textarea aria-label="سبب الإلغاء" placeholder="سبب الإلغاء (اختياري)" value={reason} onChange={event => setReason(event.target.value)} disabled={actionBusy} />}
          <AlertDialogFooter><AlertDialogCancel disabled={actionBusy}>رجوع</AlertDialogCancel><Button className="min-h-11" variant={action?.kind === 'cancel' ? 'destructive' : 'default'} disabled={actionBusy} onClick={confirmAction}>{actionBusy ? 'جارٍ التنفيذ…' : 'تأكيد'}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GoodsReceiptDialog open={open} onOpenChange={setOpen} loading={create.isPending}
        onSubmit={async (draft) => { await create.mutateAsync(draft); }} />
    </div>
  );
}
