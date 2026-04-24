import { useState, useRef, useMemo } from 'react';
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
import { Loader2, Upload, AlertTriangle, ShieldCheck, FileText, ArrowRight, CheckCircle2, Info, Download, XCircle, AlertCircle, RotateCcw, History } from 'lucide-react';
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

type RestoreMode = 'append' | 'upsert' | 'replace';
type Step = 'configure' | 'review' | 'results';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Map of table name → Arabic label, used to filter parsed sheets. */
  knownTables: { name: string; label: string }[];
}

interface RestoreResult {
  table: string;
  inserted: number;
  skipped: number;
  errors: number;
  rejected_foreign_tenant?: number;
  foreign_tenant_ids?: string[];
  error_sample?: string;
  error_messages?: string[];
}

const MODE_LABELS: Record<RestoreMode, { title: string; effect: string; tone: 'default' | 'warning' | 'destructive' }> = {
  append: {
    title: 'إلحاق فقط (Append)',
    effect: 'سيتم إدراج السجلات الجديدة فقط. السجلات ذات المعرّفات الموجودة مسبقاً سيتم تجاهلها.',
    tone: 'default',
  },
  upsert: {
    title: 'دمج (Upsert)',
    effect: 'سيتم إدراج السجلات الجديدة وتحديث السجلات الموجودة (مطابقة المعرّف). البيانات الحالية قد تُستبدل.',
    tone: 'warning',
  },
  replace: {
    title: 'استبدال كامل (Replace)',
    effect: 'سيتم حذف كل السجلات الحالية في الجداول المختارة ثم إعادة الإدراج من الملف. عملية لا يمكن التراجع عنها.',
    tone: 'destructive',
  },
};

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const knownTableNames = useMemo(() => new Set(knownTables.map((t) => t.name)), [knownTables]);

  // Only show parsed entries whose key is a known business table.
  const availableTables = useMemo(() => {
    if (!parsed) return [];
    return Object.entries(parsed)
      .filter(([k]) => knownTableNames.has(k))
      .map(([k, rows]) => ({
        name: k,
        label: knownTables.find((t) => t.name === k)?.label ?? k,
        count: rows.length,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [parsed, knownTableNames, knownTables]);

  const ignoredKeys = useMemo(() => {
    if (!parsed) return [];
    return Object.keys(parsed).filter((k) => !knownTableNames.has(k));
  }, [parsed, knownTableNames]);

  const selectedSummary = useMemo(() => {
    if (!parsed) return [];
    return selectedTables
      .map((name) => ({
        name,
        label: knownTables.find((t) => t.name === name)?.label ?? name,
        count: parsed[name]?.length ?? 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [parsed, selectedTables, knownTables]);

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
      // Auto-select all known tables that have rows.
      const auto = Object.entries(data)
        .filter(([k, v]) => knownTableNames.has(k) && Array.isArray(v) && v.length > 0)
        .map(([k]) => k);
      setSelectedTables(auto);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل قراءة الملف';
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
    setFinalConfirmText('');
    setStep('review');
  };

  const handleRestore = async () => {
    if (!parsed || selectedTables.length === 0) return;

    setIsRestoring(true);
    const startedAt = new Date();
    try {
      const filteredData: ParsedBackup = {};
      for (const t of selectedTables) filteredData[t] = parsed[t] ?? [];

      const { data, error } = await supabase.functions.invoke('restore-backup', {
        body: {
          data: filteredData,
          tables: selectedTables,
          mode,
          confirm_replace: mode === 'replace' ? confirmReplace : undefined,
        },
      });

      const finishedAt = new Date();

      if (error) {
        toast.error(`فشل الاستعادة: ${error.message}`);
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
      const msg = err instanceof Error ? err.message : 'خطأ غير متوقع';
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
        toast.error(`فشل التراجع: ${error.message}`);
        return;
      }
      if (!data?.success) {
        toast.error(data?.error || 'فشل التراجع');
        return;
      }
      setRollbackDone(true);
      toast.success(`تم التراجع — استعادة ${data.total_restored ?? 0} سجل`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ غير متوقع';
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

                {parsed && availableTables.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>الجداول المتوفرة ({availableTables.length})</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTables(availableTables.map((t) => t.name))}
                          >
                            تحديد الكل
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
                        {availableTables.map((t) => (
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
                      </div>

                      {ignoredKeys.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          تم تجاهل {ignoredKeys.length} عنصر غير معروف من الملف لأسباب أمنية.
                        </p>
                      )}
                    </div>

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

                {parsed && availableTables.length === 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      لم يتم العثور على أي جدول معروف في الملف. تأكد من أن الملف صادر من هذا النظام.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* ============ STEP 2: REVIEW ============ */}
            {step === 'review' && parsed && (
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

                {/* Tables summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>الجداول التي سيتم استعادتها ({selectedSummary.length})</Label>
                    <Badge variant="secondary" className="text-xs">
                      الإجمالي: {totalSelectedRows} سجل
                    </Badge>
                  </div>
                  <div className="border rounded-md divide-y max-h-64 overflow-auto">
                    {selectedSummary.map((t) => (
                      <div key={t.name} className="px-3 py-2 flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        <span className="flex-1">{t.label}</span>
                        <span className="text-xs text-muted-foreground">{t.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {t.count} سجل
                        </Badge>
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
            )}

            {/* ============ STEP 3: RESULTS ============ */}
            {step === 'results' && results && reportSummary && reportInput && (
              <>
                {/* Top-level status banner */}
                {reportSummary.totalErrors === 0 ? (
                  <Alert className="border-success/40 bg-success/5">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <AlertTitle>اكتملت الاستعادة بنجاح</AlertTitle>
                    <AlertDescription className="text-xs">
                      تمت معالجة {results.length} جدول دون أي أخطاء خلال{' '}
                      {reportSummary.durationSeconds} ثانية.
                    </AlertDescription>
                  </Alert>
                ) : reportSummary.totalInserted > 0 ? (
                  <Alert className="border-warning/40 bg-warning/5">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <AlertTitle>اكتملت جزئياً مع أخطاء</AlertTitle>
                    <AlertDescription className="text-xs">
                      تم إدراج {reportSummary.totalInserted} سجل، لكن{' '}
                      {reportSummary.totalErrors} سجل فشل في{' '}
                      {reportSummary.partialTables + reportSummary.failedTables} جدول.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>فشلت الاستعادة</AlertTitle>
                    <AlertDescription className="text-xs">
                      لم يتم إدراج أي سجل. راجع تفاصيل الأخطاء أدناه.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Cross-tenant security alert (any rejected rows = potential injection attempt). */}
                {reportSummary.totalRejectedForeignTenant > 0 && (
                  <Alert variant="destructive">
                    <ShieldCheck className="h-4 w-4" />
                    <AlertTitle>تم رفض صفوف تخص مستأجراً آخر</AlertTitle>
                    <AlertDescription className="text-xs space-y-1">
                      <div>
                        رُفض {reportSummary.totalRejectedForeignTenant} صف لأن قيمة tenant_id فيها
                        لا تطابق المستأجر الحالي ({reportMeta?.tenantId?.slice(0, 8)}…). لم تُكتب
                        أي بيانات لمستأجر آخر — هذه حماية تلقائية ضد الحقن.
                      </div>
                      <div className="text-muted-foreground">
                        إذا كنت تتوقع استعادة بيانات من مستأجر مختلف، يجب القيام بذلك من حساب
                        ينتمي لذلك المستأجر مباشرة.
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* KPI grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="rounded-md border p-3 bg-card">
                    <div className="text-xs text-muted-foreground">سجلات ناجحة</div>
                    <div className="text-lg font-semibold text-success">
                      {reportSummary.totalInserted}
                    </div>
                  </div>
                  <div className="rounded-md border p-3 bg-card">
                    <div className="text-xs text-muted-foreground">سجلات متجاهلة</div>
                    <div className="text-lg font-semibold text-muted-foreground">
                      {reportSummary.totalSkipped}
                    </div>
                  </div>
                  <div className="rounded-md border p-3 bg-card">
                    <div className="text-xs text-muted-foreground">سجلات فاشلة</div>
                    <div className="text-lg font-semibold text-destructive">
                      {reportSummary.totalErrors}
                    </div>
                  </div>
                  <div className="rounded-md border p-3 bg-card">
                    <div className="text-xs text-muted-foreground">تعارضات مفاتيح</div>
                    <div className="text-lg font-semibold text-warning">
                      {reportSummary.conflictHits}
                    </div>
                  </div>
                </div>

                {/* Per-table breakdown */}
                <div className="space-y-2">
                  <Label>تفاصيل لكل جدول</Label>
                  <div className="border rounded-md divide-y text-sm">
                    {results.map((r) => {
                      const label = knownTables.find((t) => t.name === r.table)?.label ?? r.table;
                      const messages = r.error_messages?.length
                        ? r.error_messages
                        : r.error_sample
                          ? [r.error_sample]
                          : [];
                      const status =
                        r.errors === 0
                          ? 'success'
                          : r.inserted > 0
                            ? 'partial'
                            : 'failed';
                      const StatusIcon =
                        status === 'success'
                          ? CheckCircle2
                          : status === 'partial'
                            ? AlertCircle
                            : XCircle;
                      const statusClass =
                        status === 'success'
                          ? 'text-success'
                          : status === 'partial'
                            ? 'text-warning'
                            : 'text-destructive';
                      return (
                        <div key={r.table} className="px-3 py-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`h-4 w-4 ${statusClass}`} />
                            <span className="flex-1 font-medium">{label}</span>
                            {r.inserted > 0 && (
                              <Badge variant="default" className="text-xs">
                                نجح: {r.inserted}
                              </Badge>
                            )}
                            {r.skipped > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                تجاهل: {r.skipped}
                              </Badge>
                            )}
                            {r.errors > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                فشل: {r.errors}
                              </Badge>
                            )}
                            {(r.rejected_foreign_tenant ?? 0) > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                مرفوض (مستأجر آخر): {r.rejected_foreign_tenant}
                              </Badge>
                            )}
                          </div>
                          {(r.rejected_foreign_tenant ?? 0) > 0 && r.foreign_tenant_ids?.length ? (
                            <div className="text-[11px] text-muted-foreground mr-6">
                              المعرّفات المرفوضة: {r.foreign_tenant_ids.slice(0, 3).join(', ')}
                              {r.foreign_tenant_ids.length > 3 ? '…' : ''}
                            </div>
                          ) : null}
                          {messages.length > 0 && (
                            <div className="space-y-1 mr-6">
                              {messages.map((msg, i) => {
                                const kind = classifyError(msg);
                                const tagText =
                                  kind === 'conflict'
                                    ? 'تعارض مفتاح'
                                    : kind === 'fk'
                                      ? 'علاقة مرجعية'
                                      : kind === 'check'
                                        ? 'قيد تحقق'
                                        : 'خطأ';
                                const tagVariant =
                                  kind === 'conflict' || kind === 'fk' ? 'destructive' : 'outline';
                                return (
                                  <div
                                    key={i}
                                    className="text-xs flex items-start gap-2 rounded bg-muted/40 p-2"
                                  >
                                    <Badge variant={tagVariant} className="text-[10px] shrink-0">
                                      {tagText}
                                    </Badge>
                                    <code className="text-xs break-all leading-relaxed">{msg}</code>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Auto-snapshot / Rollback */}
                {reportMeta?.snapshotId && (
                  <div className={`rounded-md border p-3 space-y-2 ${rollbackDone ? 'bg-success/5 border-success/40' : 'bg-warning/5 border-warning/40'}`}>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <History className="h-4 w-4" />
                      نسخة احتياطية تلقائية
                      <Badge variant="outline" className="text-[10px] font-mono mr-auto">
                        {reportMeta.snapshotId.slice(0, 8)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      تم التقاط {reportMeta.snapshotTotalRows ?? 0} سجل من الجداول المتأثرة قبل بدء الاستعادة.
                      يمكنك التراجع لاستعادة الحالة السابقة (تنتهي صلاحية النسخة بعد 7 أيام).
                    </p>
                    {rollbackDone ? (
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        تم التراجع بنجاح إلى الحالة السابقة.
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleRollback}
                        disabled={isRollingBack}
                      >
                        {isRollingBack ? (
                          <Loader2 className="h-3.5 w-3.5 ml-2 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5 ml-2" />
                        )}
                        تراجع واسترجاع الحالة السابقة
                      </Button>
                    )}
                  </div>
                )}

                {/* Download log */}
                <div className="rounded-md border p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    سجل الاستعادة (للأرشفة والمراجعة)
                  </div>
                  <p className="text-xs text-muted-foreground">
                    نزّل ملف log كامل يحتوي على وقت التنفيذ، الإعدادات، نتائج كل جدول،
                    وكل رسائل الأخطاء — مفيد عند فتح تذكرة دعم أو للمراجعة الداخلية.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={handleDownloadLog}>
                      <Download className="h-3.5 w-3.5 ml-2" />
                      تنزيل سجل نصي (.txt)
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDownloadJson}>
                      <Download className="h-3.5 w-3.5 ml-2" />
                      تنزيل تقرير JSON
                    </Button>
                  </div>
                </div>
              </>
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
                  (mode === 'replace' && !confirmReplace)
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
