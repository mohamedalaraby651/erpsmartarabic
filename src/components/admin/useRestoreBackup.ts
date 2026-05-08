import { useState, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getSafeErrorMessage } from '@/lib/errorHandler';
import { parseBackupFile, type ParsedBackup } from '@/lib/services/backupRestoreParser';
import {
  buildLogText,
  downloadJsonReport,
  downloadLog,
  summarize,
  type RestoreReportInput,
} from '@/lib/services/backupRestoreReport';
import {
  SENSITIVE_TABLE_NAMES,
  FORBIDDEN_TABLE_NAMES,
  type RestoreMode,
  type RestoreStep,
  type RestoreResult,
} from './restoreBackup.constants';

interface UseRestoreBackupOptions {
  knownTables: { name: string; label: string }[];
  onClose: () => void;
}

/**
 * State + handlers for the Restore Backup dialog.
 * Extracted from RestoreBackupDialog.tsx so the dialog file stays purely
 * presentational and under the size budget.
 */
export function useRestoreBackup({ knownTables, onClose }: UseRestoreBackupOptions) {
  const [step, setStep] = useState<RestoreStep>('configure');
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
  const [allowSensitive, setAllowSensitive] = useState(false);
  const [confirmSensitive, setConfirmSensitive] = useState(false);
  const [rowLimits, setRowLimits] = useState<Record<string, number | undefined>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const knownTableNames = useMemo(
    () => new Set(knownTables.map((t) => t.name)),
    [knownTables],
  );

  const fileBuckets = useMemo(() => {
    if (!parsed) {
      return {
        regular: [] as { name: string; label: string; count: number }[],
        sensitive: [] as { name: string; label: string; count: number }[],
        forbidden: [] as string[],
        unknown: [] as string[],
      };
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
        sensitive.push({
          name: k,
          label: knownTables.find((t) => t.name === k)?.label ?? k,
          count,
        });
        continue;
      }
      if (knownTableNames.has(k)) {
        regular.push({
          name: k,
          label: knownTables.find((t) => t.name === k)?.label ?? k,
          count,
        });
        continue;
      }
      unknown.push(k);
    }
    regular.sort((a, b) => a.label.localeCompare(b.label, 'ar'));
    sensitive.sort((a, b) => a.label.localeCompare(b.label, 'ar'));
    return { regular, sensitive, forbidden, unknown };
  }, [parsed, knownTables, knownTableNames]);

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
        const effective =
          typeof cap === 'number' && cap >= 0 && cap < totalInFile ? cap : totalInFile;
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
    if (!next) {
      reset();
      onClose();
    }
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

  const toggleAllowSensitive = (next: boolean) => {
    setAllowSensitive(next);
    if (!next) {
      setConfirmSensitive(false);
      setSelectedTables((prev) => prev.filter((t) => !SENSITIVE_TABLE_NAMES.has(t)));
    }
  };

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

  const finalConfirmRequired = mode === 'replace';
  const finalConfirmValid = !finalConfirmRequired || finalConfirmText.trim() === 'استعادة';

  return {
    // state
    step,
    file,
    parsed,
    selectedTables,
    setSelectedTables,
    mode,
    setMode,
    confirmReplace,
    setConfirmReplace,
    finalConfirmText,
    setFinalConfirmText,
    isParsing,
    isRestoring,
    results,
    reportMeta,
    isRollingBack,
    rollbackDone,
    allowSensitive,
    confirmSensitive,
    setConfirmSensitive,
    rowLimits,
    fileInputRef,
    // derived
    fileBuckets,
    ignoredKeys,
    hasSensitiveSelected,
    selectedSummary,
    totalSelectedRows,
    reportInput,
    reportSummary,
    finalConfirmRequired,
    finalConfirmValid,
    // handlers
    handleClose,
    handleFile,
    toggleTable,
    goToReview,
    toggleAllowSensitive,
    setRowLimit,
    handleRestore,
    handleDownloadLog,
    handleDownloadJson,
    handleRollback,
    setStep,
  };
}
