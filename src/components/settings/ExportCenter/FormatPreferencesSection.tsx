import { FileSpreadsheet, Languages } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useExportSettings,
  type CsvDelimiter,
  type DefaultExportFormat,
  type ExportLanguage,
} from '@/hooks/useExportSettings';

export function FormatPreferencesSection() {
  const { settings, update } = useExportSettings();

  const sampleRow = ['INV-001', 'أحمد محمد', '1,250.00', '2026-05-25'];
  const sep = settings.csvDelimiter;
  const preview = (settings.includeBom ? '\uFEFF' : '') + sampleRow.join(sep);

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            تنسيقات التصدير
          </CardTitle>
          <CardDescription>
            هذه الخيارات تنطبق على ملفات Excel و CSV التي يصدّرها النظام من القوائم والتقارير.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label>الصيغة الافتراضية للتصدير</Label>
            <Select
              value={settings.defaultFormat}
              onValueChange={(v) => update({ defaultFormat: v as DefaultExportFormat })}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              يُستخدم عند الضغط على زر «تصدير» السريع بدون اختيار صيغة.
            </p>
          </div>

          <div className="grid gap-2">
            <Label>فاصل أعمدة CSV</Label>
            <Select
              value={settings.csvDelimiter}
              onValueChange={(v) => update({ csvDelimiter: v as CsvDelimiter })}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=",">فاصلة ( , ) — متوافق دولياً</SelectItem>
                <SelectItem value=";">فاصلة منقوطة ( ; ) — Excel عربي/أوروبي</SelectItem>
                <SelectItem value={'\t'}>Tab — للنسخ المباشر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">إضافة BOM لـ UTF-8</Label>
              <p className="text-xs text-muted-foreground">
                يحلّ مشكلة ظهور العربية كرموز ؟؟؟ عند فتح CSV في Excel.
              </p>
            </div>
            <Switch
              checked={settings.includeBom}
              onCheckedChange={(c) => update({ includeBom: c })}
            />
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              لغة رؤوس الأعمدة
            </Label>
            <Select
              value={settings.language}
              onValueChange={(v) => update({ language: v as ExportLanguage })}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">معاينة صف CSV:</p>
            <code className="block text-sm font-mono break-all" dir="ltr">
              {preview.replace('\t', '⇥').replace('\uFEFF', '⟨BOM⟩')}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FormatPreferencesSection;
