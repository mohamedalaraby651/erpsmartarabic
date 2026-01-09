import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, AlertTriangle, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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

export function SettingsExportImport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ExportedSettings | null>(null);

  const handleExport = async () => {
    if (!user?.id) return;
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
        preferences: preferences ? {
          theme: preferences.theme || undefined,
          primary_color: preferences.primary_color || undefined,
          accent_color: preferences.accent_color || undefined,
          font_family: preferences.font_family || undefined,
          font_size: preferences.font_size || undefined,
          sidebar_compact: preferences.sidebar_compact || undefined,
          sidebar_order: preferences.sidebar_order as string[] | undefined,
          favorite_pages: preferences.favorite_pages as string[] | undefined,
          collapsed_sections: preferences.collapsed_sections as string[] | undefined,
          notification_settings: preferences.notification_settings as Record<string, unknown> | undefined,
          table_settings: preferences.table_settings as Record<string, unknown> | undefined,
        } : {},
        dashboardSettings: dashboardSettings ? {
          widgets: typeof dashboardSettings.widgets === 'string' 
            ? JSON.parse(dashboardSettings.widgets)
            : dashboardSettings.widgets as unknown[],
        } : undefined,
      };

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

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            تصدير الإعدادات
          </CardTitle>
          <CardDescription>
            تصدير جميع إعداداتك الشخصية كملف JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm">سيتم تصدير:</p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>إعدادات المظهر (الثيم، الألوان، الخطوط)</li>
              <li>تخصيص القائمة الجانبية</li>
              <li>الصفحات المفضلة</li>
              <li>إعدادات الإشعارات</li>
              <li>إعدادات الجداول</li>
              <li>تخصيص لوحة التحكم</li>
            </ul>
          </div>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 ml-2" />
            {isExporting ? "جاري التصدير..." : "تصدير الإعدادات"}
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            استيراد الإعدادات
          </CardTitle>
          <CardDescription>
            استيراد إعدادات من ملف JSON تم تصديره مسبقاً
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">تحذير</p>
              <p className="text-amber-600 dark:text-amber-500">
                سيتم استبدال جميع إعداداتك الحالية بالإعدادات المستوردة
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="import-file">اختر ملف الإعدادات</Label>
            <Input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="mt-1"
            />
          </div>

          {importPreview && (
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-700 dark:text-green-400">
                  ملف صالح
                </span>
              </div>
              <div className="text-sm space-y-1">
                <p>الإصدار: {importPreview.version}</p>
                <p>تاريخ التصدير: {new Date(importPreview.exportedAt).toLocaleString("ar-EG")}</p>
                <p>الثيم: {importPreview.preferences.theme || "افتراضي"}</p>
                <p>الصفحات المفضلة: {importPreview.preferences.favorite_pages?.length || 0}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleImport} disabled={isImporting}>
                  <Upload className="h-4 w-4 ml-2" />
                  {isImporting ? "جاري الاستيراد..." : "تأكيد الاستيراد"}
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
