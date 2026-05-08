import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  History,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { classifyError, type RestoreReportInput } from '@/lib/services/backupRestoreReport';
import type { RestoreResult } from './restoreBackup.constants';

interface ReportSummary {
  totalErrors: number;
  totalInserted: number;
  totalSkipped: number;
  conflictHits: number;
  totalRejectedForeignTenant: number;
  partialTables: number;
  failedTables: number;
  durationSeconds: number;
}

interface ReportMeta {
  tenantId?: string;
  snapshotId?: string;
  snapshotTotalRows?: number;
}

interface Props {
  results: RestoreResult[];
  reportSummary: ReportSummary;
  reportInput: RestoreReportInput;
  reportMeta: ReportMeta | null;
  knownTables: { name: string; label: string }[];
  rollbackDone: boolean;
  isRollingBack: boolean;
  onRollback: () => void;
  onDownloadLog: () => void;
  onDownloadJson: () => void;
}

/**
 * Step 3 of RestoreBackupDialog — extracted to keep the parent dialog
 * file under control. Pure presentational component (no own state).
 */
export function RestoreBackupResultsView({
  results,
  reportSummary,
  reportMeta,
  knownTables,
  rollbackDone,
  isRollingBack,
  onRollback,
  onDownloadLog,
  onDownloadJson,
}: Props) {
  return (
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

      {/* Cross-tenant security alert */}
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
              r.errors === 0 ? 'success' : r.inserted > 0 ? 'partial' : 'failed';
            const StatusIcon =
              status === 'success' ? CheckCircle2 : status === 'partial' ? AlertCircle : XCircle;
            const statusClass =
              status === 'success'
                ? 'text-success'
                : status === 'partial'
                  ? 'text-warning'
                  : 'text-destructive';
            return (
              <div key={r.table} className="px-3 py-2 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusIcon className={`h-4 w-4 ${statusClass}`} />
                  <span className="flex-1 font-medium">{label}</span>
                  {r.is_sensitive && (
                    <Badge variant="outline" className="text-[10px] border-warning text-warning">
                      <ShieldAlert className="h-3 w-3 ml-1" />
                      حساس
                    </Badge>
                  )}
                  {r.inserted > 0 && (
                    <Badge variant="default" className="text-xs">نجح: {r.inserted}</Badge>
                  )}
                  {r.skipped > 0 && (
                    <Badge variant="secondary" className="text-xs">تجاهل: {r.skipped}</Badge>
                  )}
                  {(r.truncated ?? 0) > 0 && (
                    <Badge variant="outline" className="text-xs">مقتطع: {r.truncated}</Badge>
                  )}
                  {r.errors > 0 && (
                    <Badge variant="destructive" className="text-xs">فشل: {r.errors}</Badge>
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
        <div
          className={`rounded-md border p-3 space-y-2 ${
            rollbackDone ? 'bg-success/5 border-success/40' : 'bg-warning/5 border-warning/40'
          }`}
        >
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
            <Button size="sm" variant="destructive" onClick={onRollback} disabled={isRollingBack}>
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
          <Button size="sm" variant="outline" onClick={onDownloadLog}>
            <Download className="h-3.5 w-3.5 ml-2" />
            تنزيل سجل نصي (.txt)
          </Button>
          <Button size="sm" variant="outline" onClick={onDownloadJson}>
            <Download className="h-3.5 w-3.5 ml-2" />
            تنزيل تقرير JSON
          </Button>
        </div>
      </div>
    </>
  );
}
