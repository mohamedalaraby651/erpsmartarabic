import { History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Draft restore bar (decision 345): user chooses restore or discard. */
export function DraftRestoreBanner({ onRestore, onDiscard }: { onRestore: () => void; onDiscard: () => void }) {
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
      <span className="flex items-center gap-2"><History className="h-4 w-4 text-primary" />توجد مسودة محفوظة من جلسة سابقة.</span>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onRestore}>استعادة المسودة</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDiscard}><Trash2 className="h-4 w-4 ml-1" />حذف المسودة</Button>
      </div>
    </div>
  );
}
