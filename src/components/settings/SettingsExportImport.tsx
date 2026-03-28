import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, AlertTriangle, CheckCircle, FileJson, Settings2, Loader2 } from "lucide-react";
import { logErrorSafely } from "@/lib/errorHandler";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface ExportedSettings {
  version: string;
  exportedAt: string;
  userId: string;
  preferences: {
    theme?: string;
    primary_color?: string;
    accent_color?: string;
    font_family?: string;
    font_size?: string;
    sidebar_compact?: boolean;
    sidebar_order?: string[];
    favorite_pages?: string[];
    collapsed_sections?: string[];
    notification_settings?: Record<string, unknown>;
    table_settings?: Record<string, unknown>;
  };
  dashboardSettings?: {
    widgets: unknown[];
  };
}

const exportOptions = [
  { id: 'appearance', label: 'إعدادات المظهر', description: 'الثيم، الألوان، الخطوط' },
  { id: 'sidebar', label: 'تخصيص القائمة', description: 'ترتيب وتفضيلات القائمة الجانبية' },
  { id: 'favorites', label: 'الصفحات المفضلة', description: 'قائمة الصفحات المفضلة' },
  { id: 'notifications', label: 'إعدادات الإشعارات', description: 'تفضيلات التنبيهات' },
  { id: 'tables', label: 'إعدادات الجداول', description: 'تخصيص عرض الجداول' },
  { id: 'dashboard', label: 'لوحة التحكم', description: 'ترتيب الويدجت' },
];

export function SettingsExportImport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ExportedSettings | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>(exportOptions.map(o => o.id));

  const toggleOption = (optionId: string) => {
    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleExport = async () => {
    if (!user?.id) return;
    if (selectedOptions.length === 0) {
      toast({ title: 'اختر إعداداً واحداً على الأقل للتصدير', variant: 'destructive' });
      return;
    }
    setIsExporting(true);

    try {
      // Fetch user preferences
      const { data: preferences } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // Fetch dashboard settings
      const { data: dashboardSettings } = await supabase
        .from("user_dashboard_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const exportData: ExportedSettings = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        userId: user.id,
        preferences: {},
        dashboardSettings: undefined,
      };

      // Build preferences based on selected options
      if (preferences) {
        if (selectedOptions.includes('appearance')) {
          exportData.preferences.theme = preferences.theme || undefined;
          exportData.preferences.primary_color = preferences.primary_color || undefined;
          exportData.preferences.accent_color = preferences.accent_color || undefined;
          exportData.preferences.font_family = preferences.font_family || undefined;
          exportData.preferences.font_size = preferences.font_size || undefined;
          exportData.preferences.sidebar_compact = preferences.sidebar_compact || undefined;
        }
        if (selectedOptions.includes('sidebar')) {
          exportData.preferences.sidebar_order = preferences.sidebar_order as string[] | undefined;
          exportData.preferences.collapsed_sections = preferences.collapsed_sections as string[] | undefined;
        }
        if (selectedOptions.includes('favorites')) {
          exportData.preferences.favorite_pages = preferences.favorite_pages as string[] | undefined;
        }
        if (selectedOptions.includes('notifications')) {
          exportData.preferences.notification_settings = preferences.notification_settings as Record<string, unknown> | undefined;
        }
        if (selectedOptions.includes('tables')) {
          exportData.preferences.table_settings = preferences.table_settings as Record<string, unknown> | undefined;
        }
      }

      if (selectedOptions.includes('dashboard') && dashboardSettings) {
        exportData.dashboardSettings = {
          widgets: typeof dashboardSettings.widgets === 'string' 
            ? JSON.parse(dashboardSettings.widgets)
            : dashboardSettings.widgets as unknown[],
        };
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `settings-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "تم تصدير الإعدادات بنجاح" });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "حدث خطأ أثناء التصدير", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Validate structure
        if (!data.version || !data.preferences) {
          throw new Error("Invalid file format");
        }

        setImportPreview(data);
      } catch (error) {
        toast({ title: "ملف غير صالح", variant: "destructive" });
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!user?.id || !importPreview) return;
    setIsImporting(true);

    try {
      // Update user preferences
      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const preferencesData = {
        user_id: user.id,
        theme: importPreview.preferences.theme,
        primary_color: importPreview.preferences.primary_color,
        accent_color: importPreview.preferences.accent_color,
        font_family: importPreview.preferences.font_family,
        font_size: importPreview.preferences.font_size,
        sidebar_compact: importPreview.preferences.sidebar_compact,
        sidebar_order: importPreview.preferences.sidebar_order ? JSON.stringify(importPreview.preferences.sidebar_order) : null,
        favorite_pages: importPreview.preferences.favorite_pages ? JSON.stringify(importPreview.preferences.favorite_pages) : null,
        collapsed_sections: importPreview.preferences.collapsed_sections ? JSON.stringify(importPreview.preferences.collapsed_sections) : null,
        notification_settings: importPreview.preferences.notification_settings ? JSON.stringify(importPreview.preferences.notification_settings) : null,
        table_settings: importPreview.preferences.table_settings ? JSON.stringify(importPreview.preferences.table_settings) : null,
      };

      if (existing) {
        await supabase
          .from("user_preferences")
          .update(preferencesData)
          .eq("user_id", user.id);
      } else {
        await supabase.from("user_preferences").insert([preferencesData]);
      }

      // Update dashboard settings if present
      if (importPreview.dashboardSettings) {
        await supabase
          .from("user_dashboard_settings")
          .upsert([{
            user_id: user.id,
            widgets: JSON.stringify(importPreview.dashboardSettings.widgets),
          }], { onConflict: "user_id" });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-settings"] });

      toast({ title: "تم استيراد الإعدادات بنجاح" });
      setImportPreview(null);

      // Reload page to apply theme
      window.location.reload();
    } catch (error) {
      console.error("Import error:", error);
      toast({ title: "حدث خطأ أثناء الاستيراد", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const getImportPreviewItems = () => {
    if (!importPreview) return [];
    const items = [];
    
    if (importPreview.preferences.theme) items.push(`الثيم: ${importPreview.preferences.theme}`);
    if (importPreview.preferences.primary_color) items.push('الألوان المخصصة');
    if (importPreview.preferences.font_family) items.push(`الخط: ${importPreview.preferences.font_family}`);
    if (importPreview.preferences.favorite_pages?.length) items.push(`${importPreview.preferences.favorite_pages.length} صفحة مفضلة`);
    if (importPreview.dashboardSettings?.widgets?.length) items.push(`${importPreview.dashboardSettings.widgets.length} ويدجت`);
    
    return items;
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            تصدير الإعدادات
          </CardTitle>
          <CardDescription>
            اختر الإعدادات التي تريد تصديرها
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exportOptions.map((option) => (
              <label
                key={option.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all touch-target',
                  selectedOptions.includes(option.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                )}
              >
                <Checkbox
                  checked={selectedOptions.includes(option.id)}
                  onCheckedChange={() => toggleOption(option.id)}
                  className="mt-0.5"
                />
                <div>
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleExport} disabled={isExporting || selectedOptions.length === 0}>
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري التصدير...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 ml-2" />
                  تصدير ({selectedOptions.length})
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedOptions(exportOptions.map(o => o.id))}
            >
              تحديد الكل
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedOptions([])}
            >
              إلغاء التحديد
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            استيراد الإعدادات
          </CardTitle>
          <CardDescription>
            استيراد إعدادات من ملف JSON تم تصديره مسبقاً
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">تحذير</p>
              <p className="text-amber-600 dark:text-amber-500">
                سيتم استبدال الإعدادات الموجودة في الملف بالإعدادات الحالية
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-file">اختر ملف الإعدادات</Label>
            <div className="flex gap-2">
              <Input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="flex-1"
              />
            </div>
          </div>

          {importPreview && (
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-700 dark:text-green-400">
                  ملف صالح للاستيراد
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-muted-foreground" />
                  <span>الإصدار: {importPreview.version}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span>التاريخ: {new Date(importPreview.exportedAt).toLocaleDateString("ar-EG")}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">سيتم استيراد:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {getImportPreviewItems().map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      جاري الاستيراد...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 ml-2" />
                      تأكيد الاستيراد
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setImportPreview(null)}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
