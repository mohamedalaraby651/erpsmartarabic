import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Building2, FileText, Palette, Save, WifiOff, Bell, FileBox, Download } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { OfflineSettings } from "@/components/settings/OfflineSettings";
import { ThemeCustomizer } from "@/components/settings/ThemeCustomizer";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { ReportTemplateEditor } from "@/components/reports/ReportTemplateEditor";
import { SettingsExportImport } from "@/components/settings/SettingsExportImport";
import { SettingsPageSkeleton } from "@/components/shared/AdminPageSkeleton";

type CompanySettings = Database['public']['Tables']['company_settings']['Row'];

const SettingsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const [formData, setFormData] = useState<Partial<CompanySettings>>({});

  // Sync settings to form when loaded
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (data: Partial<CompanySettings>) => {
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
      toast({ title: "تم حفظ الإعدادات بنجاح" });
    },
    onError: () => {
      toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" });
    },
  });

  const handleSave = () => {
    mutation.mutate(formData);
  };

  const updateField = (field: keyof CompanySettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Initialize form data from settings
  const currentData = {
    company_name: formData.company_name ?? settings?.company_name ?? '',
    address: formData.address ?? settings?.address ?? '',
    phone: formData.phone ?? settings?.phone ?? '',
    phone2: formData.phone2 ?? settings?.phone2 ?? '',
    email: formData.email ?? settings?.email ?? '',
    tax_number: formData.tax_number ?? settings?.tax_number ?? '',
    currency: formData.currency ?? settings?.currency ?? 'ج.م',
    primary_color: formData.primary_color ?? settings?.primary_color ?? '#2563eb',
    secondary_color: formData.secondary_color ?? settings?.secondary_color ?? '#1e40af',
    logo_url: formData.logo_url ?? settings?.logo_url ?? '',
  };

  if (isLoading) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <Button onClick={handleSave} disabled={mutation.isPending}>
          <Save className="h-4 w-4 ml-2" />
          {mutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </Button>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 lg:w-auto">
          <TabsTrigger value="company">
            <Building2 className="h-4 w-4 ml-2" />
            الشركة
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 ml-2" />
            الفواتير
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 ml-2" />
            المظهر
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 ml-2" />
            الإشعارات
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileBox className="h-4 w-4 ml-2" />
            القوالب
          </TabsTrigger>
          <TabsTrigger value="export">
            <Download className="h-4 w-4 ml-2" />
            تصدير/استيراد
          </TabsTrigger>
          <TabsTrigger value="offline">
            <WifiOff className="h-4 w-4 ml-2" />
            Offline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الشركة</CardTitle>
              <CardDescription>
                المعلومات الأساسية للشركة التي ستظهر في الفواتير والمستندات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">اسم الشركة</Label>
                  <Input
                    id="company_name"
                    value={currentData.company_name}
                    onChange={(e) => updateField('company_name', e.target.value)}
                    placeholder="اسم الشركة"
                  />
                </div>
                <div>
                  <Label htmlFor="tax_number">الرقم الضريبي</Label>
                  <Input
                    id="tax_number"
                    value={currentData.tax_number}
                    onChange={(e) => updateField('tax_number', e.target.value)}
                    placeholder="الرقم الضريبي"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">العنوان</Label>
                <Textarea
                  id="address"
                  value={currentData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="عنوان الشركة"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">الهاتف الأساسي</Label>
                  <Input
                    id="phone"
                    value={currentData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="رقم الهاتف"
                  />
                </div>
                <div>
                  <Label htmlFor="phone2">هاتف إضافي</Label>
                  <Input
                    id="phone2"
                    value={currentData.phone2}
                    onChange={(e) => updateField('phone2', e.target.value)}
                    placeholder="رقم هاتف إضافي"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={currentData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="email@company.com"
                />
              </div>

              <div>
                <Label htmlFor="logo_url">رابط الشعار</Label>
                <Input
                  id="logo_url"
                  value={currentData.logo_url}
                  onChange={(e) => updateField('logo_url', e.target.value)}
                  placeholder="https://..."
                />
                {currentData.logo_url && (
                  <div className="mt-2">
                    <img
                      src={currentData.logo_url}
                      alt="شعار الشركة"
                      className="h-16 object-contain"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الفواتير</CardTitle>
              <CardDescription>
                تخصيص العملة والإعدادات الافتراضية للفواتير
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">العملة</Label>
                  <Input
                    id="currency"
                    value={currentData.currency}
                    onChange={(e) => updateField('currency', e.target.value)}
                    placeholder="ج.م"
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">ملاحظة</h4>
                <p className="text-sm text-muted-foreground">
                  سيتم استخدام هذه الإعدادات كقيم افتراضية عند إنشاء فواتير جديدة.
                  يمكنك تغيير هذه القيم لكل فاتورة على حدة.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <ThemeCustomizer />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <ReportTemplateEditor />
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <SettingsExportImport />
        </TabsContent>

        <TabsContent value="offline" className="space-y-6">
          <OfflineSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
