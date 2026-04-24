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
import { Loader2, Upload, AlertTriangle, ShieldCheck, FileText, ArrowRight, CheckCircle2, Info, Download, XCircle, AlertCircle } from 'lucide-react';
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
  } | null>(null);
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

      if (error) {
        toast.error(`فشل الاستعادة: ${error.message}`);
        setStep('configure');
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'فشل الاستعادة');
        if (Array.isArray(data?.results)) setResults(data.results as RestoreResult[]);
        setStep('results');
        return;
      }

      setResults(data.results as RestoreResult[]);
      setStep('results');
      toast.success(`تمت الاستعادة بنجاح — ${data.total_inserted} سجل`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ غير متوقع';
      toast.error(msg);
      setStep('configure');
    } finally {
      setIsRestoring(false);
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
            {step === 'results' && results && (
              <div className="space-y-2">
                <Label>النتائج</Label>
                <div className="border rounded-md divide-y text-sm">
                  {results.map((r) => (
                    <div key={r.table} className="px-3 py-2 flex items-center gap-2">
                      <span className="flex-1">
                        {knownTables.find((t) => t.name === r.table)?.label ?? r.table}
                      </span>
                      {r.inserted > 0 && (
                        <Badge variant="default" className="text-xs">
                          +{r.inserted}
                        </Badge>
                      )}
                      {r.skipped > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          تم التجاهل: {r.skipped}
                        </Badge>
                      )}
                      {r.errors > 0 && (
                        <Badge variant="destructive" className="text-xs" title={r.error_sample}>
                          أخطاء: {r.errors}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
