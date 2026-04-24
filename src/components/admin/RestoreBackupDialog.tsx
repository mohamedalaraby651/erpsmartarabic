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
import { Loader2, Upload, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseBackupFile, type ParsedBackup } from '@/lib/services/backupRestoreParser';

type RestoreMode = 'append' | 'upsert' | 'replace';

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
}

export function RestoreBackupDialog({ open, onOpenChange, knownTables }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [mode, setMode] = useState<RestoreMode>('append');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [results, setResults] = useState<RestoreResult[] | null>(null);
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

  const reset = () => {
    setFile(null);
    setParsed(null);
    setSelectedTables([]);
    setMode('append');
    setConfirmReplace(false);
    setResults(null);
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

  const handleRestore = async () => {
    if (!parsed || selectedTables.length === 0) return;
    if (mode === 'replace' && !confirmReplace) {
      toast.error('يجب تأكيد الاستبدال الكامل');
      return;
    }

    setIsRestoring(true);
    setResults(null);
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
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'فشل الاستعادة');
        if (Array.isArray(data?.results)) setResults(data.results as RestoreResult[]);
        return;
      }

      setResults(data.results as RestoreResult[]);
      toast.success(`تمت الاستعادة بنجاح — ${data.total_inserted} سجل`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ غير متوقع';
      toast.error(msg);
    } finally {
      setIsRestoring(false);
    }
  };

  const totalSelectedRows = selectedTables.reduce(
    (sum, t) => sum + (parsed?.[t]?.length ?? 0),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            استعادة نسخة احتياطية
          </DialogTitle>
          <DialogDescription>
            ارفع ملف JSON أو SQL أو Excel من نسخة احتياطية سابقة، ثم اختر الجداول وطريقة الاستعادة.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4">
            {/* Security notice */}
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>أمان الاستعادة</AlertTitle>
              <AlertDescription className="text-xs">
                يتم إعادة كتابة معرّف المستأجر (tenant_id) لكل سجل تلقائياً ليطابق حسابك الحالي.
                لا يمكن حقن بيانات لمستأجر آخر، حتى لو تم تعديل الملف يدوياً.
              </AlertDescription>
            </Alert>

            {/* File picker */}
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

            {/* Parsed preview */}
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

                {/* Mode selection */}
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

            {/* Results */}
            {results && (
              <>
                <Separator />
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
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isRestoring}>
            إغلاق
          </Button>
          <Button
            onClick={handleRestore}
            disabled={
              isRestoring ||
              isParsing ||
              !parsed ||
              selectedTables.length === 0 ||
              (mode === 'replace' && !confirmReplace)
            }
          >
            {isRestoring && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            تنفيذ الاستعادة ({totalSelectedRows} سجل)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
