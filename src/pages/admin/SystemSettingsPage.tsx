import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings, 
  Building2, 
  Receipt, 
  Palette, 
  Wifi, 
  Database,
  Save,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { LogoUpload } from '@/components/shared/LogoUpload';
import { OfflineSettings } from '@/components/settings/OfflineSettings';
import { BackupTab } from '@/components/settings/BackupTab';

interface CompanySettings {
  id?: string;
  company_name: string;
  address: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  tax_number: string | null;
  logo_url: string | null;
  currency: string;
  primary_color: string | null;
  secondary_color: string | null;
}

const defaultSettings: CompanySettings = {
  company_name: 'شركتي',
  address: '',
  phone: '',
  phone2: '',
  email: '',
  tax_number: '',
  logo_url: null,
  currency: 'ج.م',
  primary_color: '#2563eb',
  secondary_color: '#1e40af',
};

export default function SystemSettingsPage() {
  const { userRole, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CompanySettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CompanySettings | null;
    },
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CompanySettings) => {
      if (settings?.id) {
        const { error } = await supabase
          .from('company_settings')
          .update(data)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('تم حفظ الإعدادات بنجاح');
      setHasChanges(false);
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast.error('فشل حفظ الإعدادات');
    },
  });

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Check for admin role
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const updateField = (field: keyof CompanySettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إعدادات النظام</h1>
            <p className="text-muted-foreground">إدارة إعدادات الشركة والنظام</p>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 ml-2" />
          )}
          حفظ التغييرات
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="system" dir="rtl">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="system" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">النظام</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">الفواتير</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">المظهر</span>
          </TabsTrigger>
          <TabsTrigger value="offline" className="gap-2">
            <Wifi className="h-4 w-4" />
            <span className="hidden sm:inline">Offline</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">النسخ الاحتياطي</span>
          </TabsTrigger>
        </TabsList>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الشركة</CardTitle>
              <CardDescription>البيانات الأساسية للشركة التي تظهر في الفواتير والتقارير</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>شعار الشركة</Label>
                <LogoUpload
                  currentLogoUrl={formData.logo_url}
                  onUpload={(url) => updateField('logo_url', url)}
                  onRemove={() => updateField('logo_url', null)}
                />
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="company_name">اسم الشركة</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => updateField('company_name', e.target.value)}
                  placeholder="أدخل اسم الشركة"
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="أدخل عنوان الشركة"
                />
              </div>

              {/* Phones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">الهاتف الأساسي</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone2">الهاتف الثانوي</Label>
                  <Input
                    id="phone2"
                    value={formData.phone2 || ''}
                    onChange={(e) => updateField('phone2', e.target.value)}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="info@company.com"
                  dir="ltr"
                />
              </div>

              {/* Tax Number */}
              <div className="space-y-2">
                <Label htmlFor="tax_number">الرقم الضريبي</Label>
                <Input
                  id="tax_number"
                  value={formData.tax_number || ''}
                  onChange={(e) => updateField('tax_number', e.target.value)}
                  placeholder="أدخل الرقم الضريبي"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الفواتير</CardTitle>
              <CardDescription>تخصيص العملة وإعدادات الفواتير</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currency">العملة</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => updateField('currency', e.target.value)}
                  placeholder="ج.م"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>المظهر والألوان</CardTitle>
              <CardDescription>تخصيص ألوان النظام</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">اللون الأساسي</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={formData.primary_color || '#2563eb'}
                      onChange={(e) => updateField('primary_color', e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color || '#2563eb'}
                      onChange={(e) => updateField('primary_color', e.target.value)}
                      placeholder="#2563eb"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">اللون الثانوي</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={formData.secondary_color || '#1e40af'}
                      onChange={(e) => updateField('secondary_color', e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.secondary_color || '#1e40af'}
                      onChange={(e) => updateField('secondary_color', e.target.value)}
                      placeholder="#1e40af"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 border rounded-lg">
                <Label className="mb-3 block">معاينة الألوان</Label>
                <div className="flex gap-4">
                  <div
                    className="w-20 h-20 rounded-lg shadow-md flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: formData.primary_color || '#2563eb' }}
                  >
                    أساسي
                  </div>
                  <div
                    className="w-20 h-20 rounded-lg shadow-md flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: formData.secondary_color || '#1e40af' }}
                  >
                    ثانوي
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Offline Tab */}
        <TabsContent value="offline" className="space-y-6">
          <OfflineSettings />
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-6">
          <BackupTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
