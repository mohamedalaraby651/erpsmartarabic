import { type RefObject } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  ShieldCheck,
  FileText,
  AlertTriangle,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { SENSITIVE_TABLE_NAMES, type RestoreMode } from './restoreBackup.constants';

interface FileBucketEntry {
  name: string;
  label: string;
  count: number;
}

interface FileBuckets {
  regular: FileBucketEntry[];
  sensitive: FileBucketEntry[];
  forbidden: string[];
  unknown: string[];
}

interface Props {
  fileInputRef: RefObject<HTMLInputElement>;
  file: File | null;
  isParsing: boolean;
  isRestoring: boolean;
  parsed: unknown;
  fileBuckets: FileBuckets;
  ignoredKeys: string[];
  selectedTables: string[];
  setSelectedTables: React.Dispatch<React.SetStateAction<string[]>>;
  toggleTable: (name: string) => void;
  allowSensitive: boolean;
  toggleAllowSensitive: (next: boolean) => void;
  hasSensitiveSelected: boolean;
  confirmSensitive: boolean;
  setConfirmSensitive: (v: boolean) => void;
  mode: RestoreMode;
  setMode: (m: RestoreMode) => void;
  confirmReplace: boolean;
  setConfirmReplace: (v: boolean) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function RestoreBackupConfigureView({
  fileInputRef,
  file,
  isParsing,
  isRestoring,
  parsed,
  fileBuckets,
  ignoredKeys,
  selectedTables,
  setSelectedTables,
  toggleTable,
  allowSensitive,
  toggleAllowSensitive,
  hasSensitiveSelected,
  confirmSensitive,
  setConfirmSensitive,
  mode,
  setMode,
  confirmReplace,
  setConfirmReplace,
  onFileChange,
}: Props) {
  return (
    <>
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>أمان الاستعادة</AlertTitle>
        <AlertDescription className="text-xs">
          يتم إعادة كتابة معرّف المستأجر (tenant_id) لكل سجل تلقائياً ليطابق حسابك الحالي.
          لا يمكن حقن بيانات لمستأجر آخر، حتى لو تم تعديل الملف يدوياً.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="backup-file">الملف</Label>
        <input
          ref={fileInputRef}
          id="backup-file"
          type="file"
          accept=".json,.sql,.xlsx,.xls"
          onChange={onFileChange}
          className="block w-full text-sm file:ml-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground hover:file:bg-primary/90"
          disabled={isParsing || isRestoring}
        />
        {file && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {file.name} — {(file.size / 1024).toFixed(1)} KB
          </p>
        )}
        {isParsing && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> جاري تحليل الملف…
          </p>
        )}
      </div>

      {parsed && (fileBuckets.regular.length > 0 || fileBuckets.sensitive.length > 0) && (
        <>
          <Separator />

          {fileBuckets.forbidden.length > 0 && (
            <Alert variant="destructive">
              <Lock className="h-4 w-4" />
              <AlertTitle>جداول محظورة في الملف</AlertTitle>
              <AlertDescription className="text-xs space-y-1">
                <div>
                  تم اكتشاف {fileBuckets.forbidden.length} جدول لا يمكن استعادته من هذه الواجهة
                  مهما كانت صلاحياتك (حماية للنظام والتدقيق):
                </div>
                <code className="text-[11px] block bg-destructive/10 rounded p-2 break-all">
                  {fileBuckets.forbidden.join(', ')}
                </code>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>الجداول العادية ({fileBuckets.regular.length})</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSelectedTables((prev) => {
                      const keepSensitive = prev.filter((t) => SENSITIVE_TABLE_NAMES.has(t));
                      return [
                        ...new Set([
                          ...keepSensitive,
                          ...fileBuckets.regular.map((t) => t.name),
                        ]),
                      ];
                    })
                  }
                >
                  تحديد العادية
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTables([])}
                >
                  إلغاء التحديد
                </Button>
              </div>
            </div>
            <div className="border rounded-md divide-y max-h-48 overflow-auto">
              {fileBuckets.regular.map((t) => (
                <label
                  key={t.name}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={selectedTables.includes(t.name)}
                    onCheckedChange={() => toggleTable(t.name)}
                  />
                  <span className="flex-1 text-sm">{t.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {t.count} سجل
                  </Badge>
                </label>
              ))}
              {fileBuckets.regular.length === 0 && (
                <div className="px-3 py-3 text-xs text-muted-foreground">
                  لا توجد جداول عادية في هذا الملف.
                </div>
              )}
            </div>

            {ignoredKeys.length > 0 && (
              <p className="text-xs text-muted-foreground">
                تم تجاهل {ignoredKeys.length} عنصر غير معروف من الملف لأسباب أمنية.
              </p>
            )}
          </div>

          {fileBuckets.sensitive.length > 0 && (
            <>
              <Separator />
              <div className="rounded-md border border-warning/40 bg-warning/5 p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-warning mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium">
                      جداول حساسة في الملف ({fileBuckets.sensitive.length})
                    </div>
                    <p className="text-xs text-muted-foreground">
                      هذه الجداول تتحكم في الصلاحيات، الإعدادات، أو الفترات المالية.
                      استعادتها قد تؤثر على وصول المستخدمين أو دقة المحاسبة.
                      مخفية افتراضياً — يجب تفعيل الخيار صراحة، وتتطلب صلاحية مدير منصة عند التنفيذ.
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={allowSensitive}
                    onCheckedChange={(v) => toggleAllowSensitive(v === true)}
                  />
                  <span className="text-sm font-medium">
                    السماح بعرض واختيار الجداول الحساسة
                  </span>
                </label>

                {allowSensitive && (
                  <>
                    <div className="border rounded-md divide-y max-h-40 overflow-auto bg-background">
                      {fileBuckets.sensitive.map((t) => (
                        <label
                          key={t.name}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40"
                        >
                          <Checkbox
                            checked={selectedTables.includes(t.name)}
                            onCheckedChange={() => toggleTable(t.name)}
                          />
                          <ShieldAlert className="h-3.5 w-3.5 text-warning" />
                          <span className="flex-1 text-sm">{t.label}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {t.name}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {t.count} سجل
                          </Badge>
                        </label>
                      ))}
                    </div>

                    {hasSensitiveSelected && (
                      <label className="flex items-start gap-2 cursor-pointer rounded bg-warning/10 p-2">
                        <Checkbox
                          checked={confirmSensitive}
                          onCheckedChange={(v) => setConfirmSensitive(v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs">
                          أفهم أن استعادة هذه الجداول قد تغير صلاحيات المستخدمين أو
                          البيانات المرجعية، وقد تتطلب صلاحية مدير منصة على الخادم.
                        </span>
                      </label>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          <Separator />
          <div className="space-y-2">
            <Label>طريقة الاستعادة</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as RestoreMode)}>
              <div className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/40">
                <RadioGroupItem value="append" id="mode-append" className="mt-1" />
                <Label htmlFor="mode-append" className="flex-1 cursor-pointer font-normal">
                  <div className="font-medium text-sm">إلحاق فقط (Append)</div>
                  <div className="text-xs text-muted-foreground">
                    إدراج السجلات الجديدة فقط؛ تجاهل أي معرّف موجود مسبقاً. الأكثر أماناً.
                  </div>
                </Label>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/40">
                <RadioGroupItem value="upsert" id="mode-upsert" className="mt-1" />
                <Label htmlFor="mode-upsert" className="flex-1 cursor-pointer font-normal">
                  <div className="font-medium text-sm">دمج (Upsert)</div>
                  <div className="text-xs text-muted-foreground">
                    إدراج الجديد وتحديث الموجود حسب المعرّف. قد يستبدل بيانات حالية.
                  </div>
                </Label>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/40">
                <RadioGroupItem value="replace" id="mode-replace" className="mt-1" />
                <Label htmlFor="mode-replace" className="flex-1 cursor-pointer font-normal">
                  <div className="font-medium text-sm text-destructive">
                    استبدال كامل (Replace)
                  </div>
                  <div className="text-xs text-muted-foreground">
                    حذف كل سجلات الجداول المختارة لحسابك الحالي ثم إعادة الإدراج. خطر.
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {mode === 'replace' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>تأكيد الاستبدال الكامل</AlertTitle>
                <AlertDescription>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <Checkbox
                      checked={confirmReplace}
                      onCheckedChange={(v) => setConfirmReplace(v === true)}
                    />
                    <span className="text-sm">
                      أفهم أن كل البيانات الحالية في {selectedTables.length} جدول ستُحذف
                      ولا يمكن التراجع.
                    </span>
                  </label>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </>
      )}

      {parsed && fileBuckets.regular.length === 0 && fileBuckets.sensitive.length === 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            لم يتم العثور على أي جدول قابل للاستعادة في الملف. تأكد من أن الملف صادر من هذا النظام.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
