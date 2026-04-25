import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
import { MobileListSkeleton } from '@/components/mobile/MobileListSkeleton';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import CreditNoteFormDialog from '@/components/credit-notes/CreditNoteFormDialog';
import { CreditNoteStats } from './components/CreditNoteStats';
import { CreditNoteTable } from './components/CreditNoteTable';
import { CREDIT_NOTE_STATUS_LABELS, type CreditNoteWithRelations } from './types';

const PAGE_SIZE = 25;

export default function CreditNotesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | undefined>();

  const canCreate = userRole === 'admin' || userRole === 'sales' || userRole === 'accountant';
  const canManage = userRole === 'admin' || userRole === 'accountant';

  const { data: totalCount = 0 } = useQuery({
    queryKey: ['credit-notes-count', debouncedSearch],
    queryFn: async () => {
      let query = supabase.from('credit_notes').select('*', { count: 'exact', head: true });
      if (debouncedSearch) {
        query = query.or(`credit_note_number.ilike.%${debouncedSearch}%,reason.ilike.%${debouncedSearch}%`);
      }
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const pagination = useServerPagination({ pageSize: PAGE_SIZE, totalCount });

  const { data: creditNotes = [], isLoading, refetch } = useQuery({
    queryKey: ['credit-notes', debouncedSearch, pagination.currentPage],
    queryFn: async () => {
      let query = supabase
        .from('credit_notes')
        .select('*, customers(name), invoices(invoice_number)')
        .order('created_at', { ascending: false })
        .range(pagination.range.from, pagination.range.to);
      if (debouncedSearch) {
        query = query.or(`credit_note_number.ilike.%${debouncedSearch}%,reason.ilike.%${debouncedSearch}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as CreditNoteWithRelations[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
    queryClient.invalidateQueries({ queryKey: ['credit-notes-count'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  };

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      setPendingId(id);
      const { error } = await supabase.rpc('confirm_credit_note', { p_credit_note_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'تم تأكيد إشعار الإرجاع' });
      invalidate();
    },
    onError: (e: Error) => toast({ title: 'فشل التأكيد', description: e.message, variant: 'destructive' }),
    onSettled: () => setPendingId(undefined),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      setPendingId(id);
      const { error } = await supabase.rpc('cancel_credit_note', { p_credit_note_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'تم إلغاء إشعار الإرجاع' });
      invalidate();
    },
    onError: (e: Error) => toast({ title: 'فشل الإلغاء', description: e.message, variant: 'destructive' }),
    onSettled: () => setPendingId(undefined),
  });

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
          onConfirm={(id) => confirmMutation.mutate(id)}
          onCancel={(id) => cancelMutation.mutate(id)}
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
        onSuccess={invalidate}
      />
    </div>
  );
}
