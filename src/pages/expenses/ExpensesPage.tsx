import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { 
  Plus, 
  Receipt, 
  CheckCircle, 
  XCircle,
  Clock,
  Filter
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

export default function ExpensesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle URL action parameter to auto-open dialog
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setSelectedExpense(null);
      setIsDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: expenses, isLoading, refetch } = useQuery({
    queryKey: ['expenses', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          category:expense_categories(id, name),
          supplier:suppliers(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Expense[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['expenses-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('status, amount');
      
      if (error) throw error;
      
      const pending = data?.filter(e => e.status === 'pending').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const approved = data?.filter(e => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const pendingCount = data?.filter(e => e.status === 'pending').length || 0;
      
      return { pending, approved, pendingCount };
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('expenses')
        .update({ 
          status, 
          approved_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-stats'] });
      toast({ title: 'تم تحديث حالة المصروف' });
    },
    onError: () => {
      toast({ title: 'حدث خطأ', variant: 'destructive' });
    },
  });

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
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">معلقة ({stats?.pendingCount || 0})</p>
                <p className="text-xl font-bold">{(stats?.pending || 0).toLocaleString()} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">معتمدة</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{(stats?.approved || 0).toLocaleString()} ج.م</p>
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
                <p className="text-xl font-bold">{(stats?.approved || 0).toLocaleString()} ج.م</p>
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
      ) : expenses?.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="لا توجد مصروفات"
          description="ابدأ بإضافة مصروف جديد"
          action={{
            label: 'إضافة مصروف',
            onClick: () => setIsDialogOpen(true),
            icon: Plus,
          }}
        />
      ) : isMobile ? (
        <div className="space-y-3">
          {expenses?.map((expense) => (
            <DataCard
              key={expense.id}
              title={expense.description || expense.category?.name || 'مصروف'}
              subtitle={format(new Date(expense.expense_date), 'dd MMM yyyy', { locale: ar })}
              badge={{
                text: statusLabels[expense.status],
                variant: statusColors[expense.status],
              }}
              fields={[
                { label: 'الرقم', value: expense.expense_number },
                { label: 'المبلغ', value: `${Number(expense.amount).toLocaleString()} ج.م` },
                { label: 'الدفع', value: paymentMethodLabels[expense.payment_method] },
              ]}
              onClick={() => handleEdit(expense)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم المصروف</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>طريقة الدفع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses?.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-mono">{expense.expense_number}</TableCell>
                  <TableCell>{expense.category?.name || '-'}</TableCell>
                  <TableCell>{expense.description || '-'}</TableCell>
                  <TableCell>{Number(expense.amount).toLocaleString()} ج.م</TableCell>
                  <TableCell>{paymentMethodLabels[expense.payment_method]}</TableCell>
                  <TableCell>{format(new Date(expense.expense_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[expense.status]}>
                      {statusLabels[expense.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {expense.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8 text-emerald-600 dark:text-emerald-400"
                          onClick={() => approveMutation.mutate({ id: expense.id, status: 'approved' })}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => approveMutation.mutate({ id: expense.id, status: 'rejected' })}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ExpenseFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        expense={selectedExpense}
      />
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
