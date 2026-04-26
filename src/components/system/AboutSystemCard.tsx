import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { getBuildInfo, getEnvironmentLabel } from '@/lib/buildInfo';
import { useToast } from '@/hooks/use-toast';

/**
 * AboutSystemCard — surfaces the build stamp + environment so the user (and
 * support) can verify exactly which version of the app is running.
 *
 * Why it matters:
 *   When users report "I see X but my colleague sees Y", the most common
 *   cause is a stale browser cache serving an old JS bundle. This card lets
 *   them confirm in one glance which build is loaded, and force a refresh
 *   if a newer one exists on the server.
 */
export function AboutSystemCard() {
  const info = getBuildInfo();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);

  const formatBuildTime = (iso: string) => {
    if (iso === 'unknown') return 'غير معروف';
    try {
      return new Intl.DateTimeFormat('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const checkForUpdate = async () => {
    setChecking(true);
    try {
      // Compare current build id against /version.json (generated at build).
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('no version.json');
      const remote: { buildId?: string; buildTime?: string } = await res.json();

      if (remote.buildId && remote.buildId !== info.buildId) {
        toast({
          title: 'يتوفر تحديث جديد',
          description: 'سيتم إعادة تحميل الصفحة لتثبيت أحدث إصدار.',
        });
        // Tiny delay so the toast is seen, then hard reload.
        setTimeout(() => window.location.reload(), 800);
      } else {
        toast({
          title: 'أنت على أحدث إصدار',
          description: 'لا يوجد تحديث متاح حالياً.',
        });
      }
    } catch {
      toast({
        title: 'تعذّر التحقق من التحديث',
        description: 'حاول مرة أخرى بعد قليل.',
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  };

  const envColor =
    info.environment === 'production' ? 'default'
    : info.environment === 'preview' ? 'secondary'
    : 'outline';

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Info className="h-4 w-4 text-primary" />
          حول النظام
        </CardTitle>
        <CardDescription className="text-xs">
          معلومات تقنية مفيدة عند الإبلاغ عن مشكلة أو التأكد من تطابق الإصدار.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">البيئة الحالية</span>
          <Badge variant={envColor} className="font-medium">
            {info.isProduction
              ? <CheckCircle2 className="h-3 w-3 ml-1 inline" />
              : <AlertCircle className="h-3 w-3 ml-1 inline" />
            }
            {getEnvironmentLabel(info.environment)}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">رقم الإصدار</span>
          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{info.buildId}</code>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">تاريخ البناء</span>
          <span className="text-xs">{formatBuildTime(info.buildTime)}</span>
        </div>

        <div className="pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={checkForUpdate}
            disabled={checking}
            className="w-full gap-2"
          >
            <RefreshCw className={checking ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
            {checking ? 'جارٍ التحقق...' : 'تحقق من وجود تحديث'}
          </Button>
          {!info.isProduction && (
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              ⚠️ أنت تستخدم نسخة غير منشورة. للوصول إلى البيانات الفعلية افتح:
              <a
                href="https://erpsmartarabic.lovable.app"
                className="text-primary hover:underline mr-1"
              >
                erpsmartarabic.lovable.app
              </a>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AboutSystemCard;
