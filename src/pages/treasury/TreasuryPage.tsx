import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { Plus, Wallet, ArrowUpCircle, ArrowDownCircle, RefreshCw, Building2 } from 'lucide-react';
import { CashRegisterFormDialog } from '@/components/treasury/CashRegisterFormDialog';
import { CashTransactionDialog } from '@/components/treasury/CashTransactionDialog';
import { useNavigate } from 'react-router-dom';

interface CashRegister {
  id: string;
  name: string;
  location: string | null;
  current_balance: number;
  is_active: boolean;
  assigned_to: string | null;
  created_at: string;
}

export default function TreasuryPage() {
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle URL action parameter to auto-open dialog
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setIsRegisterDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: registers, isLoading, refetch } = useQuery({
    queryKey: ['cash-registers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CashRegister[];
    },
  });

  const { data: todayStats } = useQuery({
    queryKey: ['treasury-today-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('cash_transactions')
        .select('transaction_type, amount')
        .gte('created_at', today);
      
      if (error) throw error;
      
      const income = data?.filter(t => t.transaction_type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const expense = data?.filter(t => t.transaction_type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      
      return { income, expense, net: income - expense };
    },
  });

  const totalBalance = registers?.reduce((sum, r) => sum + Number(r.current_balance), 0) || 0;

  const handleAddTransaction = (register: CashRegister, type: 'income' | 'expense') => {
    setSelectedRegister(register);
    setTransactionType(type);
    setIsTransactionDialogOpen(true);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const content = (
    <div className="space-y-6">
      <PageHeader
        title="الخزينة"
        description="إدارة صناديق النقدية والحركات المالية"
        actions={
          <Button onClick={() => setIsRegisterDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            صندوق جديد
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الرصيد</p>
                <p className="text-xl font-bold">{totalBalance.toLocaleString()} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <ArrowDownCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إيرادات اليوم</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{(todayStats?.income || 0).toLocaleString()} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <ArrowUpCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مصروفات اليوم</p>
                <p className="text-xl font-bold text-destructive">{(todayStats?.expense || 0).toLocaleString()} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">صافي اليوم</p>
                <p className={`text-xl font-bold ${(todayStats?.net || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                  {(todayStats?.net || 0).toLocaleString()} ج.م
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Registers */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">صناديق النقدية</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-8 w-24 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : registers?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">لا توجد صناديق نقدية</p>
              <Button onClick={() => setIsRegisterDialogOpen(true)}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة صندوق جديد
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {registers?.map((register) => (
              <Card 
                key={register.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/treasury/${register.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{register.name}</CardTitle>
                    <Badge variant={register.is_active ? 'default' : 'secondary'}>
                      {register.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                  {register.location && (
                    <p className="text-sm text-muted-foreground">{register.location}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold mb-4 ${Number(register.current_balance) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                    {Number(register.current_balance).toLocaleString()} ج.م
                  </p>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                      onClick={() => handleAddTransaction(register, 'income')}
                    >
                      <ArrowDownCircle className="h-4 w-4 ml-1" />
                      إيداع
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => handleAddTransaction(register, 'expense')}
                    >
                      <ArrowUpCircle className="h-4 w-4 ml-1" />
                      سحب
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CashRegisterFormDialog
        open={isRegisterDialogOpen}
        onOpenChange={setIsRegisterDialogOpen}
      />

      {selectedRegister && (
        <CashTransactionDialog
          open={isTransactionDialogOpen}
          onOpenChange={setIsTransactionDialogOpen}
          register={selectedRegister}
          transactionType={transactionType}
        />
      )}
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
