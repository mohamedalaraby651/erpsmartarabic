import { Button } from '@/components/ui/button';
import { QUICK_PERIOD_LABELS, getQuickPeriodRange, type QuickPeriod } from '@/lib/dates/quickPeriods';

interface Props {
  onSelect: (range: { from: string; to: string }, period: QuickPeriod) => void;
  active?: QuickPeriod | null;
}

/** Quick period chips for reports (today / month / quarter / year). */
export function QuickPeriodChips({ onSelect, active }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="فترات سريعة">
      {(Object.keys(QUICK_PERIOD_LABELS) as QuickPeriod[]).map((p) => (
        <Button
          key={p}
          type="button"
          size="sm"
          variant={active === p ? 'default' : 'outline'}
          className="min-h-11 md:min-h-9"
          aria-pressed={active === p}
          onClick={() => onSelect(getQuickPeriodRange(p), p)}
        >
          {QUICK_PERIOD_LABELS[p]}
        </Button>
      ))}
    </div>
  );
}
