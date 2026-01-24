import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { availableFonts, presetColors, applyTheme, ThemeConfig } from '@/lib/themeManager';
import { Sun, Moon, Monitor, Palette, Type, Maximize2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export function ThemeCustomizer() {
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
    applyTheme({
      theme: 'system',
      primaryColor: '#2563eb',
      accentColor: '#8b5cf6',
      fontFamily: 'Cairo',
      fontSize: 'medium',
      sidebarCompact: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Theme Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            وضع العرض
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={localConfig.theme === 'light' ? 'default' : 'outline'}
              onClick={() => handleChange('theme', 'light')}
              className="flex-1"
            >
              <Sun className="h-4 w-4 ml-2" />
              فاتح
            </Button>
            <Button
              variant={localConfig.theme === 'dark' ? 'default' : 'outline'}
              onClick={() => handleChange('theme', 'dark')}
              className="flex-1"
            >
              <Moon className="h-4 w-4 ml-2" />
              داكن
            </Button>
            <Button
              variant={localConfig.theme === 'system' ? 'default' : 'outline'}
              onClick={() => handleChange('theme', 'system')}
              className="flex-1"
            >
              <Monitor className="h-4 w-4 ml-2" />
              تلقائي
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            الألوان
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary Color */}
          <div className="space-y-2">
            <Label>اللون الأساسي</Label>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleChange('primary_color', color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    localConfig.primary_color === color.value 
                      ? 'border-foreground scale-110' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
              <div className="relative">
                <Input
                  type="color"
                  value={localConfig.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="w-8 h-8 p-0 border-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <Label>لون التمييز</Label>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleChange('accent_color', color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    localConfig.accent_color === color.value 
                      ? 'border-foreground scale-110' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
              <div className="relative">
                <Input
                  type="color"
                  value={localConfig.accent_color}
                  onChange={(e) => handleChange('accent_color', e.target.value)}
                  className="w-8 h-8 p-0 border-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            الخطوط والأحجام
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>نوع الخط</Label>
              <Select
                value={localConfig.font_family}
                onValueChange={(value) => handleChange('font_family', value)}
              >
                <SelectTrigger>
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
                <SelectTrigger>
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
        </CardContent>
      </Card>

      {/* Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Maximize2 className="h-5 w-5" />
            التخطيط
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>القائمة الجانبية المضغوطة</Label>
              <p className="text-sm text-muted-foreground">
                عرض الأيقونات فقط بدلاً من النص الكامل
              </p>
            </div>
            <Switch
              checked={localConfig.sidebar_compact}
              onCheckedChange={(checked) => handleChange('sidebar_compact', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between opacity-50">
            <div className="space-y-0.5">
              <Label>عرض الإحصائيات في الرأس</Label>
              <p className="text-sm text-muted-foreground">
                إظهار بطاقات الإحصائيات السريعة (قريباً)
              </p>
            </div>
            <Switch
              checked={true}
              disabled
            />
          </div>
          
          <div className="flex items-center justify-between opacity-50">
            <div className="space-y-0.5">
              <Label>التنسيق التلقائي للجوال</Label>
              <p className="text-sm text-muted-foreground">
                تحويل الجداول لبطاقات على الشاشات الصغيرة (قريباً)
              </p>
            </div>
            <Switch
              checked={true}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 ml-2" />
          استعادة الافتراضي
        </Button>
        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </Button>
      </div>
    </div>
  );
}
