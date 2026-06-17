import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { useServerPagination } from '@/hooks/useServerPagination';
import { useDebounce } from '@/hooks/useDebounce';
import { ServerPagination } from '@/components/shared/ServerPagination';
import { DataCard } from '@/components/mobile/DataCard';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { EmptyState } from '@/components/shared/EmptyState';
import { ListErrorState } from '@/components/shared/ListErrorState';
import { MobileListSkeleton } from '@/components/mobile/MobileListSkeleton';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import CreditNoteFormDialog from '@/components/credit-notes/CreditNoteFormDialog';
import { CreditNoteStats } from './components/CreditNoteStats';
import { CreditNoteTable } from './components/CreditNoteTable';
import { CREDIT_NOTE_STATUS_LABELS } from './types';
import {
  useCreditNotesCount,
  useCreditNotesList,
  useConfirmCreditNote,
  useCancelCreditNote,
} from '@/hooks/useCreditNotes';

const PAGE_SIZE = 25;

export default function CreditNotesPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | undefined>();

  const canCreate = userRole === 'admin' || userRole === 'sales' || userRole === 'accountant';
  const canManage = userRole === 'admin' || userRole === 'accountant';

  const filters = { search: debouncedSearch };
  const { data: totalCount = 0 } = useCreditNotesCount(filters);
  const pagination = useServerPagination({ pageSize: PAGE_SIZE, totalCount });

  const { data: listResult, isLoading, refetch } = useCreditNotesList(
    filters,
    pagination.currentPage,
    PAGE_SIZE,
  );
  const creditNotes = listResult?.data ?? [];

  const confirmMutation = useConfirmCreditNote();
  const cancelMutation = useCancelCreditNote();

  const handleConfirm = (id: string) => {
    setPendingId(id);
    confirmMutation.mutate(id, {
      onSuccess: () => toast({ title: 'تم تأكيد إشعار الإرجاع' }),
      onError: (e: Error) =>
        toast({ title: 'فشل التأكيد', description: e.message, variant: 'destructive' }),
      onSettled: () => setPendingId(undefined),
    });
  };

  const handleCancel = (id: string) => {
    setPendingId(id);
    cancelMutation.mutate(id, {
      onSuccess: () => toast({ title: 'تم إلغاء إشعار الإرجاع' }),
      onError: (e: Error) =>
        toast({ title: 'فشل الإلغاء', description: e.message, variant: 'destructive' }),
      onSettled: () => setPendingId(undefined),
    });
  };

  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const stats = {
    total: totalCount,
    totalAmount: creditNotes.reduce((sum, cn) => sum + Number(cn.amount), 0),
    confirmed: creditNotes.filter((cn) => cn.status === 'confirmed').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">إشعارات الإرجاع</h1>
          <p className="text-muted-foreground">إدارة مرتجعات العملاء وإشعارات الإرجاع</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            إشعار إرجاع جديد
          </Button>
        )}
      </div>

      <CreditNoteStats total={stats.total} totalAmount={stats.totalAmount} confirmed={stats.confirmed} />

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث في المرتجعات..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); pagination.resetPage(); }}
          className="pr-10"
        />
      </div>

      {isLoading ? (
        isMobile ? <MobileListSkeleton /> : <TableSkeleton columns={5} rows={5} />
      ) : creditNotes.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="لا توجد مرتجعات"
          description="لم يتم إنشاء أي إشعارات إرجاع بعد"
          action={canCreate ? { label: 'إشعار إرجاع جديد', onClick: () => setDialogOpen(true) } : undefined}
        />
      ) : isMobile ? (
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="space-y-3">
            {creditNotes.map((cn) => (
              <DataCard
                key={cn.id}
                title={cn.customers?.name || 'عميل غير معروف'}
                subtitle={`#${cn.credit_note_number}`}
                icon={<RotateCcw className="h-5 w-5" />}
                badge={{
                  text: CREDIT_NOTE_STATUS_LABELS[cn.status] || cn.status,
                  variant: cn.status === 'confirmed' ? 'default' : 'secondary',
                }}
                fields={[
                  { label: 'المبلغ', value: <span className="font-bold text-destructive">{Number(cn.amount).toLocaleString()} ج.م</span> },
                  { label: 'الفاتورة', value: cn.invoices?.invoice_number || '-' },
                  { label: 'التاريخ', value: new Date(cn.created_at).toLocaleDateString('ar-EG') },
                ]}
              />
            ))}
          </div>
        </PullToRefresh>
      ) : (
        <CreditNoteTable
          creditNotes={creditNotes}
          canManage={canManage}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          pendingId={pendingId}
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

      <CreditNoteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
