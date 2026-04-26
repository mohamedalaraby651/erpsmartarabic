import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Smartphone, Zap, Battery, Gauge } from 'lucide-react';
import { useAdaptiveSettings } from '@/hooks/useAdaptiveSettings';
import type { SettingsMode } from '@/lib/adaptiveSettings';
import { cn } from '@/lib/utils';

const PRESET_OPTIONS: Array<{
  id: SettingsMode;
  label: string;
  description: string;
  icon: typeof Zap;
}> = [
  { id: 'auto', label: 'تلقائي', description: 'يتكيف مع شبكتك تلقائياً', icon: Gauge },
  { id: 'data-saver', label: 'موفّر البيانات', description: 'يقلل الاستهلاك للحد الأدنى', icon: Battery },
  { id: 'balanced', label: 'متوازن', description: 'أداء مقبول واستهلاك معتدل', icon: Wifi },
  { id: 'performance', label: 'أداء عالي', description: 'سرعة قصوى — Wi-Fi/4G سريع', icon: Zap },
];

function NetworkBadge({ tier, saveData }: { tier: string; saveData: boolean }) {
  const variant = tier === 'fast' ? 'default' : tier === 'medium' ? 'secondary' : 'destructive';
  const Icon = tier === 'slow' || saveData ? WifiOff : Wifi;
  const label = saveData
    ? 'موفّر البيانات مفعّل'
    : tier === 'fast'
    ? 'سريعة (Wi-Fi/4G)'
    : tier === 'medium'
    ? 'متوسطة'
    : 'بطيئة (3G)';
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export function AdaptivePerformanceSettings() {
  const { settings, profile, setMode, updateField } = useAdaptiveSettings();

  return (
    <div className="space-y-6">
      {/* حالة الشبكة والجهاز */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            حالة الاتصال والجهاز
          </CardTitle>
          <CardDescription>
            معلومات يستخدمها النظام لتخصيص الأداء تلقائياً
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">الشبكة:</span>
            <NetworkBadge tier={profile.network.tier} saveData={profile.network.saveData} />
            <Badge variant="outline" className="text-xs">
              {profile.network.effectiveType.toUpperCase()} · {profile.network.downlinkMbps.toFixed(1)} Mbps · RTT {profile.network.rttMs}ms
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">الجهاز:</span>
            <Badge variant="outline" className="gap-1">
              <Smartphone className="h-3 w-3" />
              {profile.device.tier === 'high' ? 'قوي' : profile.device.tier === 'medium' ? 'متوسط' : 'محدود'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {profile.device.memoryGb} GB RAM · {profile.device.cores} cores
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* الأوضاع المسبقة */}
      <Card>
        <CardHeader>
          <CardTitle>وضع الأداء</CardTitle>
          <CardDescription>
            اختر وضعاً جاهزاً أو خصّص الإعدادات يدوياً من الأسفل
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESET_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = settings.mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border-2 p-4 text-right transition-colors',
                    'hover:border-primary/50 hover:bg-accent/30',
                    active ? 'border-primary bg-primary/5' : 'border-border',
                  )}
                >
                  <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {settings.mode === 'manual' && (
            <div className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              الوضع الحالي: <span className="font-semibold text-foreground">يدوي مخصّص</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* إعدادات تفصيلية */}
      <Card>
        <CardHeader>
          <CardTitle>إعدادات تفصيلية</CardTitle>
          <CardDescription>
            تعديل أي قيمة سيحوّل الوضع إلى "يدوي"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timeouts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>مهلة الاستعلامات (Query Timeout)</Label>
              <span className="text-sm font-mono text-muted-foreground">
                {(settings.queryTimeoutMs / 1000).toFixed(0)}s
              </span>
            </div>
            <Slider
              min={5}
              max={60}
              step={1}
              value={[settings.queryTimeoutMs / 1000]}
              onValueChange={([v]) => updateField('queryTimeoutMs', v * 1000)}
            />
            <p className="text-xs text-muted-foreground">
              الشبكة الأبطأ تحتاج مهلة أطول قبل الفشل
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>مهلة المزامنة (Sync Timeout)</Label>
              <span className="text-sm font-mono text-muted-foreground">
                {(settings.syncTimeoutMs / 1000).toFixed(0)}s
              </span>
            </div>
            <Slider
              min={10}
              max={120}
              step={5}
              value={[settings.syncTimeoutMs / 1000]}
              onValueChange={([v]) => updateField('syncTimeoutMs', v * 1000)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>فترة المزامنة في الخلفية</Label>
              <span className="text-sm font-mono text-muted-foreground">
                {(settings.backgroundSyncIntervalMs / 60000).toFixed(0)} دقيقة
              </span>
            </div>
            <Slider
              min={1}
              max={60}
              step={1}
              value={[settings.backgroundSyncIntervalMs / 60000]}
              onValueChange={([v]) => updateField('backgroundSyncIntervalMs', v * 60000)}
            />
            <p className="text-xs text-muted-foreground">
              فترات أطول = استهلاك بيانات أقل
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>تفعيل Prefetch</Label>
                <p className="text-xs text-muted-foreground">
                  تحميل مسبق لتسريع التنقل
                </p>
              </div>
              <Switch
                checked={settings.prefetchEnabled}
                onCheckedChange={(v) => updateField('prefetchEnabled', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Prefetch عند التمرير (Hover)</Label>
                <p className="text-xs text-muted-foreground">يستهلك أقل، يتطلب تفاعل</p>
              </div>
              <Switch
                checked={settings.prefetchOnHover}
                onCheckedChange={(v) => updateField('prefetchOnHover', v)}
                disabled={!settings.prefetchEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Prefetch في وقت الخمول (Idle)</Label>
                <p className="text-xs text-muted-foreground">يستهلك بيانات في الخلفية</p>
              </div>
              <Switch
                checked={settings.prefetchOnIdle}
                onCheckedChange={(v) => updateField('prefetchOnIdle', v)}
                disabled={!settings.prefetchEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>إيقاف الخلفية عند الشبكة البطيئة</Label>
                <p className="text-xs text-muted-foreground">
                  يحفظ البيانات تلقائياً عند 3G/Save-Data
                </p>
              </div>
              <Switch
                checked={settings.pauseBackgroundOnSlowNetwork}
                onCheckedChange={(v) => updateField('pauseBackgroundOnSlowNetwork', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>تفعيل الحركات (Animations)</Label>
                <p className="text-xs text-muted-foreground">
                  أوقفها لتحسين الأداء على الأجهزة الضعيفة
                </p>
              </div>
              <Switch
                checked={settings.enableAnimations}
                onCheckedChange={(v) => updateField('enableAnimations', v)}
              />
            </div>
          </div>

          <div className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setMode('auto')} className="w-full">
              إعادة الضبط إلى التلقائي
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
