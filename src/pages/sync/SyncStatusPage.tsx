import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Database,
  Upload,
  Download,
  Trash2,
  AlertTriangle,
  HardDrive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  getPendingSyncItems, 
  getSyncQueueCount, 
  clearSyncQueue,
  getCachedData
} from '@/lib/offlineStorage';
import { fullSync, refreshCache } from '@/lib/syncManager';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const tableLabels: Record<string, string> = {
  customers: 'العملاء',
  products: 'المنتجات',
  invoices: 'الفواتير',
  quotations: 'عروض الأسعار',
  suppliers: 'الموردين',
  employees: 'الموظفين',
  sales_orders: 'أوامر البيع',
  purchase_orders: 'أوامر الشراء',
  payments: 'المدفوعات',
};

export default function SyncStatusPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [localDataCounts, setLocalDataCounts] = useState<Record<string, number>>({});

  // Fetch sync logs
  const { data: syncLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['sync-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Load local data counts
  useEffect(() => {
    const loadCounts = async () => {
      const count = await getSyncQueueCount();
      setPendingCount(count);

      const tables = ['customers', 'products', 'invoices', 'quotations', 'suppliers'];
      const counts: Record<string, number> = {};
      for (const table of tables) {
        try {
          const data = await getCachedData(table as never);
          counts[table] = data.length;
        } catch {
          counts[table] = 0;
        }
      }
      setLocalDataCounts(counts);
    };
    loadCounts();
  }, [isSyncing]);

  const handleSync = async () => {
    if (!isOnline) {
      toast({
        title: 'غير متصل بالإنترنت',
        description: 'يرجى الاتصال بالإنترنت للمزامنة',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const result = await fullSync();
      
      // Log the sync
      if (user?.id) {
        await supabase.from('sync_logs').insert({
          user_id: user.id,
          table_name: 'all',
          operation: 'full_sync',
          status: result.success ? 'success' : 'partial',
          synced_at: new Date().toISOString(),
        });
      }

      toast({
        title: 'تمت المزامنة',
        description: `تمت مزامنة ${result.synced} عملية${result.failed > 0 ? `، فشلت ${result.failed}` : ''}`,
      });
      
      refetchLogs();
      queryClient.invalidateQueries();
    } catch (error) {
      toast({
        title: 'فشلت المزامنة',
        description: 'حدث خطأ أثناء المزامنة',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefreshCache = async () => {
    if (!isOnline) {
      toast({
        title: 'غير متصل بالإنترنت',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      await refreshCache();
      toast({ title: 'تم تحديث البيانات المحلية' });
    } catch (error) {
      toast({
        title: 'فشل التحديث',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearQueue = async () => {
    try {
      await clearSyncQueue();
      setPendingCount(0);
      toast({ title: 'تم مسح قائمة الانتظار' });
    } catch (error) {
      toast({
        title: 'فشل المسح',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-success">ناجح</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500">جزئي</Badge>;
      case 'failed':
        return <Badge variant="destructive">فشل</Badge>;
      default:
        return <Badge variant="secondary">معلق</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">حالة المزامنة</h1>
          <p className="text-muted-foreground mt-1">
            إدارة البيانات المحلية والمزامنة مع السيرفر
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={isSyncing || !isOnline}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
        </Button>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Wifi className="h-6 w-6 text-success" />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <WifiOff className="h-6 w-6 text-destructive" />
                </div>
              )}
              <div>
                <p className="font-semibold text-lg">
                  {isOnline ? 'متصل بالإنترنت' : 'غير متصل'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isOnline 
                    ? 'يمكنك المزامنة مع السيرفر الآن' 
                    : 'البيانات محفوظة محلياً وستُزامن عند الاتصال'
                  }
                </p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-3xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">عملية معلقة</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Database className="h-4 w-4 ml-2" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="queue">
            <Upload className="h-4 w-4 ml-2" />
            قائمة الانتظار
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 ml-2" />
            السجل
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Local Data Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  البيانات المحلية
                </CardTitle>
                <CardDescription>
                  البيانات المخزنة على جهازك
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(localDataCounts).map(([table, count]) => (
                  <div key={table} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span>{tableLabels[table] || table}</span>
                    <Badge variant="secondary">{count} سجل</Badge>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={handleRefreshCache}
                  disabled={isSyncing || !isOnline}
                >
                  <Download className="h-4 w-4 ml-2" />
                  تحديث البيانات من السيرفر
                </Button>
              </CardContent>
            </Card>

            {/* Sync Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  إجراءات المزامنة
                </CardTitle>
                <CardDescription>
                  أدوات إدارة المزامنة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start"
                  onClick={handleSync}
                  disabled={isSyncing || !isOnline}
                >
                  <Upload className="h-4 w-4 ml-2" />
                  رفع التغييرات المحلية
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleRefreshCache}
                  disabled={isSyncing || !isOnline}
                >
                  <Download className="h-4 w-4 ml-2" />
                  تنزيل البيانات من السيرفر
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={handleClearQueue}
                  disabled={pendingCount === 0}
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  مسح قائمة الانتظار ({pendingCount})
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">العمليات المعلقة</CardTitle>
              <CardDescription>
                العمليات التي تنتظر المزامنة مع السيرفر
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingCount === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success" />
                  <p>لا توجد عمليات معلقة</p>
                  <p className="text-sm mt-1">كل البيانات متزامنة</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-yellow-600 mb-4">
                    <AlertTriangle className="h-5 w-5" />
                    <span>هناك {pendingCount} عملية تنتظر المزامنة</span>
                  </div>
                  <Button onClick={handleSync} disabled={!isOnline || isSyncing}>
                    <RefreshCw className={`h-4 w-4 ml-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    مزامنة الآن
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">سجل المزامنة</CardTitle>
              <CardDescription>
                آخر 50 عملية مزامنة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {syncLogs && syncLogs.length > 0 ? (
                  <div className="space-y-2">
                    {syncLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          {log.status === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : log.status === 'failed' ? (
                            <XCircle className="h-5 w-5 text-destructive" />
                          ) : (
                            <Clock className="h-5 w-5 text-warning" />
                          )}
                          <div>
                            <p className="font-medium">
                              {tableLabels[log.table_name] || log.table_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {log.operation}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          {getStatusBadge(log.status)}
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.synced_at 
                              ? format(new Date(log.synced_at), 'dd MMM HH:mm', { locale: ar })
                              : format(new Date(log.created_at), 'dd MMM HH:mm', { locale: ar })
                            }
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>لا يوجد سجل مزامنة بعد</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
