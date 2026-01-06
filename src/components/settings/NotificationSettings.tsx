import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Bell, Volume2, Mail, Moon, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

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

  const handleReset = () => {
    resetToDefaults();
    toast.success('تم استعادة إعدادات الإشعارات الافتراضية');
  };

  return (
    <div className="space-y-6">
      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            أنواع الإشعارات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Header */}
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
              <div>النوع</div>
              <div className="text-center">تفعيل</div>
              <div className="text-center flex items-center justify-center gap-1">
                <Volume2 className="h-4 w-4" />
                صوت
              </div>
              <div className="text-center flex items-center justify-center gap-1">
                <Mail className="h-4 w-4" />
                بريد
              </div>
            </div>

            {/* Types */}
            {settings.types.map((type) => (
              <div key={type.id} className="grid grid-cols-4 gap-4 items-center py-2">
                <Label className="font-normal">{type.label}</Label>
                <div className="flex justify-center">
                  <Switch
                    checked={type.enabled}
                    onCheckedChange={() => toggleTypeEnabled(type.id)}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={type.sound}
                    onCheckedChange={() => toggleTypeSound(type.id)}
                    disabled={!type.enabled}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={type.email}
                    onCheckedChange={() => toggleTypeEmail(type.id)}
                    disabled={!type.enabled}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            أوقات عدم الإزعاج
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>تفعيل وضع عدم الإزعاج</Label>
              <p className="text-sm text-muted-foreground">
                إيقاف الإشعارات الصوتية في أوقات محددة
              </p>
            </div>
            <Switch
              checked={settings.quietHours.enabled}
              onCheckedChange={(enabled) => 
                setQuietHours({ ...settings.quietHours, enabled })
              }
            />
          </div>

          {settings.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>من الساعة</Label>
                <Input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) => 
                    setQuietHours({ ...settings.quietHours, start: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>إلى الساعة</Label>
                <Input
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) => 
                    setQuietHours({ ...settings.quietHours, end: e.target.value })
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority Settings */}
      <Card>
        <CardHeader>
          <CardTitle>أولوية الإشعارات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-destructive font-medium">عاجل</Label>
              <Select
                value={settings.priority.high}
                onValueChange={(value: any) => 
                  setPriority({ ...settings.priority, high: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sound_popup">صوت + إشعار منبثق</SelectItem>
                  <SelectItem value="popup">إشعار منبثق فقط</SelectItem>
                  <SelectItem value="badge">شارة فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-orange-500 font-medium">عادي</Label>
              <Select
                value={settings.priority.medium}
                onValueChange={(value: any) => 
                  setPriority({ ...settings.priority, medium: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popup">إشعار منبثق</SelectItem>
                  <SelectItem value="badge">شارة فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground font-medium">منخفض</Label>
              <Select
                value={settings.priority.low}
                onValueChange={(value: any) => 
                  setPriority({ ...settings.priority, low: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="badge">شارة فقط</SelectItem>
                  <SelectItem value="none">بدون إشعار</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 ml-2" />
          استعادة الافتراضي
        </Button>
      </div>
    </div>
  );
}
