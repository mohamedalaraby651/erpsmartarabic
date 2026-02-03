import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Loader2, RefreshCw, Layers, SkipForward } from 'lucide-react';

export type ImportMode = 'replace' | 'merge' | 'skip_duplicates';

interface ImportStats {
  tableName: string;
  tableLabel: string;
  recordCount: number;
}

interface ImportOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importStats: ImportStats[];
  isImporting: boolean;
  onConfirm: (mode: ImportMode, confirmText: string) => void;
}

const importModeOptions = [
  {
    value: 'replace' as ImportMode,
    label: 'استبدال',
    description: 'استبدال السجلات الموجودة بالسجلات المستوردة',
    icon: RefreshCw,
    color: 'text-amber-600 dark:text-amber-400',
  },
  {
    value: 'merge' as ImportMode,
    label: 'دمج',
    description: 'تحديث البيانات الموجودة مع إضافة الجديدة',
    icon: Layers,
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    value: 'skip_duplicates' as ImportMode,
    label: 'تخطي المكررات',
    description: 'إضافة السجلات الجديدة فقط وتجاهل المتكررة',
    icon: SkipForward,
    color: 'text-emerald-600 dark:text-emerald-400',
  },
];

export function ImportOptionsDialog({
  open,
  onOpenChange,
  importStats,
  isImporting,
  onConfirm,
}: ImportOptionsDialogProps) {
  const [selectedMode, setSelectedMode] = useState<ImportMode>('merge');
  const [confirmText, setConfirmText] = useState('');

  const totalRecords = importStats.reduce((sum, s) => sum + s.recordCount, 0);

  const handleConfirm = () => {
    if (confirmText === 'استيراد') {
      onConfirm(selectedMode, confirmText);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setSelectedMode('merge');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            خيارات الاستيراد
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              سيتم استيراد <strong>{totalRecords.toLocaleString()}</strong> سجل من{' '}
              <strong>{importStats.length}</strong> جداول
            </p>

            {/* Tables Summary */}
            <ScrollArea className="h-32 rounded-lg border p-3">
              <div className="space-y-2">
                {importStats.map((stat) => (
                  <div key={stat.tableName} className="flex items-center justify-between">
                    <span className="text-sm">{stat.tableLabel}</span>
                    <Badge variant="secondary">{stat.recordCount} سجل</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Import Mode Selection */}
            <div className="space-y-3">
              <Label className="text-foreground font-medium">طريقة الاستيراد:</Label>
              <RadioGroup
                value={selectedMode}
                onValueChange={(value) => setSelectedMode(value as ImportMode)}
                className="space-y-2"
              >
                {importModeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div
                      key={option.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedMode === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedMode(option.value)}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${option.color}`} />
                          <Label htmlFor={option.value} className="font-medium cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Confirmation Input */}
            <div className="pt-2">
              <Label className="text-foreground">
                اكتب <strong>"استيراد"</strong> للتأكيد:
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="استيراد"
                className="mt-2"
                disabled={isImporting}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isImporting}>
            إلغاء
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={confirmText !== 'استيراد' || isImporting}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري الاستيراد...
              </>
            ) : (
              'تأكيد الاستيراد'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
