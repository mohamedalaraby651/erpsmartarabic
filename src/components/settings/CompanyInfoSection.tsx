import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LogoUpload } from '@/components/shared/LogoUpload';
import { Building2, Save, Loader2 } from 'lucide-react';

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

interface CompanyInfoSectionProps {
  onDataChange?: () => void;
}

export function CompanyInfoSection({ onDataChange }: CompanyInfoSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CompanySettings>(defaultSettings);

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

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

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
      toast({ title: 'تم حفظ معلومات الشركة بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل حفظ المعلومات', variant: 'destructive' });
    },
  });

  const updateField = (field: keyof CompanySettings, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    onDataChange?.();
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>معلومات الشركة</CardTitle>
                <CardDescription>البيانات الأساسية للشركة التي تظهر في الفواتير والتقارير</CardDescription>
              </div>
            </div>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              حفظ
            </Button>
          </div>
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
            <Textarea
              id="address"
              value={formData.address || ''}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="أدخل عنوان الشركة"
              rows={2}
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

          {/* Colors */}
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
          <div className="p-4 border rounded-lg">
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

          {/* Invoice Preview Mini */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <Label className="mb-3 block">معاينة رأس الفاتورة</Label>
            <div className="bg-background border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {formData.logo_url ? (
                    <img 
                      src={formData.logo_url} 
                      alt="Logo" 
                      className="h-12 w-12 object-contain rounded"
                    />
                  ) : (
                    <div 
                      className="h-12 w-12 rounded flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: formData.primary_color || '#2563eb' }}
                    >
                      {formData.company_name?.charAt(0) || 'ش'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold" style={{ color: formData.primary_color || '#2563eb' }}>
                      {formData.company_name || 'اسم الشركة'}
                    </h3>
                    <p className="text-xs text-muted-foreground">{formData.address || 'العنوان'}</p>
                  </div>
                </div>
                <div className="text-left text-xs text-muted-foreground">
                  <p>{formData.phone || '01xxxxxxxxx'}</p>
                  <p>{formData.email || 'email@company.com'}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
