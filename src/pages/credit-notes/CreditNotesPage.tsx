import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Search, RotateCcw, FileText } from 'lucide-react';
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

const PAGE_SIZE = 25;

const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  confirmed: 'مؤكدة',
  cancelled: 'ملغاة',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  confirmed: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

type CreditNoteWithRelations = {
  id: string;
  credit_note_number: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  reason: string | null;
  status: string;
  created_at: string;
  customers: { name: string } | null;
  invoices: { invoice_number: string } | null;
};

export default function CreditNotesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canCreate = userRole === 'admin' || userRole === 'sales' || userRole === 'accountant';

  // Count query
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

  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const stats = {
    total: totalCount,
    totalAmount: creditNotes.reduce((sum, cn) => sum + Number(cn.amount), 0),
    confirmed: creditNotes.filter(cn => cn.status === 'confirmed').length,
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

      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <RotateCcw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي المرتجعات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <FileText className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {!isMobile && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <RotateCcw className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.confirmed}</p>
                  <p className="text-sm text-muted-foreground">مؤكدة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
                badge={{ text: statusLabels[cn.status] || cn.status, variant: cn.status === 'confirmed' ? 'default' : 'secondary' }}
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
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الرقم</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">الفاتورة</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">السبب</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditNotes.map((cn) => (
                <TableRow key={cn.id}>
                  <TableCell className="font-medium">{cn.credit_note_number}</TableCell>
                  <TableCell>{cn.customers?.name || '-'}</TableCell>
                  <TableCell>{cn.invoices?.invoice_number || '-'}</TableCell>
                  <TableCell className="font-bold text-destructive">{Number(cn.amount).toLocaleString()} ج.م</TableCell>
                  <TableCell className="max-w-[200px] truncate">{cn.reason || '-'}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[cn.status] || ''}>
                      {statusLabels[cn.status] || cn.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(cn.created_at).toLocaleDateString('ar-EG')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
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
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
          queryClient.invalidateQueries({ queryKey: ['credit-notes-count'] });
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }}
      />
    </div>
  );
}
