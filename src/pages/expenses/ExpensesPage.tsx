import { WorkspaceTable, type WorkspaceColumn } from "@/components/table/WorkspaceTable";
import { TableViewOptions } from "@/components/table/TableViewOptions";
import { useTableLayout } from "@/hooks/useTableLayout";
import { MobileExpandableCard } from "@/components/ui/data/MobileExpandableCard";
import { Amount, KpiAmount } from "@/components/shared/amount/Amount";
import { LoadMoreFooter } from "@/components/ui/data/LoadMoreFooter";
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from '@/lib/router-compat';
import { expenseRepository } from '@/application/queries/expenses';
import PageHeader from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { MobileListSkeleton } from '@/components/mobile/MobileListSkeleton';
import { DataCard } from '@/components/mobile/DataCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { ListErrorState } from '@/components/shared/ListErrorState';
import { 
  Plus, 
  Receipt, 
  CheckCircle, 
  XCircle,
  Clock,
  Filter,
  ShieldCheck
} from 'lucide-react';
import { ExpenseFormDialog } from '@/components/expenses/ExpenseFormDialog';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { approveExpense, getErrorMessage } from '@/lib/api/secureOperations';
import { getSafeErrorMessage, logErrorSafely } from '@/lib/errorHandler';
import { mapRepoError } from '@/lib/repositories/_base';

interface Expense {
  id: string;
  expense_number: string;
  amount: number;
  payment_method: string;
  expense_date: string;
  description: string | null;
  status: string;
  created_at: string;
  category: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
}

const statusLabels: Record<string, string> = {
  pending: 'معلق',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

const paymentMethodLabels: Record<string, string> = {
  cash: 'نقدي',
  bank: 'تحويل بنكي',
  card: 'بطاقة',
};

const COLUMN_KEYS = ['number', 'category', 'description', 'amount', 'method', 'date', 'status', 'actions'];

export default function ExpensesPage() {
  const layout = useTableLayout('expenses', COLUMN_KEYS);
  const [visibleCount, setVisibleCount] = useState(25);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  useEffect(() => { setVisibleCount(25); }, [statusFilter]);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingExpenseId, setRejectingExpenseId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Handle action parameter from URL (FAB/QuickActions)
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setIsDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: expenses, isLoading, error, refetch } = useQuery({
    queryKey: ['expenses', statusFilter],
    queryFn: async () =>
      (await expenseRepository.list({
        status: statusFilter as 'all' | 'pending' | 'approved' | 'rejected',
      })) as unknown as Expense[],
  });

  const { data: stats } = useQuery({
    queryKey: ['expenses-stats'],
    queryFn: () => expenseRepository.stats(),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, action, rejection_reason }: { 
      id: string; 
      action: 'approve' | 'reject';
      rejection_reason?: string;
    }) => {
      // Use secure Edge Function for expense approval
      const result = await approveExpense({
        expense_id: id,
        action,
        rejection_reason,
      });

      return result;
    },
    onSuccess: (result, variables) => {
      if (!result.success) {
        toast({ title: 'تعذر معالجة المصروف', description: getErrorMessage(result.code || 'APPROVAL_ERROR'), variant: 'destructive' });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-stats'] });
      toast({ 
        title: variables.action === 'approve' ? 'تمت الموافقة على المصروف' : 'تم رفض المصروف',
        description: 'تم التحقق من الصلاحيات وتحديث الرصيد',
      });
      setRejectDialogOpen(false);
      setRejectionReason('');
      setRejectingExpenseId(null);
    },
    onError: (error: unknown) => {
      logErrorSafely('ExpensesPage.approveMutation', error);
      const mapped = mapRepoError(error, getSafeErrorMessage(error));
      toast({ title: 'حدث خطأ', description: mapped.message, variant: 'destructive' });
    },
  });

  const handleApprove = (id: string) => {
    approveMutation.mutate({ id, action: 'approve' });
  };

  const handleRejectClick = (id: string) => {
    setRejectingExpenseId(id);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (rejectingExpenseId && rejectionReason.trim()) {
      approveMutation.mutate({ 
        id: rejectingExpenseId, 
        action: 'reject', 
        rejection_reason: rejectionReason.trim() 
      });
    }
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedExpense(null);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const visibleExpenses = (expenses || []).slice(0, visibleCount);
  const renderActions = (expense: Expense) => expense.status === 'pending' ? <div className="flex gap-1">
    <Button size="icon" variant="ghost" className="h-11 w-11 text-success" aria-label="اعتماد المصروف" title="اعتماد المصروف" onClick={() => handleApprove(expense.id)} disabled={approveMutation.isPending}><CheckCircle className="h-4 w-4" /></Button>
    <Button size="icon" variant="ghost" className="h-11 w-11 text-destructive" aria-label="رفض المصروف" title="رفض المصروف" onClick={() => handleRejectClick(expense.id)} disabled={approveMutation.isPending}><XCircle className="h-4 w-4" /></Button>
  </div> : null;
  const columns: WorkspaceColumn<Expense>[] = [
    { key: 'number', label: 'رقم المصروف', render: expense => <Button variant="link" className="min-h-11 px-0" onClick={() => handleEdit(expense)}>{expense.expense_number}</Button> },
    { key: 'category', label: 'التصنيف', render: expense => expense.category?.name || '-' },
    { key: 'description', label: 'الوصف', render: expense => expense.description || '-' },
    { key: 'amount', label: 'المبلغ', render: expense => <Amount value={Number(expense.amount)} /> },
    { key: 'method', label: 'طريقة الدفع', render: expense => paymentMethodLabels[expense.payment_method] },
    { key: 'date', label: 'التاريخ', render: expense => format(new Date(expense.expense_date), 'dd/MM/yyyy') },
    { key: 'status', label: 'الحالة', render: expense => <Badge variant={statusColors[expense.status]}>{statusLabels[expense.status]}</Badge> },
    { key: 'actions', label: 'إجراءات', render: renderActions },
  ];

  const content = (
    <div className="space-y-6">
      <PageHeader
        title="المصروفات"
        description="إدارة ومتابعة المصروفات"
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            مصروف جديد
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">معلقة ({stats?.pendingCount || 0})</p>
                <p className="text-xl font-bold"><KpiAmount value={stats?.pending || 0} /></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">معتمدة</p>
                <p className="text-xl font-bold text-success"><KpiAmount value={stats?.approved || 0} /></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المعتمد</p>
                <p className="text-xl font-bold"><KpiAmount value={stats?.approved || 0} /></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="pending">معلق</SelectItem>
            <SelectItem value="approved">معتمد</SelectItem>
            <SelectItem value="rejected">مرفوض</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expenses List */}
      {isLoading ? (
        <MobileListSkeleton count={5} />
      ) : error ? (
        <ListErrorState error={error} onRetry={() => refetch()} />
      ) : expenses?.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={statusFilter !== 'all' ? 'لا توجد نتائج' : 'لا توجد مصروفات'}
          description={statusFilter !== 'all' ? 'جرّب تغيير الفلتر' : 'ابدأ بإضافة مصروف جديد'}
          action={
            statusFilter !== 'all'
              ? { label: 'مسح الفلتر', onClick: () => setStatusFilter('all') }
              : { label: 'إضافة مصروف', onClick: () => setIsDialogOpen(true), icon: Plus }
          }
        />
      ) : isMobile ? (
        <div className="space-y-3">{visibleExpenses.map(expense => <MobileExpandableCard key={expense.id}
          title={<Button variant="link" className="min-h-11 h-auto whitespace-normal px-0 text-start" onClick={() => handleEdit(expense)}>{expense.description || expense.category?.name || expense.expense_number}</Button>}
          amount={<Amount value={Number(expense.amount)} />}
          status={<Badge variant={statusColors[expense.status]}>{statusLabels[expense.status]}</Badge>}
          details={[{ label: 'الرقم', value: expense.expense_number }, { label: 'التاريخ', value: format(new Date(expense.expense_date), 'dd/MM/yyyy') }, { label: 'الدفع', value: paymentMethodLabels[expense.payment_method] }]}
          actions={renderActions(expense)} />)}</div>
      ) : (
        <div className="space-y-3"><div className="flex justify-end"><TableViewOptions layout={layout} columns={columns} /></div><WorkspaceTable rows={visibleExpenses} columns={columns} layout={layout} /></div>
      )}
      {!isLoading && !error && <LoadMoreFooter shown={visibleExpenses.length} total={expenses?.length || 0} hasMore={visibleExpenses.length < (expenses?.length || 0)} onLoadMore={() => setVisibleCount(count => count + 25)} />}


      <ExpenseFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        expense={selectedExpense}
      />

      {/* Rejection Reason Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>رفض المصروف</AlertDialogTitle>
            <AlertDialogDescription>
              يرجى إدخال سبب الرفض
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="سبب الرفض..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRejectionReason('');
              setRejectingExpenseId(null);
            }}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || approveMutation.isPending}
            >
              {approveMutation.isPending ? 'جاري الرفض...' : 'تأكيد الرفض'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4">
          {content}
        </div>
      </PullToRefresh>
    );
  }

  return <div className="p-6">{content}</div>;
}
