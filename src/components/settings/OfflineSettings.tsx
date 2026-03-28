import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Save, Database, RefreshCw, Trash2, HardDrive } from 'lucide-react';
import { clearSyncQueue, getCachedData } from '@/lib/offlineStorage';

interface OfflineSettingsData {
  enabled_tables: string[];
  sync_on_login: boolean;
  auto_sync_interval: number;
}

const availableTables = [
  { id: 'customers', label: 'العملاء' },
  { id: 'products', label: 'المنتجات' },
  { id: 'invoices', label: 'الفواتير' },
  { id: 'quotations', label: 'عروض الأسعار' },
  { id: 'suppliers', label: 'الموردين' },
  { id: 'employees', label: 'الموظفين' },
  { id: 'sales_orders', label: 'أوامر البيع' },
  { id: 'purchase_orders', label: 'أوامر الشراء' },
];

const syncIntervals = [
  { value: '0', label: 'يدوي فقط' },
  { value: '5', label: 'كل 5 دقائق' },
  { value: '15', label: 'كل 15 دقيقة' },
  { value: '30', label: 'كل 30 دقيقة' },
  { value: '60', label: 'كل ساعة' },
];

export function OfflineSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localStorageSize, setLocalStorageSize] = useState<string>('0 KB');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['offline-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_offline_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const [formData, setFormData] = useState<OfflineSettingsData>({
    enabled_tables: ['customers', 'products', 'invoices', 'quotations', 'suppliers'],
    sync_on_login: true,
    auto_sync_interval: 0,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        enabled_tables: (settings.enabled_tables as string[]) || [],
        sync_on_login: settings.sync_on_login ?? true,
        auto_sync_interval: settings.auto_sync_interval ?? 0,
      });
    }
  }, [settings]);

  // Calculate storage size
  useEffect(() => {
    const calculateSize = async () => {
      let totalSize = 0;
      const tables = ['customers', 'products', 'invoices', 'quotations', 'suppliers'];
      for (const table of tables) {
        try {
          const data = await getCachedData(table as never);
          totalSize += JSON.stringify(data).length;
        } catch {
          // Ignore errors
        }
      }
      
      if (totalSize > 1024 * 1024) {
        setLocalStorageSize(`${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
      } else if (totalSize > 1024) {
        setLocalStorageSize(`${(totalSize / 1024).toFixed(2)} KB`);
      } else {
        setLocalStorageSize(`${totalSize} bytes`);
      }
    };
    calculateSize();
  }, []);

  const mutation = useMutation({
    mutationFn: async (data: OfflineSettingsData) => {
      if (!user?.id) throw new Error('No user');
      const { error } = await supabase
        .from('user_offline_settings')
        .upsert({
          user_id: user.id,
          enabled_tables: data.enabled_tables,
          sync_on_login: data.sync_on_login,
          auto_sync_interval: data.auto_sync_interval,
        }, {
          onConflict: 'user_id',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline-settings', user?.id] });
      toast({ title: 'تم حفظ الإعدادات بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل في حفظ الإعدادات', variant: 'destructive' });
    },
  });

  const handleTableToggle = (tableId: string) => {
    setFormData(prev => ({
      ...prev,
      enabled_tables: prev.enabled_tables.includes(tableId)
        ? prev.enabled_tables.filter(t => t !== tableId)
        : [...prev.enabled_tables, tableId],
    }));
  };

  const handleClearLocalData = async () => {
    try {
      await clearSyncQueue();
      // Clear IndexedDB
      if ('indexedDB' in window) {
        indexedDB.deleteDatabase('erp-offline-db');
      }
      toast({ title: 'تم مسح البيانات المحلية' });
    } catch (error) {
      toast({ title: 'فشل في مسح البيانات', variant: 'destructive' });
    }
  };

  const handleSave = () => {
    mutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            البيانات المخزنة محلياً
          </CardTitle>
          <CardDescription>
            اختر البيانات التي تريد تخزينها على جهازك للعمل بدون اتصال
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {availableTables.map((table) => (
              <div key={table.id} className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id={table.id}
                  checked={formData.enabled_tables.includes(table.id)}
                  onCheckedChange={() => handleTableToggle(table.id)}
                />
                <Label htmlFor={table.id} className="cursor-pointer">
                  {table.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            إعدادات المزامنة
          </CardTitle>
          <CardDescription>
            تحكم في كيفية مزامنة البيانات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>المزامنة عند تسجيل الدخول</Label>
              <p className="text-sm text-muted-foreground">
                مزامنة البيانات تلقائياً عند فتح التطبيق
              </p>
            </div>
            <Switch
              checked={formData.sync_on_login}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, sync_on_login: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>المزامنة التلقائية</Label>
            <Select
              value={formData.auto_sync_interval.toString()}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, auto_sync_interval: parseInt(value) }))
              }
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="اختر الفترة" />
              </SelectTrigger>
              <SelectContent>
                {syncIntervals.map((interval) => (
                  <SelectItem key={interval.value} value={interval.value}>
                    {interval.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            التخزين المحلي
          </CardTitle>
          <CardDescription>
            إدارة البيانات المخزنة على جهازك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">حجم البيانات المخزنة</p>
              <p className="text-sm text-muted-foreground">
                البيانات المخزنة محلياً على جهازك
              </p>
            </div>
            <span className="text-2xl font-bold">{localStorageSize}</span>
          </div>

          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={handleClearLocalData}
          >
            <Trash2 className="h-4 w-4 ml-2" />
            مسح جميع البيانات المحلية
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={mutation.isPending}>
          <Save className="h-4 w-4 ml-2" />
          {mutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </div>
    </div>
  );
}
