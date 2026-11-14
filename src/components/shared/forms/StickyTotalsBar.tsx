import { Amount } from '@/components/shared/amount/Amount';

/** Two-line totals bar pinned to the bottom of document forms (decisions 283, 348). */
export function StickyTotalsBar({ total, remaining }: { total: number; remaining: number }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-2 backdrop-blur">
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">إجمالي الفاتورة</dt><dd className="font-bold text-base"><Amount value={total} variant="full" /></dd></div>
        <div className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">المتبقي المستحق</dt><dd className="font-bold text-base"><Amount value={remaining} variant="full" /></dd></div>
      </dl>
    </div>
  );
}
