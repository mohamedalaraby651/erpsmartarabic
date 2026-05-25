import { useEffect, useState } from 'react';
import { FileText, Zap, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

type EngineMode = 'auto' | 'on' | 'off';

const LS_KEY = 'pdf_engine_v2';

function readMode(): EngineMode {
  try {
    const v = window.localStorage.getItem(LS_KEY);
    if (v === '1') return 'on';
    if (v === '0') return 'off';
  } catch {
    /* noop */
  }
  return 'auto';
}

function writeMode(mode: EngineMode) {
  try {
    if (mode === 'auto') window.localStorage.removeItem(LS_KEY);
    else window.localStorage.setItem(LS_KEY, mode === 'on' ? '1' : '0');
  } catch {
    /* noop */
  }
}

export function PdfEngineSettings() {
  const [mode, setMode] = useState<EngineMode>('auto');

  useEffect(() => {
    setMode(readMode());
  }, []);

  const apply = (next: EngineMode) => {
    setMode(next);
    writeMode(next);
    toast.success(
      next === 'on'
        ? 'تم تفعيل محرك PDF v2 لهذا المتصفح'
        : next === 'off'
        ? 'تم تعطيل محرك PDF v2 لهذا المتصفح'
        : 'تمت العودة للقرار التلقائي (Canary)'
    );
  };

  const badge =
    mode === 'on' ? (
      <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30">
        مُفعّل (v2)
      </Badge>
    ) : mode === 'off' ? (
      <Badge variant="secondary">معطّل (v1)</Badge>
    ) : (
      <Badge variant="outline">تلقائي (Canary)</Badge>
    );

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            محرك توليد PDF
          </CardTitle>
          <CardDescription>
            تحكّم في استخدام المحرك الجديد <span className="font-semibold">v2</span> القائم على HTML
            مع دعم Cairo / Amiri ومعالجة Bidi محسّنة. القرار يُخزَّن في هذا المتصفح فقط.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-amber-500" />
              <div>
                <Label className="text-base font-medium">الحالة الحالية</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  ينطبق فوراً على عمليات التصدير القادمة
                </p>
              </div>
            </div>
            {badge}
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="v2-on" className="text-sm font-medium">
                  تفعيل محرك v2 دائماً
                </Label>
                <p className="text-xs text-muted-foreground">
                  يفرض استخدام v2 لكل المستندات المدعومة (فواتير، عروض أسعار، أوامر شراء، كشوف حساب).
                </p>
              </div>
              <Switch
                id="v2-on"
                checked={mode === 'on'}
                onCheckedChange={(checked) => apply(checked ? 'on' : 'auto')}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="v2-off" className="text-sm font-medium">
                  تعطيل محرك v2 (استخدام v1 فقط)
                </Label>
                <p className="text-xs text-muted-foreground">
                  يعود للمحرك التقليدي (jsPDF) لكل المستندات حتى لو كانت ضمن نسبة الإطلاق.
                </p>
              </div>
              <Switch
                id="v2-off"
                checked={mode === 'off'}
                onCheckedChange={(checked) => apply(checked ? 'off' : 'auto')}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              إذا لم تفعّل أيّاً من الخيارين، سيُقرّر النظام تلقائياً بناءً على إعدادات الإطلاق
              التدريجي (Canary).
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => apply('auto')}
              disabled={mode === 'auto'}
            >
              <RotateCcw className="h-4 w-4 ml-1" />
              إعادة للتلقائي
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PdfEngineSettings;
