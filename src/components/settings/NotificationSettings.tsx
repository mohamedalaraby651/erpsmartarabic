import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, Volume2, Mail, Moon, BellRing, Settings2, Smartphone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ResetSettingsButton } from './ResetSettingsButton';
import { Badge } from '@/components/ui/badge';

export function NotificationSettings() {
  const {
    settings,
    toggleTypeEnabled,
    toggleTypeSound,
    toggleTypeEmail,
    setQuietHours,
    setPriority,
    resetToDefaults,
  } = useNotificationPreferences();

  const {
    permission,
    isSupported,
    isLoading: pushLoading,
    requestPermission,
    sendTestNotification,
  } = usePushNotifications();

  const handleReset = () => {
    resetToDefaults();
    toast.success('تم استعادة إعدادات الإشعارات الافتراضية');
  };

  const handleTestNotification = () => {
    sendTestNotification();
  };

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="default" className="bg-success text-success-foreground">مُفعّل</Badge>;
      case 'denied':
        return <Badge variant="destructive">مرفوض</Badge>;
      default:
        return <Badge variant="secondary">غير محدد</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Push Notifications Permission */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-primary" />
              إشعارات الدفع
            </CardTitle>
            {getPermissionBadge()}
          </div>
          <CardDescription>
            تلقي إشعارات فورية حتى عند إغلاق المتصفح
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupported ? (
            <p className="text-sm text-muted-foreground">
              إشعارات الدفع غير مدعومة في هذا المتصفح
            </p>
          ) : permission === 'denied' ? (
            <p className="text-sm text-destructive">
              تم رفض إذن الإشعارات. يرجى تفعيلها من إعدادات المتصفح
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {permission !== 'granted' && (
                <Button 
                  onClick={handleRequestPermission} 
                  variant="default"
                  disabled={pushLoading}
                  className="gap-2"
                >
                  {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  تفعيل الإشعارات
                </Button>
              )}
              <Button 
                onClick={handleTestNotification} 
                variant="outline" 
                className="gap-2"
                disabled={permission !== 'granted'}
              >
                <Bell className="h-4 w-4" />
                إرسال إشعار تجريبي
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BellRing className="h-5 w-5 text-primary" />
            اختبار الإشعارات
          </CardTitle>
          <CardDescription>تأكد من عمل الإشعارات على جهازك</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTestNotification} variant="outline" className="gap-2">
            <Bell className="h-4 w-4" />
            إرسال إشعار تجريبي
          </Button>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            أنواع الإشعارات
          </CardTitle>
          <CardDescription>تحكم في أنواع الإشعارات التي تريد استلامها</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {settings.types.map((type) => (
              <AccordionItem key={type.id} value={type.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pl-4">
                    <span className="font-medium">{type.label}</span>
                    <Switch
                      checked={type.enabled}
                      onCheckedChange={() => toggleTypeEnabled(type.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className={cn(
                    'space-y-3 pr-4 transition-opacity',
                    !type.enabled && 'opacity-50 pointer-events-none'
                  )}>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">تشغيل صوت</span>
                      </div>
                      <Switch
                        checked={type.sound}
                        onCheckedChange={() => toggleTypeSound(type.id)}
                        disabled={!type.enabled}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">إرسال بريد إلكتروني</span>
                      </div>
                      <Switch
                        checked={type.email}
                        onCheckedChange={() => toggleTypeEmail(type.id)}
                        disabled={!type.enabled}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Moon className="h-5 w-5 text-primary" />
            أوقات عدم الإزعاج
          </CardTitle>
          <CardDescription>إيقاف الإشعارات الصوتية في أوقات محددة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="space-y-0.5">
              <Label className="text-base">تفعيل وضع عدم الإزعاج</Label>
              <p className="text-sm text-muted-foreground">لن تصدر أصوات في الفترة المحددة</p>
            </div>
            <Switch
              checked={settings.quietHours.enabled}
              onCheckedChange={(enabled) => setQuietHours({ ...settings.quietHours, enabled })}
            />
          </div>

          {settings.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4 animate-fade-in">
              <div className="space-y-2">
                <Label>من الساعة</Label>
                <Input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) => setQuietHours({ ...settings.quietHours, start: e.target.value })}
                  className="text-center"
                />
              </div>
              <div className="space-y-2">
                <Label>إلى الساعة</Label>
                <Input
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) => setQuietHours({ ...settings.quietHours, end: e.target.value })}
                  className="text-center"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5 text-primary" />
            أولوية الإشعارات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <Label className="text-destructive font-medium">عاجل</Label>
              <Select
                value={settings.priority.high}
                onValueChange={(value: 'sound_popup' | 'popup' | 'badge') => setPriority({ ...settings.priority, high: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sound_popup">صوت + إشعار</SelectItem>
                  <SelectItem value="popup">إشعار فقط</SelectItem>
                  <SelectItem value="badge">شارة فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 p-3 rounded-lg border border-warning/30 bg-warning/5">
              <Label className="text-warning font-medium">عادي</Label>
              <Select
                value={settings.priority.medium}
                onValueChange={(value: 'popup' | 'badge') => setPriority({ ...settings.priority, medium: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="popup">إشعار منبثق</SelectItem>
                  <SelectItem value="badge">شارة فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <Label className="text-muted-foreground font-medium">منخفض</Label>
              <Select
                value={settings.priority.low}
                onValueChange={(value: 'badge' | 'none') => setPriority({ ...settings.priority, low: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="badge">شارة فقط</SelectItem>
                  <SelectItem value="none">بدون إشعار</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset */}
      <div className="flex justify-end pt-4">
        <ResetSettingsButton onReset={handleReset} sectionName="الإشعارات" />
      </div>
    </div>
  );
}
