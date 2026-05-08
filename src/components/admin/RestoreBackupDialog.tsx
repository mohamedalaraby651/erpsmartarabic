import { useState, useRef, useMemo } from 'react';
import { getSafeErrorMessage } from '@/lib/errorHandler';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, AlertTriangle, ShieldCheck, FileText, ArrowRight, CheckCircle2, Info, Download, XCircle, AlertCircle, RotateCcw, History, ShieldAlert, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseBackupFile, type ParsedBackup } from '@/lib/services/backupRestoreParser';
import {
  buildLogText,
  classifyError,
  downloadJsonReport,
  downloadLog,
  summarize,
  type RestoreReportInput,
} from '@/lib/services/backupRestoreReport';
import {
  SENSITIVE_TABLE_NAMES,
  FORBIDDEN_TABLE_NAMES,
  MODE_LABELS,
  type RestoreMode,
  type RestoreStep as Step,
  type RestoreResult,
} from './restoreBackup.constants';
import { RestoreBackupResultsView } from './RestoreBackupResultsView';
import { RestoreBackupReviewView } from './RestoreBackupReviewView';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Map of table name → Arabic label, used to filter parsed sheets. */
  knownTables: { name: string; label: string }[];
}

export function RestoreBackupDialog({ open, onOpenChange, knownTables }: Props) {
  const [step, setStep] = useState<Step>('configure');
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [mode, setMode] = useState<RestoreMode>('append');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [finalConfirmText, setFinalConfirmText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [results, setResults] = useState<RestoreResult[] | null>(null);
  const [reportMeta, setReportMeta] = useState<{
    startedAt: Date;
    finishedAt: Date;
    tenantId?: string;
    snapshotId?: string;
    snapshotTotalRows?: number;
    totalRejectedForeignTenant?: number;
  } | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackDone, setRollbackDone] = useState(false);
  /** Opt-in: user wants to see + select sensitive tables. */
  const [allowSensitive, setAllowSensitive] = useState(false);
  /** Opt-in confirmation: user accepts the risk. */
  const [confirmSensitive, setConfirmSensitive] = useState(false);
  /** Per-table row caps. Undefined = no cap. 0 = none, N = first N. */
  const [rowLimits, setRowLimits] = useState<Record<string, number | undefined>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const knownTableNames = useMemo(() => new Set(knownTables.map((t) => t.name)), [knownTables]);

  // Tables present in the file. Split into three buckets:
  //   - regular   → safe business tables, shown by default
  //   - sensitive → shown only when allowSensitive is on
  //   - forbidden → never shown, just counted for the warning line
  const fileBuckets = useMemo(() => {
    if (!parsed) {
      return { regular: [] as { name: string; label: string; count: number }[], sensitive: [] as { name: string; label: string; count: number }[], forbidden: [] as string[], unknown: [] as string[] };
    }
    const regular: { name: string; label: string; count: number }[] = [];
    const sensitive: { name: string; label: string; count: number }[] = [];
    const forbidden: string[] = [];
    const unknown: string[] = [];
    for (const [k, rows] of Object.entries(parsed)) {
      const count = Array.isArray(rows) ? rows.length : 0;
      if (FORBIDDEN_TABLE_NAMES.has(k)) {
        forbidden.push(k);
        continue;
      }
      if (SENSITIVE_TABLE_NAMES.has(k)) {
        sensitive.push({ name: k, label: knownTables.find((t) => t.name === k)?.label ?? k, count });
        continue;
      }
      if (knownTableNames.has(k)) {
        regular.push({ name: k, label: knownTables.find((t) => t.name === k)?.label ?? k, count });
        continue;
      }
      unknown.push(k);
    }
    regular.sort((a, b) => a.label.localeCompare(b.label, 'ar'));
    sensitive.sort((a, b) => a.label.localeCompare(b.label, 'ar'));
    return { regular, sensitive, forbidden, unknown };
  }, [parsed, knownTables, knownTableNames]);

  // The list the user may actually pick from = regular + (sensitive if opted in).
  const availableTables = useMemo(() => {
    return allowSensitive
      ? [...fileBuckets.regular, ...fileBuckets.sensitive]
      : fileBuckets.regular;
  }, [fileBuckets, allowSensitive]);

  const ignoredKeys = useMemo(() => fileBuckets.unknown, [fileBuckets]);

  const hasSensitiveSelected = useMemo(
    () => selectedTables.some((t) => SENSITIVE_TABLE_NAMES.has(t)),
    [selectedTables],
  );

  const selectedSummary = useMemo(() => {
    if (!parsed) return [];
    return selectedTables
      .map((name) => {
        const totalInFile = parsed[name]?.length ?? 0;
        const cap = rowLimits[name];
        const effective = typeof cap === 'number' && cap >= 0 && cap < totalInFile ? cap : totalInFile;
        return {
          name,
          label: knownTables.find((t) => t.name === name)?.label ?? name,
          count: effective,
          totalInFile,
          truncated: totalInFile - effective,
          isSensitive: SENSITIVE_TABLE_NAMES.has(name),
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [parsed, selectedTables, knownTables, rowLimits]);

  const totalSelectedRows = selectedSummary.reduce((s, r) => s + r.count, 0);

  const reset = () => {
    setStep('configure');
    setFile(null);
    setParsed(null);
    setSelectedTables([]);
    setMode('append');
    setConfirmReplace(false);
    setFinalConfirmText('');
    setResults(null);
    setReportMeta(null);
    setRollbackDone(false);
    setAllowSensitive(false);
    setConfirmSensitive(false);
    setRowLimits({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setIsParsing(true);
    setResults(null);
    try {
      const data = await parseBackupFile(f);
      setParsed(data);
      // Auto-select known REGULAR tables that have rows. Sensitive tables
      // are intentionally NOT auto-selected — the user must opt in first.
      const auto = Object.entries(data)
        .filter(
          ([k, v]) =>
            knownTableNames.has(k) &&
            !SENSITIVE_TABLE_NAMES.has(k) &&
            !FORBIDDEN_TABLE_NAMES.has(k) &&
            Array.isArray(v) &&
            v.length > 0,
        )
        .map(([k]) => k);
      setSelectedTables(auto);
    } catch (err) {
      const msg = getSafeErrorMessage(err) || 'فشل قراءة الملف';
      toast.error(msg);
      reset();
    } finally {
      setIsParsing(false);
    }
  };

  const toggleTable = (name: string) => {
    setSelectedTables((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  const goToReview = () => {
    if (!parsed || selectedTables.length === 0) {
      toast.error('اختر جدولاً واحداً على الأقل');
      return;
    }
    if (mode === 'replace' && !confirmReplace) {
      toast.error('يجب تأكيد الاستبدال الكامل أولاً');
      return;
    }
    if (hasSensitiveSelected && !confirmSensitive) {
      toast.error('يجب تأكيد استعادة الجداول الحساسة قبل المتابعة');
      return;
    }
    setFinalConfirmText('');
    setStep('review');
  };

  /** Toggle the sensitive opt-in. Turning it off also unselects sensitive tables. */
  const toggleAllowSensitive = (next: boolean) => {
    setAllowSensitive(next);
    if (!next) {
      setConfirmSensitive(false);
      setSelectedTables((prev) => prev.filter((t) => !SENSITIVE_TABLE_NAMES.has(t)));
    }
  };

  /** Set or clear a per-table row cap. Empty/0/NaN clears the cap. */
  const setRowLimit = (table: string, value: string) => {
    const n = Number.parseInt(value, 10);
    setRowLimits((prev) => {
      const next = { ...prev };
      if (!Number.isFinite(n) || n <= 0) {
        delete next[table];
      } else {
        next[table] = n;
      }
      return next;
    });
  };

  const handleRestore = async () => {
    if (!parsed || selectedTables.length === 0) return;

    setIsRestoring(true);
    const startedAt = new Date();
    try {
      const filteredData: ParsedBackup = {};
      for (const t of selectedTables) filteredData[t] = parsed[t] ?? [];

      // Only forward row_limits for tables actually selected.
      const limitsToSend: Record<string, number> = {};
      for (const t of selectedTables) {
        const cap = rowLimits[t];
        if (typeof cap === 'number' && cap > 0) limitsToSend[t] = cap;
      }

      const { data, error } = await supabase.functions.invoke('restore-backup', {
        body: {
          data: filteredData,
          tables: selectedTables,
          mode,
          allow_sensitive: hasSensitiveSelected ? true : undefined,
          row_limits: Object.keys(limitsToSend).length > 0 ? limitsToSend : undefined,
          confirm_replace: mode === 'replace' ? confirmReplace : undefined,
        },
      });

      const finishedAt = new Date();

      if (error) {
        toast.error(`فشل الاستعادة: ${getSafeErrorMessage(error)}`);
        setStep('configure');
        return;
      }

      const tenantId = typeof data?.tenant_id === 'string' ? data.tenant_id : undefined;
      const snapshotId = typeof data?.snapshot_id === 'string' ? data.snapshot_id : undefined;
      const snapshotTotalRows =
        typeof data?.snapshot_total_rows === 'number' ? data.snapshot_total_rows : undefined;
      const totalRejectedForeignTenant =
        typeof data?.total_rejected_foreign_tenant === 'number'
          ? data.total_rejected_foreign_tenant
          : undefined;

      if (!data?.success) {
        toast.error(data?.error || 'فشل الاستعادة');
        if (Array.isArray(data?.results)) {
          setResults(data.results as RestoreResult[]);
          setReportMeta({
            startedAt,
            finishedAt,
            tenantId,
            snapshotId,
            snapshotTotalRows,
            totalRejectedForeignTenant,
          });
        }
        setStep('results');
        return;
      }

      setResults(data.results as RestoreResult[]);
      setReportMeta({
        startedAt,
        finishedAt,
        tenantId,
        snapshotId,
        snapshotTotalRows,
        totalRejectedForeignTenant,
      });
      setStep('results');
      if (totalRejectedForeignTenant && totalRejectedForeignTenant > 0) {
        toast.warning(
          `تمت الاستعادة — ${data.total_inserted} سجل، ورُفض ${totalRejectedForeignTenant} صف ينتمي لمستأجر آخر`,
        );
      } else {
        toast.success(`تمت الاستعادة بنجاح — ${data.total_inserted} سجل`);
      }
    } catch (err) {
      const msg = getSafeErrorMessage(err) || 'خطأ غير متوقع';
      console.error('[RestoreBackup] restore error:', err);
      toast.error(msg);
      setStep('configure');
    } finally {
      setIsRestoring(false);
    }
  };

  // ── Report data for the results step ──────────────────────────────────
  const reportInput: RestoreReportInput | null = useMemo(() => {
    if (!results || !reportMeta || !file) return null;
    const tableLabels: Record<string, string> = {};
    for (const t of knownTables) tableLabels[t.name] = t.label;
    const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
    const totalErrors = results.reduce((s, r) => s + r.errors, 0);
    return {
      mode,
      fileName: file.name,
      fileSizeBytes: file.size,
      tenantId: reportMeta.tenantId,
      totalInserted,
      totalErrors,
      totalRejectedForeignTenant: reportMeta.totalRejectedForeignTenant,
      results,
      startedAt: reportMeta.startedAt,
      finishedAt: reportMeta.finishedAt,
      tableLabels,
    };
  }, [results, reportMeta, file, mode, knownTables]);

  const reportSummary = useMemo(
    () => (reportInput ? summarize(reportInput) : null),
    [reportInput],
  );

  const handleDownloadLog = () => {
    if (!reportInput) return;
    const ts = reportInput.finishedAt.toISOString().replace(/[:.]/g, '-');
    downloadLog(`restore-log-${ts}.txt`, buildLogText(reportInput));
  };

  const handleDownloadJson = () => {
    if (!reportInput) return;
    const ts = reportInput.finishedAt.toISOString().replace(/[:.]/g, '-');
    downloadJsonReport(`restore-report-${ts}.json`, reportInput);
  };

  const handleRollback = async () => {
    const snapshotId = reportMeta?.snapshotId;
    if (!snapshotId) return;
    const ok = window.confirm(
      'سيتم حذف كل البيانات الحالية في الجداول المتأثرة واستعادة الحالة قبل الاستيراد. متأكد؟',
    );
    if (!ok) return;
    setIsRollingBack(true);
    try {
      const { data, error } = await supabase.functions.invoke('rollback-restore', {
        body: { snapshot_id: snapshotId },
      });
      if (error) {
        toast.error(`فشل التراجع: ${getSafeErrorMessage(error)}`);
        return;
      }
      if (!data?.success) {
        toast.error(data?.error || 'فشل التراجع');
        return;
      }
      setRollbackDone(true);
      toast.success(`تم التراجع — استعادة ${data.total_restored ?? 0} سجل`);
    } catch (err) {
      const msg = getSafeErrorMessage(err) || 'خطأ غير متوقع';
      console.error('[RestoreBackup] rollback error:', err);
      toast.error(msg);
    } finally {
      setIsRollingBack(false);
    }
  };

  const modeMeta = MODE_LABELS[mode];
  const finalConfirmRequired = mode === 'replace';
  const finalConfirmValid = !finalConfirmRequired || finalConfirmText.trim() === 'استعادة';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            استعادة نسخة احتياطية
            {step === 'review' && (
              <Badge variant="outline" className="mr-2 text-xs">
                خطوة المراجعة 2/3
              </Badge>
            )}
            {step === 'results' && (
              <Badge variant="outline" className="mr-2 text-xs">
                النتائج 3/3
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'configure' && 'ارفع ملف JSON أو SQL أو Excel من نسخة احتياطية سابقة، ثم اختر الجداول وطريقة الاستعادة.'}
            {step === 'review' && 'راجع ما سيحدث بدقة قبل التأكيد. لا يمكن التراجع بعد التنفيذ.'}
            {step === 'results' && 'انتهت عملية الاستعادة. تفاصيل ما تم لكل جدول أدناه.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4">
            {/* ============ STEP 1: CONFIGURE ============ */}
            {step === 'configure' && (
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
                    onChange={handleFile}
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

                    {/* Forbidden tables warning — strictly informational. */}
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
                        <Label>
                          الجداول العادية ({fileBuckets.regular.length})
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setSelectedTables((prev) => {
                                const keepSensitive = prev.filter((t) => SENSITIVE_TABLE_NAMES.has(t));
                                return [...new Set([...keepSensitive, ...fileBuckets.regular.map((t) => t.name)])];
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

                    {/* Sensitive tables tier — opt-in. */}
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
            )}

            {/* ============ STEP 2: REVIEW ============ */}
            {step === 'review' && parsed && (
              <RestoreBackupReviewView
                file={file}
                mode={mode}
                hasSensitiveSelected={hasSensitiveSelected}
                selectedSummary={selectedSummary}
                totalSelectedRows={totalSelectedRows}
                rowLimits={rowLimits}
                setRowLimit={setRowLimit}
                finalConfirmRequired={finalConfirmRequired}
                finalConfirmText={finalConfirmText}
                setFinalConfirmText={setFinalConfirmText}
              />
            )}

            {/* ============ STEP 3: RESULTS ============ */}
            {step === 'results' && results && reportSummary && reportInput && (
              <RestoreBackupResultsView
                results={results}
                reportSummary={reportSummary}
                reportInput={reportInput}
                reportMeta={reportMeta}
                knownTables={knownTables}
                rollbackDone={rollbackDone}
                isRollingBack={isRollingBack}
                onRollback={handleRollback}
                onDownloadLog={handleDownloadLog}
                onDownloadJson={handleDownloadJson}
              />
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          {step === 'configure' && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={isRestoring}>
                إغلاق
              </Button>
              <Button
                onClick={goToReview}
                disabled={
                  isParsing ||
                  !parsed ||
                  selectedTables.length === 0 ||
                  (mode === 'replace' && !confirmReplace) ||
                  (hasSensitiveSelected && !confirmSensitive)
                }
              >
                مراجعة قبل التنفيذ
                <ArrowRight className="h-4 w-4 mr-2 rtl:rotate-180" />
              </Button>
            </>
          )}

          {step === 'review' && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('configure')}
                disabled={isRestoring}
              >
                رجوع للتعديل
              </Button>
              <Button
                onClick={handleRestore}
                disabled={isRestoring || !finalConfirmValid}
                variant={mode === 'replace' ? 'destructive' : 'default'}
              >
                {isRestoring && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                تأكيد وتنفيذ الاستعادة
              </Button>
            </>
          )}

          {step === 'results' && (
            <Button onClick={() => handleClose(false)}>إغلاق</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
