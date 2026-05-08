import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, ArrowRight } from 'lucide-react';
import { MODE_LABELS } from './restoreBackup.constants';
import { RestoreBackupResultsView } from './RestoreBackupResultsView';
import { RestoreBackupReviewView } from './RestoreBackupReviewView';
import { RestoreBackupConfigureView } from './RestoreBackupConfigureView';
import { useRestoreBackup } from './useRestoreBackup';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Map of table name → Arabic label, used to filter parsed sheets. */
  knownTables: { name: string; label: string }[];
}

export function RestoreBackupDialog({ open, onOpenChange, knownTables }: Props) {
  const r = useRestoreBackup({
    knownTables,
    onClose: () => onOpenChange(false),
  });

  const handleDialogChange = (next: boolean) => {
    if (!next) {
      r.handleClose(false);
    } else {
      onOpenChange(true);
    }
  };

  // Reference MODE_LABELS to preserve existing import semantics (used by review view via mode prop).
  void MODE_LABELS;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            استعادة نسخة احتياطية
            {r.step === 'review' && (
              <Badge variant="outline" className="mr-2 text-xs">
                خطوة المراجعة 2/3
              </Badge>
            )}
            {r.step === 'results' && (
              <Badge variant="outline" className="mr-2 text-xs">
                النتائج 3/3
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {r.step === 'configure' && 'ارفع ملف JSON أو SQL أو Excel من نسخة احتياطية سابقة، ثم اختر الجداول وطريقة الاستعادة.'}
            {r.step === 'review' && 'راجع ما سيحدث بدقة قبل التأكيد. لا يمكن التراجع بعد التنفيذ.'}
            {r.step === 'results' && 'انتهت عملية الاستعادة. تفاصيل ما تم لكل جدول أدناه.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4">
            {r.step === 'configure' && (
              <RestoreBackupConfigureView
                fileInputRef={r.fileInputRef}
                file={r.file}
                isParsing={r.isParsing}
                isRestoring={r.isRestoring}
                parsed={r.parsed}
                fileBuckets={r.fileBuckets}
                ignoredKeys={r.ignoredKeys}
                selectedTables={r.selectedTables}
                setSelectedTables={r.setSelectedTables}
                toggleTable={r.toggleTable}
                allowSensitive={r.allowSensitive}
                toggleAllowSensitive={r.toggleAllowSensitive}
                hasSensitiveSelected={r.hasSensitiveSelected}
                confirmSensitive={r.confirmSensitive}
                setConfirmSensitive={r.setConfirmSensitive}
                mode={r.mode}
                setMode={r.setMode}
                confirmReplace={r.confirmReplace}
                setConfirmReplace={r.setConfirmReplace}
                onFileChange={r.handleFile}
              />
            )}

            {r.step === 'review' && r.parsed && (
              <RestoreBackupReviewView
                file={r.file}
                mode={r.mode}
                hasSensitiveSelected={r.hasSensitiveSelected}
                selectedSummary={r.selectedSummary}
                totalSelectedRows={r.totalSelectedRows}
                rowLimits={r.rowLimits}
                setRowLimit={r.setRowLimit}
                finalConfirmRequired={r.finalConfirmRequired}
                finalConfirmText={r.finalConfirmText}
                setFinalConfirmText={r.setFinalConfirmText}
              />
            )}

            {r.step === 'results' && r.results && r.reportSummary && r.reportInput && (
              <RestoreBackupResultsView
                results={r.results}
                reportSummary={r.reportSummary}
                reportInput={r.reportInput}
                reportMeta={r.reportMeta}
                knownTables={knownTables}
                rollbackDone={r.rollbackDone}
                isRollingBack={r.isRollingBack}
                onRollback={r.handleRollback}
                onDownloadLog={r.handleDownloadLog}
                onDownloadJson={r.handleDownloadJson}
              />
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          {r.step === 'configure' && (
            <>
              <Button variant="outline" onClick={() => r.handleClose(false)} disabled={r.isRestoring}>
                إغلاق
              </Button>
              <Button
                onClick={r.goToReview}
                disabled={
                  r.isParsing ||
                  !r.parsed ||
                  r.selectedTables.length === 0 ||
                  (r.mode === 'replace' && !r.confirmReplace) ||
                  (r.hasSensitiveSelected && !r.confirmSensitive)
                }
              >
                مراجعة قبل التنفيذ
                <ArrowRight className="h-4 w-4 mr-2 rtl:rotate-180" />
              </Button>
            </>
          )}

          {r.step === 'review' && (
            <>
              <Button
                variant="outline"
                onClick={() => r.setStep('configure')}
                disabled={r.isRestoring}
              >
                رجوع للتعديل
              </Button>
              <Button
                onClick={r.handleRestore}
                disabled={r.isRestoring || !r.finalConfirmValid}
                variant={r.mode === 'replace' ? 'destructive' : 'default'}
              >
                {r.isRestoring && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                تأكيد وتنفيذ الاستعادة
              </Button>
            </>
          )}

          {r.step === 'results' && (
            <Button onClick={() => r.handleClose(false)}>إغلاق</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
