import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { DataCard } from '@/components/mobile/DataCard';
import { 
  ArrowLeft, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Edit,
  Wallet
} from 'lucide-react';
import { CashRegisterFormDialog } from '@/components/treasury/CashRegisterFormDialog';
import { CashTransactionDialog } from '@/components/treasury/CashTransactionDialog';
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

interface CashRegister {
  id: string;
  name: string;
  location: string | null;
  current_balance: number;
  is_active: boolean;
  assigned_to: string | null;
  created_at: string;
}

interface CashTransaction {
  id: string;
  transaction_number: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  reference_type: string | null;
  created_at: string;
}

const transactionTypeLabels: Record<string, string> = {
  income: 'إيداع',
  expense: 'سحب',
  transfer_in: 'تحويل وارد',
  transfer_out: 'تحويل صادر',
  adjustment: 'تعديل',
};

const transactionTypeColors: Record<string, string> = {
  income: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  expense: 'bg-destructive/20 text-destructive',
  transfer_in: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  transfer_out: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  adjustment: 'bg-muted text-muted-foreground',
};

export default function CashRegisterDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');

  const { data: register, isLoading: isLoadingRegister } = useQuery({
    queryKey: ['cash-register', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as CashRegister;
    },
    enabled: !!id,
  });

  const { data: transactions, isLoading: isLoadingTransactions, refetch } = useQuery({
    queryKey: ['cash-transactions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_transactions')
        .select('*')
        .eq('register_id', id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as CashTransaction[];
    },
    enabled: !!id,
  });

  const handleAddTransaction = (type: 'income' | 'expense') => {
    setTransactionType(type);
    setIsTransactionDialogOpen(true);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  if (isLoadingRegister) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!register) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">الصندوق غير موجود</p>
        <Button variant="link" onClick={() => navigate('/treasury')}>
          العودة للخزينة
        </Button>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      <PageHeader
        title={register.name}
        description={register.location || 'صندوق نقدية'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/treasury')}>
              <ArrowLeft className="h-4 w-4 ml-2" />
              رجوع
            </Button>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="h-4 w-4 ml-2" />
              تعديل
            </Button>
          </div>
        }
      />

      {/* Register Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
                <p className={`text-3xl font-bold ${Number(register.current_balance) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                  {Number(register.current_balance).toLocaleString()} ج.م
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                className="text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                onClick={() => handleAddTransaction('income')}
              >
                <ArrowDownCircle className="h-4 w-4 ml-2" />
                إيداع
              </Button>
              <Button 
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => handleAddTransaction('expense')}
              >
                <ArrowUpCircle className="h-4 w-4 ml-2" />
                سحب
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>آخر الحركات</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              لا توجد حركات بعد
            </p>
          ) : isMobile ? (
            <div className="space-y-3">
              {transactions?.map((txn) => (
                <DataCard
                  key={txn.id}
                  title={txn.description || transactionTypeLabels[txn.transaction_type]}
                  subtitle={format(new Date(txn.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                  badge={{
                    text: transactionTypeLabels[txn.transaction_type],
                    variant: txn.transaction_type === 'income' || txn.transaction_type === 'transfer_in' ? 'default' : 'destructive',
                  }}
                  fields={[
                    { label: 'رقم العملية', value: txn.transaction_number },
                    { 
                      label: 'المبلغ', 
                      value: `${txn.transaction_type === 'income' || txn.transaction_type === 'transfer_in' ? '+' : '-'}${Number(txn.amount).toLocaleString()} ج.م`,
                    },
                    { label: 'الرصيد بعدها', value: `${Number(txn.balance_after).toLocaleString()} ج.م` },
                  ]}
                />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم العملية</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الرصيد بعدها</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="font-mono">{txn.transaction_number}</TableCell>
                    <TableCell>
                      <Badge className={transactionTypeColors[txn.transaction_type]}>
                        {transactionTypeLabels[txn.transaction_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className={txn.transaction_type === 'income' || txn.transaction_type === 'transfer_in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>
                      {txn.transaction_type === 'income' || txn.transaction_type === 'transfer_in' ? '+' : '-'}
                      {Number(txn.amount).toLocaleString()} ج.م
                    </TableCell>
                    <TableCell>{Number(txn.balance_after).toLocaleString()} ج.م</TableCell>
                    <TableCell>{txn.description || '-'}</TableCell>
                    <TableCell>{format(new Date(txn.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CashRegisterFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        register={register}
      />

      <CashTransactionDialog
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
        register={register}
        transactionType={transactionType}
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
