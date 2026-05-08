import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Info,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { MODE_LABELS, type RestoreMode } from './restoreBackup.constants';

interface SelectedRow {
  name: string;
  label: string;
  count: number;
  totalInFile: number;
  truncated: number;
  isSensitive: boolean;
}

interface Props {
  file: File | null;
  mode: RestoreMode;
  hasSensitiveSelected: boolean;
  selectedSummary: SelectedRow[];
  totalSelectedRows: number;
  rowLimits: Record<string, number | undefined>;
  setRowLimit: (table: string, value: string) => void;
  finalConfirmRequired: boolean;
  finalConfirmText: string;
  setFinalConfirmText: (v: string) => void;
}

/**
 * Step 2 of RestoreBackupDialog — pure presentational view of the
 * "review before commit" screen. Extracted to keep the parent file lean.
 */
export function RestoreBackupReviewView({
  file,
  mode,
  hasSensitiveSelected,
  selectedSummary,
  totalSelectedRows,
  rowLimits,
  setRowLimit,
  finalConfirmRequired,
  finalConfirmText,
  setFinalConfirmText,
}: Props) {
  const modeMeta = MODE_LABELS[mode];

  return (
    <>
      {/* File info */}
      <div className="rounded-md border p-3 space-y-1">
        <div className="text-xs text-muted-foreground">الملف المصدر</div>
        <div className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {file?.name}
          <span className="text-xs text-muted-foreground font-normal">
            ({((file?.size ?? 0) / 1024).toFixed(1)} KB)
          </span>
        </div>
      </div>

      {/* Mode summary */}
      <Alert
        variant={modeMeta.tone === 'destructive' ? 'destructive' : 'default'}
        className={
          modeMeta.tone === 'warning'
            ? 'border-warning/50 bg-warning/5 text-foreground'
            : undefined
        }
      >
        {modeMeta.tone === 'destructive' ? (
          <AlertTriangle className="h-4 w-4" />
        ) : modeMeta.tone === 'warning' ? (
          <Info className="h-4 w-4" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        <AlertTitle>طريقة الاستعادة: {modeMeta.title}</AlertTitle>
        <AlertDescription className="text-xs">{modeMeta.effect}</AlertDescription>
      </Alert>

      {/* Sensitive selection warning */}
      {hasSensitiveSelected && (
        <Alert className="border-warning/50 bg-warning/5">
          <ShieldAlert className="h-4 w-4 text-warning" />
          <AlertTitle>الاستعادة تشمل جداول حساسة</AlertTitle>
          <AlertDescription className="text-xs">
            تم تفعيل خيار الجداول الحساسة. الخادم سيتحقق مرة أخرى أنك مدير منصة
            قبل تنفيذ هذه الاستعادة.
          </AlertDescription>
        </Alert>
      )}

      {/* Tables summary with optional row caps */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>الجداول التي سيتم استعادتها ({selectedSummary.length})</Label>
          <Badge variant="secondary" className="text-xs">
            الإجمالي الفعلي: {totalSelectedRows} سجل
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          يمكنك تحديد حد أقصى للسجلات المستعادة من كل جدول (يُؤخذ أول N سجل من الملف).
          اتركه فارغاً لاستعادة الكل.
        </p>
        <div className="border rounded-md divide-y max-h-64 overflow-auto">
          {selectedSummary.map((t) => (
            <div key={t.name} className="px-3 py-2 space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                {t.isSensitive ? (
                  <ShieldAlert className="h-3.5 w-3.5 text-warning" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                )}
                <span className="flex-1">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.name}</span>
                {t.isSensitive && (
                  <Badge variant="outline" className="text-[10px] border-warning text-warning">
                    حساس
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {t.count} / {t.totalInFile} سجل
                </Badge>
              </div>
              <div className="flex items-center gap-2 mr-6">
                <Label htmlFor={`limit-${t.name}`} className="text-[11px] text-muted-foreground">
                  حد أقصى:
                </Label>
                <Input
                  id={`limit-${t.name}`}
                  type="number"
                  min={1}
                  max={t.totalInFile}
                  placeholder={`${t.totalInFile} (الكل)`}
                  value={rowLimits[t.name] ?? ''}
                  onChange={(e) => setRowLimit(t.name, e.target.value)}
                  className="h-7 w-32 text-xs"
                />
                {t.truncated > 0 && (
                  <span className="text-[11px] text-warning">
                    سيتم تخطّي {t.truncated} سجل
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expected impact */}
      <div className="space-y-2">
        <Label>التغييرات المتوقعة</Label>
        <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1.5">
          {mode === 'append' && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">إدراج</Badge>
                <span>حتى {totalSelectedRows} سجل جديد عبر {selectedSummary.length} جدول.</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">تجاهل</Badge>
                <span>السجلات بمعرّفات موجودة مسبقاً سيتم تخطّيها بصمت.</span>
              </div>
            </>
          )}
          {mode === 'upsert' && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">إدراج / تحديث</Badge>
                <span>حتى {totalSelectedRows} عملية إدراج أو تحديث (مطابقة بالمعرّف).</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-warning text-warning">تنبيه</Badge>
                <span>السجلات الموجودة سيتم استبدال حقولها بالقيم من الملف.</span>
              </div>
            </>
          )}
          {mode === 'replace' && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">حذف</Badge>
                <span>كل سجلات الجداول المختارة لحسابك الحالي سيتم حذفها.</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">إدراج</Badge>
                <span>{totalSelectedRows} سجل جديد سيُدرج من الملف.</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">لا تراجع</Badge>
                <span>لا يمكن التراجع عن هذه العملية بعد التأكيد.</span>
              </div>
            </>
          )}
          <Separator className="my-2" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>سيتم إعادة كتابة tenant_id لكل سجل ليطابق حسابك الحالي تلقائياً.</span>
          </div>
        </div>
      </div>

      {/* Final confirmation for destructive mode */}
      {finalConfirmRequired && (
        <div className="space-y-2">
          <Label htmlFor="final-confirm" className="text-destructive">
            للتأكيد النهائي، اكتب كلمة <span className="font-mono">استعادة</span>
          </Label>
          <Input
            id="final-confirm"
            value={finalConfirmText}
            onChange={(e) => setFinalConfirmText(e.target.value)}
            placeholder="استعادة"
            autoComplete="off"
            dir="rtl"
          />
        </div>
      )}
    </>
  );
}
