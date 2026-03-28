import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Receipt, Save, Loader2, Info, Type } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AVAILABLE_FONTS } from '@/lib/arabicFont';
import type { PdfFontKey } from '@/lib/arabicFont';

interface InvoiceSettingsSectionProps {
  onDataChange?: () => void;
}

export function InvoiceSettingsSection({ onDataChange }: InvoiceSettingsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currency, setCurrency] = useState('ج.م');
  const [pdfFont, setPdfFont] = useState<PdfFontKey>('cairo');

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
      return data;
    },
  });

  // Load settings into form
  useEffect(() => {
    if (settings?.currency) {
      setCurrency(settings.currency);
    }
    if (settings?.pdf_font) {
      setPdfFont(settings.pdf_font as PdfFontKey);
    }
  }, [settings]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (settings?.id) {
        const { error } = await supabase
          .from('company_settings')
          .update({ currency, pdf_font: pdfFont })
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert({ company_name: 'شركتي', currency, pdf_font: pdfFont } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast({ title: 'تم حفظ إعدادات الفواتير بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل حفظ الإعدادات', variant: 'destructive' });
    },
  });

  const handleSave = () => {
    updateMutation.mutate();
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
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>إعدادات الفواتير</CardTitle>
                <CardDescription>تخصيص العملة وإعدادات الفواتير الافتراضية</CardDescription>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">العملة</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  onDataChange?.();
                }}
                placeholder="ج.م"
              />
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              سيتم استخدام هذه الإعدادات كقيم افتراضية عند إنشاء فواتير جديدة.
              يمكنك تغيير هذه القيم لكل فاتورة على حدة.
            </AlertDescription>
          </Alert>

          {/* Currency Examples */}
          <div className="p-4 border rounded-lg space-y-3">
            <Label className="block">أمثلة على العملات الشائعة</Label>
            <div className="flex flex-wrap gap-2">
              {['ج.م', 'ر.س', 'د.إ', 'د.ك', 'ر.ق', 'ر.ع', 'د.ب', '$', '€', '£'].map((curr) => (
                <Button
                  key={curr}
                  variant={currency === curr ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setCurrency(curr);
                    onDataChange?.();
                  }}
                  className="touch-target"
                >
                  {curr}
                </Button>
              ))}
            </div>
          </div>

          {/* Invoice Preview */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
            <Label className="block">معاينة عرض السعر</Label>
            <div className="bg-background border rounded-lg p-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span>1,000.00 {currency}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-muted-foreground">الضريبة (14%)</span>
                <span>140.00 {currency}</span>
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between items-center font-bold">
                <span>الإجمالي</span>
                <span className="text-primary">1,140.00 {currency}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Font Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Type className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>خط PDF والمطبوعات</CardTitle>
              <CardDescription>اختر الخط المستخدم في ملفات PDF والمستندات المصدّرة</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AVAILABLE_FONTS.map((font) => {
              const isSelected = pdfFont === font.key;
              return (
                <button
                  key={font.key}
                  onClick={() => {
                    setPdfFont(font.key);
                    onDataChange?.();
                  }}
                  className={`p-4 border-2 rounded-xl text-right transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {font.displayName}
                    </span>
                    {isSelected && (
                      <span className="text-primary text-sm font-bold">✓</span>
                    )}
                  </div>
                  <p
                    className="text-lg font-medium mb-1"
                    style={{ fontFamily: `'${font.displayName}', sans-serif` }}
                  >
                    {font.arabicName}
                  </p>
                  <p className="text-xs text-muted-foreground">{font.description}</p>
                </button>
              );
            })}
          </div>

          {/* Font Preview */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
            <Label className="block">معاينة الخط المختار</Label>
            <div className="bg-background border rounded-lg p-4 space-y-2">
              <link
                rel="stylesheet"
                href={`https://fonts.googleapis.com/css2?family=${AVAILABLE_FONTS.find(f => f.key === pdfFont)?.googleFontFamily || 'Cairo:wght@400;700'}&display=swap`}
              />
              <p
                className="text-lg"
                style={{ fontFamily: `'${AVAILABLE_FONTS.find(f => f.key === pdfFont)?.displayName || 'Cairo'}', sans-serif` }}
              >
                بسم الله الرحمن الرحيم - فاتورة رقم ١٢٣٤
              </p>
              <p
                className="text-sm text-muted-foreground"
                style={{ fontFamily: `'${AVAILABLE_FONTS.find(f => f.key === pdfFont)?.displayName || 'Cairo'}', sans-serif` }}
              >
                هذا النص يوضح شكل الخط المختار في المستندات المطبوعة وملفات PDF
              </p>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              سيتم تطبيق الخط المختار على جميع ملفات PDF والمستندات المصدّرة من النظام.
              تأكد من الضغط على "حفظ" لتطبيق التغييرات.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
