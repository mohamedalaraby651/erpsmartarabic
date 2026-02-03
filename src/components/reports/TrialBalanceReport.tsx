import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Scale, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ChartOfAccount = Database['public']['Tables']['chart_of_accounts']['Row'];

interface TrialBalanceReportProps {
  asOfDate: Date;
}

interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
}

const accountTypeLabels: Record<string, string> = {
  asset: 'أصول',
  liability: 'خصوم',
  equity: 'حقوق ملكية',
  revenue: 'إيرادات',
  expense: 'مصروفات',
};

const accountTypeColors: Record<string, string> = {
  asset: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  liability: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  equity: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  revenue: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  expense: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export function TrialBalanceReport({ asOfDate }: TrialBalanceReportProps) {
  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ['chart-of-accounts-balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return data as ChartOfAccount[];
    },
  });

  const { data: journalEntries, isLoading: loadingEntries } = useQuery({
    queryKey: ['journal-entries-for-trial', asOfDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          journals!inner (
            is_posted,
            journal_date
          )
        `)
        .eq('journals.is_posted', true)
        .lte('journals.journal_date', asOfDate.toISOString().split('T')[0]);
      if (error) throw error;
      return data;
    },
  });

  const trialBalanceData = useMemo(() => {
    if (!accounts || !journalEntries) return [];

    // Calculate balances per account
    const balanceMap = new Map<string, { debit: number; credit: number }>();
    
    journalEntries.forEach((entry) => {
      const current = balanceMap.get(entry.account_id) || { debit: 0, credit: 0 };
      current.debit += Number(entry.debit_amount) || 0;
      current.credit += Number(entry.credit_amount) || 0;
      balanceMap.set(entry.account_id, current);
    });

    const rows: TrialBalanceRow[] = accounts
      .map((account) => {
        const balance = balanceMap.get(account.id) || { debit: 0, credit: 0 };
        const netDebit = balance.debit - balance.credit;
        
        // Determine if balance is debit or credit based on normal balance
        let debitBalance = 0;
        let creditBalance = 0;
        
        if (netDebit > 0) {
          debitBalance = netDebit;
        } else if (netDebit < 0) {
          creditBalance = Math.abs(netDebit);
        }
        
        // Add current_balance from account if no journal entries
        if (balance.debit === 0 && balance.credit === 0 && account.current_balance) {
          const currentBal = Number(account.current_balance);
          if (account.normal_balance === 'debit' && currentBal > 0) {
            debitBalance = currentBal;
          } else if (account.normal_balance === 'credit' && currentBal > 0) {
            creditBalance = currentBal;
          } else if (currentBal < 0) {
            // Negative balance goes to opposite side
            if (account.normal_balance === 'debit') {
              creditBalance = Math.abs(currentBal);
            } else {
              debitBalance = Math.abs(currentBal);
            }
          }
        }

        return {
          accountCode: account.code,
          accountName: account.name,
          accountType: account.account_type,
          debitBalance,
          creditBalance,
        };
      })
      .filter((row) => row.debitBalance !== 0 || row.creditBalance !== 0);

    return rows;
  }, [accounts, journalEntries]);

  const totals = useMemo(() => {
    return trialBalanceData.reduce(
      (acc, row) => ({
        debit: acc.debit + row.debitBalance,
        credit: acc.credit + row.creditBalance,
      }),
      { debit: 0, credit: 0 }
    );
  }, [trialBalanceData]);

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  const isLoading = loadingAccounts || loadingEntries;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Balance Status Card */}
      <Card className={isBalanced ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isBalanced ? (
                <CheckCircle2 className="h-8 w-8 text-success" />
              ) : (
                <AlertCircle className="h-8 w-8 text-destructive" />
              )}
              <div>
                <h3 className="font-semibold text-lg">
                  {isBalanced ? 'ميزان المراجعة متوازن' : 'ميزان المراجعة غير متوازن'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  حتى تاريخ: {asOfDate.toLocaleDateString('ar-EG')}
                </p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">الفرق</p>
              <p className={`text-xl font-bold ${isBalanced ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(Math.abs(totals.debit - totals.credit))} ج.م
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Scale className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المدين</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.debit)} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-secondary/50">
                <Scale className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الدائن</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.credit)} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trial Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            ميزان المراجعة
          </CardTitle>
          <CardDescription>
            عرض أرصدة جميع الحسابات النشطة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trialBalanceData.length === 0 ? (
            <div className="text-center py-12">
              <Scale className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد أرصدة حسابات</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">الرمز</TableHead>
                  <TableHead>اسم الحساب</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead className="text-left">مدين</TableHead>
                  <TableHead className="text-left">دائن</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalanceData.map((row) => (
                  <TableRow key={row.accountCode}>
                    <TableCell className="font-mono text-sm">{row.accountCode}</TableCell>
                    <TableCell className="font-medium">{row.accountName}</TableCell>
                    <TableCell>
                      <Badge className={accountTypeColors[row.accountType] || 'bg-muted'}>
                        {accountTypeLabels[row.accountType] || row.accountType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left font-mono">
                      {row.debitBalance > 0 ? formatCurrency(row.debitBalance) : '-'}
                    </TableCell>
                    <TableCell className="text-left font-mono">
                      {row.creditBalance > 0 ? formatCurrency(row.creditBalance) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3} className="text-left">الإجمالي</TableCell>
                  <TableCell className="text-left font-mono text-primary">
                    {formatCurrency(totals.debit)}
                  </TableCell>
                  <TableCell className="text-left font-mono text-primary">
                    {formatCurrency(totals.credit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}