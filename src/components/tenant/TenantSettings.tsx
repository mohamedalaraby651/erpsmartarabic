import React, { useState } from 'react';
import { Building2, Settings, Users, Crown, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function TenantSettings() {
  const { tenant, refreshTenant, isLoading } = useTenant();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    slug: tenant?.slug || '',
    domain: tenant?.domain || '',
  });

  React.useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain || '',
      });
    }
  }, [tenant]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!tenant?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: formData.name,
          slug: formData.slug,
          domain: formData.domain || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenant.id);

      if (error) throw error;

      toast.success('تم حفظ إعدادات الشركة بنجاح');
      refreshTenant();
    } catch (error) {
      console.error('Error saving tenant settings:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return {
          label: 'مؤسسة',
          description: 'جميع الميزات + دعم مخصص',
          color: 'bg-gradient-to-r from-amber-500 to-yellow-500',
          icon: Crown,
        };
      case 'professional':
        return {
          label: 'احترافي',
          description: 'ميزات متقدمة + تقارير',
          color: 'bg-gradient-to-r from-blue-500 to-indigo-500',
          icon: Settings,
        };
      default:
        return {
          label: 'أساسي',
          description: 'الميزات الأساسية',
          color: 'bg-gradient-to-r from-gray-400 to-gray-500',
          icon: Building2,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد شركة محددة</p>
        </CardContent>
      </Card>
    );
  }

  const tierInfo = getTierInfo(tenant.subscription_tier);
  const TierIcon = tierInfo.icon;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TierIcon className="h-5 w-5" />
            باقة الاشتراك
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`rounded-lg p-4 text-white ${tierInfo.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{tierInfo.label}</h3>
                <p className="text-sm opacity-90">{tierInfo.description}</p>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                {tenant.is_active ? 'نشط' : 'غير نشط'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            معلومات الشركة
          </CardTitle>
          <CardDescription>
            إعدادات الشركة الأساسية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الشركة</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="اسم الشركة"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">المعرف الفريد (Slug)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                placeholder="company-slug"
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">النطاق المخصص (اختياري)</Label>
            <Input
              id="domain"
              value={formData.domain}
              onChange={(e) => handleInputChange('domain', e.target.value)}
              placeholder="example.com"
              dir="ltr"
              className="text-left"
            />
            <p className="text-xs text-muted-foreground">
              يمكنك ربط نطاقك الخاص للوصول إلى النظام
            </p>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  حفظ التغييرات
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            معلومات إضافية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">معرف الشركة:</span>
              <p className="font-mono text-xs mt-1" dir="ltr">{tenant.id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">تاريخ الإنشاء:</span>
              <p className="mt-1">{new Date(tenant.created_at).toLocaleDateString('ar-EG')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">آخر تحديث:</span>
              <p className="mt-1">{new Date(tenant.updated_at).toLocaleDateString('ar-EG')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">الحالة:</span>
              <p className="mt-1">
                <Badge variant={tenant.is_active ? 'default' : 'destructive'}>
                  {tenant.is_active ? 'نشط' : 'معلق'}
                </Badge>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TenantSettings;
