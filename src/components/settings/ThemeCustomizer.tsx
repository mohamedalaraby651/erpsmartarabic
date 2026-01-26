import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { availableFonts, presetColors, applyTheme, ThemeConfig } from '@/lib/themeManager';
import { Sun, Moon, Monitor, Palette, Type, Maximize2, RotateCcw, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LivePreviewCard } from './LivePreviewCard';
import { ResetSettingsButton } from './ResetSettingsButton';

interface ThemeCustomizerProps {
  onDataChange?: () => void;
}

// Theme presets
const themePresets = [
  { 
    name: 'كلاسيكي أزرق', 
    primary: '#2563eb', 
    accent: '#8b5cf6',
    description: 'الثيم الافتراضي'
  },
  { 
    name: 'أخضر طبيعي', 
    primary: '#16a34a', 
    accent: '#14b8a6',
    description: 'هادئ ومريح للعين'
  },
  { 
    name: 'برتقالي دافئ', 
    primary: '#ea580c', 
    accent: '#f59e0b',
    description: 'حيوي ونشيط'
  },
  { 
    name: 'أحمر أنيق', 
    primary: '#dc2626', 
    accent: '#e11d48',
    description: 'جريء ومميز'
  },
  { 
    name: 'بنفسجي ملكي', 
    primary: '#7c3aed', 
    accent: '#a855f7',
    description: 'فخم وراقي'
  },
];

export function ThemeCustomizer({ onDataChange }: ThemeCustomizerProps) {
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  
  const [localConfig, setLocalConfig] = useState({
    theme: preferences.theme || 'system',
    primary_color: preferences.primary_color || '#2563eb',
    accent_color: preferences.accent_color || '#8b5cf6',
    font_family: preferences.font_family || 'Cairo',
    font_size: preferences.font_size || 'medium',
    sidebar_compact: preferences.sidebar_compact || false,
  });

  useEffect(() => {
    setLocalConfig({
      theme: preferences.theme || 'system',
      primary_color: preferences.primary_color || '#2563eb',
      accent_color: preferences.accent_color || '#8b5cf6',
      font_family: preferences.font_family || 'Cairo',
      font_size: preferences.font_size || 'medium',
      sidebar_compact: preferences.sidebar_compact || false,
    });
  }, [preferences]);

  // Apply changes locally for preview
  const handleChange = (key: string, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onDataChange?.();
    
    // Apply immediately for preview
    const themeConfig: Partial<ThemeConfig> = {};
    if (key === 'theme') themeConfig.theme = value;
    if (key === 'primary_color') themeConfig.primaryColor = value;
    if (key === 'accent_color') themeConfig.accentColor = value;
    if (key === 'font_family') themeConfig.fontFamily = value;
    if (key === 'font_size') themeConfig.fontSize = value;
    if (key === 'sidebar_compact') themeConfig.sidebarCompact = value;
    
    applyTheme(themeConfig);
  };

  const applyPreset = (preset: typeof themePresets[0]) => {
    handleChange('primary_color', preset.primary);
    setTimeout(() => handleChange('accent_color', preset.accent), 50);
    toast.success(`تم تطبيق ثيم "${preset.name}"`);
  };

  const handleSave = () => {
    updatePreferences(localConfig);
    toast.success('تم حفظ إعدادات المظهر');
  };

  const handleReset = () => {
    const defaultConfig = {
      theme: 'system',
      primary_color: '#2563eb',
      accent_color: '#8b5cf6',
      font_family: 'Cairo',
      font_size: 'medium',
      sidebar_compact: false,
    };
    setLocalConfig(defaultConfig);
    onDataChange?.();
    applyTheme({
      theme: 'system',
      primaryColor: '#2563eb',
      accentColor: '#8b5cf6',
      fontFamily: 'Cairo',
      fontSize: 'medium',
      sidebarCompact: false,
    });
  };

  const themeModes = [
    { value: 'light', label: 'فاتح', icon: Sun },
    { value: 'dark', label: 'داكن', icon: Moon },
    { value: 'system', label: 'تلقائي', icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      {/* Theme Mode */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="h-5 w-5 text-primary" />
            وضع العرض
          </CardTitle>
          <CardDescription>اختر وضع العرض المناسب لك</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeModes.map((mode) => {
              const Icon = mode.icon;
              const isActive = localConfig.theme === mode.value;
              return (
                <button
                  key={mode.value}
                  onClick={() => handleChange('theme', mode.value)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all touch-target',
                    isActive 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  {isActive && (
                    <div className="absolute top-2 left-2">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <Icon className={cn('h-6 w-6', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', isActive && 'text-primary')}>
                    {mode.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Theme Presets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-primary" />
            ثيمات جاهزة
          </CardTitle>
          <CardDescription>اختر ثيم جاهز أو خصص الألوان</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {themePresets.map((preset) => {
              const isActive = localConfig.primary_color === preset.primary && 
                               localConfig.accent_color === preset.accent;
              return (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    'p-3 rounded-xl border-2 transition-all text-center touch-target',
                    isActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-primary/50'
                  )}
                >
                  <div className="flex justify-center gap-1 mb-2">
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm -mr-2"
                      style={{ backgroundColor: preset.accent }}
                    />
                  </div>
                  <p className="text-xs font-medium">{preset.name}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">تخصيص الألوان</CardTitle>
          <CardDescription>اختر ألوانك المفضلة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Color */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">اللون الأساسي</Label>
              <div 
                className="h-6 w-6 rounded-full border shadow-sm"
                style={{ backgroundColor: localConfig.primary_color }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleChange('primary_color', color.value)}
                  className={cn(
                    'w-10 h-10 rounded-full border-2 transition-all relative touch-target',
                    localConfig.primary_color === color.value 
                      ? 'border-foreground scale-110 ring-2 ring-offset-2 ring-foreground/20' 
                      : 'border-transparent hover:scale-105 hover:border-muted-foreground/30'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                >
                  {localConfig.primary_color === color.value && (
                    <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow-md" />
                  )}
                </button>
              ))}
              <div className="relative">
                <Input
                  type="color"
                  value={localConfig.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="w-10 h-10 p-0.5 border-2 border-dashed cursor-pointer rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">لون التمييز</Label>
              <div 
                className="h-6 w-6 rounded-full border shadow-sm"
                style={{ backgroundColor: localConfig.accent_color }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleChange('accent_color', color.value)}
                  className={cn(
                    'w-10 h-10 rounded-full border-2 transition-all relative touch-target',
                    localConfig.accent_color === color.value 
                      ? 'border-foreground scale-110 ring-2 ring-offset-2 ring-foreground/20' 
                      : 'border-transparent hover:scale-105 hover:border-muted-foreground/30'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                >
                  {localConfig.accent_color === color.value && (
                    <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow-md" />
                  )}
                </button>
              ))}
              <div className="relative">
                <Input
                  type="color"
                  value={localConfig.accent_color}
                  onChange={(e) => handleChange('accent_color', e.target.value)}
                  className="w-10 h-10 p-0.5 border-2 border-dashed cursor-pointer rounded-full"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <LivePreviewCard
        primaryColor={localConfig.primary_color}
        accentColor={localConfig.accent_color}
        fontFamily={localConfig.font_family}
        fontSize={localConfig.font_size}
        theme={localConfig.theme}
      />

      {/* Typography */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Type className="h-5 w-5 text-primary" />
            الخطوط والأحجام
          </CardTitle>
          <CardDescription>اختر نوع وحجم الخط المناسب</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>نوع الخط</Label>
              <Select
                value={localConfig.font_family}
                onValueChange={(value) => handleChange('font_family', value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableFonts.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>حجم الخط</Label>
              <Select
                value={localConfig.font_size}
                onValueChange={(value) => handleChange('font_size', value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">صغير</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="large">كبير</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Font Preview */}
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">معاينة الخط</p>
            <p 
              className={cn(
                'font-medium',
                localConfig.font_size === 'small' && 'text-sm',
                localConfig.font_size === 'medium' && 'text-base',
                localConfig.font_size === 'large' && 'text-lg'
              )}
              style={{ fontFamily: localConfig.font_family }}
            >
              هذا نص تجريبي لمعاينة الخط المختار - 1234567890
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Layout */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Maximize2 className="h-5 w-5 text-primary" />
            التخطيط
          </CardTitle>
          <CardDescription>تخصيص تخطيط وعرض الواجهة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
            <div className="space-y-0.5">
              <Label className="text-base cursor-pointer">القائمة الجانبية المضغوطة</Label>
              <p className="text-sm text-muted-foreground">
                عرض الأيقونات فقط بدلاً من النص الكامل
              </p>
            </div>
            <Switch
              checked={localConfig.sidebar_compact}
              onCheckedChange={(checked) => handleChange('sidebar_compact', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <div className="space-y-0.5">
              <Label className="text-base text-muted-foreground">التنسيق التلقائي للجوال</Label>
              <p className="text-sm text-muted-foreground">
                تحويل الجداول لبطاقات على الشاشات الصغيرة
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">مفعّل تلقائياً</span>
              <Switch checked={true} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-between sticky bottom-0 bg-background py-4 border-t -mx-4 px-4 md:mx-0 md:px-0 md:border-0 md:bg-transparent md:py-0">
        <ResetSettingsButton 
          onReset={handleReset} 
          sectionName="المظهر"
        />
        <Button onClick={handleSave} disabled={isUpdating} className="gap-2 min-w-[120px]">
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            'حفظ التغييرات'
          )}
        </Button>
      </div>
    </div>
  );
}
