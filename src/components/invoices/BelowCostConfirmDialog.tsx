import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatEGP } from '@/lib/format/money';
import type { BelowCostLine } from '@/lib/pricing/belowCost';

interface Props { lines: BelowCostLine[] | null; onCancel: () => void; onConfirm: () => void }

export function BelowCostConfirmDialog({ lines, onCancel, onConfirm }: Props) {
  return (
    <AlertDialog open={!!lines} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" /> بيع بأقل من التكلفة
          </AlertDialogTitle>
          <AlertDialogDescription>الأصناف التالية سعرها بعد الخصم أقل من تكلفتها. هل تريد المتابعة؟</AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          {lines?.map((l) => (
            <li key={l.product_id} className="flex justify-between gap-2">
              <span className="truncate">{l.product_name}</span>
              <span className="tabular-nums">{formatEGP(l.net_unit_price)} / التكلفة {formatEGP(l.cost_price)}</span>
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">مراجعة الأسعار</AlertDialogCancel>
          <AlertDialogAction className="min-h-11 bg-warning text-warning-foreground hover:bg-warning/90" onClick={onConfirm}>
            متابعة الحفظ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
