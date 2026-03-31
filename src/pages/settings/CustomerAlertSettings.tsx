import React from 'react';
import { useAlertSettings, type AlertSettings } from '@/hooks/useAlertSettings';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { ALERT_TYPE_CONFIG, ALERT_TYPE_ORDER } from '@/components/customers/alerts/AlertTypeConfig';
import { AlertOctagon, Clock, TrendingUp, CalendarClock, Crown, TrendingDown, UserMinus, UserPlus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  AlertOctagon, Clock, TrendingUp, CalendarClock, Crown, TrendingDown, UserMinus, UserPlus,
};

const TOGGLE_KEYS: Record<string, keyof AlertSettings> = {
  credit_exceeded: 'enableCreditExceeded',
  overdue_payment: 'enableOverduePayment',
  credit_approaching: 'enableCreditApproaching',
  upcoming_due: 'enableUpcomingDue',
  vip_no_contact: 'enableVipNoContact',
  sales_decline: 'enableSalesDecline',
  inactive: 'enableInactive',
  new_customer: 'enableNewCustomer',
};

const CustomerAlertSettings = () => {
  const { settings, updateSettings, resetSettings, DEFAULT_SETTINGS } = useAlertSettings();

  return (
    <PageWrapper title="إعدادات التنبيهات">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Alert type toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">أنواع التنبيهات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ALERT_TYPE_ORDER.map(type => {
              const config = ALERT_TYPE_CONFIG[type];
              const IconComp = ICON_MAP[config.icon];
              const toggleKey = TOGGLE_KEYS[type];
              return (
                <div key={type} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    {IconComp && <IconComp className={cn('h-4 w-4', config.color)} />}
                    <Label className="text-sm cursor-pointer">{config.label}</Label>
                  </div>
                  <Switch
                    checked={settings[toggleKey] as boolean}
                    onCheckedChange={v => updateSettings({ [toggleKey]: v })}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">العتبات والحدود</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">تحذير حد الائتمان (%)</Label>
                <Input type="number" value={settings.creditWarningPercent} min={50} max={99}
                  onChange={e => updateSettings({ creditWarningPercent: Number(e.target.value) || 80 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">أيام الخمول</Label>
                <Input type="number" value={settings.inactiveDays} min={30} max={365}
                  onChange={e => updateSettings({ inactiveDays: Number(e.target.value) || 90 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">VIP بدون تواصل (أيام)</Label>
                <Input type="number" value={settings.vipNoContactDays} min={7} max={90}
                  onChange={e => updateSettings({ vipNoContactDays: Number(e.target.value) || 30 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">فواتير متأخرة (أيام)</Label>
                <Input type="number" value={settings.overdueDaysThreshold} min={7} max={180}
                  onChange={e => updateSettings({ overdueDaysThreshold: Number(e.target.value) || 60 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">دفعات قريبة (أيام)</Label>
                <Input type="number" value={settings.upcomingDueDays} min={1} max={30}
                  onChange={e => updateSettings({ upcomingDueDays: Number(e.target.value) || 7 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">انخفاض مبيعات (%)</Label>
                <Input type="number" value={settings.salesDeclinePercent} min={10} max={90}
                  onChange={e => updateSettings({ salesDeclinePercent: Number(e.target.value) || 30 })} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">إعدادات العرض</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">الحد الأدنى للأهمية</Label>
              <Select value={settings.minSeverity} onValueChange={v => updateSettings({ minSeverity: v as AlertSettings['minSeverity'] })}>
                <SelectTrigger className="w-40 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="warning">تحذير فأعلى</SelectItem>
                  <SelectItem value="error">خطير فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-sm">تشغيل الأصوات</Label>
              <Switch checked={settings.soundEnabled} onCheckedChange={v => updateSettings({ soundEnabled: v })} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button variant="outline" className="gap-2" onClick={resetSettings}>
            <RotateCcw className="h-4 w-4" />
            استعادة الافتراضي
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
};

export default CustomerAlertSettings;
