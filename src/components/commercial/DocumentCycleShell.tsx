import React, { useState } from 'react';
import { FileText, ShoppingCart, Receipt, Truck, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { EntityLink } from '@/components/shared/EntityLink';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export type CycleStage = 'quotation' | 'sales_order' | 'invoice' | 'delivery_note';

export interface CycleStep {
  stage: CycleStage;
  /** Whether this step has been completed (document exists) */
  completed: boolean;
  /** Optional linked entity for navigation */
  entityId?: string;
  entityNumber?: string;
}

interface DocumentCycleShellProps {
  /** Current active stage (highlighted) */
  currentStage: CycleStage;
  /** Steps with completion status */
  steps: CycleStep[];
  /** Optional: procurement cycle uses purchase_order instead of sales_order */
  variant?: 'sales' | 'procurement';
  className?: string;
}

const STAGE_META: Record<CycleStage, { label: string; labelEn: string; icon: React.ElementType; entityType: 'quotation' | 'sales-order' | 'invoice' }> = {
  quotation: { label: 'عرض سعر', labelEn: 'Quotation', icon: FileText, entityType: 'quotation' },
  sales_order: { label: 'أمر تجاري', labelEn: 'Order', icon: ShoppingCart, entityType: 'sales-order' },
  invoice: { label: 'فاتورة مالية', labelEn: 'Invoice', icon: Receipt, entityType: 'invoice' },
  delivery_note: { label: 'إذن لوجستي', labelEn: 'Delivery Note', icon: Truck, entityType: 'invoice' },
};

const DEFAULT_ORDER: CycleStage[] = ['quotation', 'sales_order', 'invoice', 'delivery_note'];

/**
 * Visual document cycle stepper.
 * Desktop: continuous glowing horizontal timeline.
 * Mobile/Tablet: collapsible vertical step-sheet.
 */
export function DocumentCycleShell({
  currentStage,
  steps,
  variant = 'sales',
  className,
}: DocumentCycleShellProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const order = DEFAULT_ORDER;
  const currentIndex = order.indexOf(currentStage);
  const stepMap = new Map(steps.map((s) => [s.stage, s]));

  const rendered = order.map((stage, idx) => {
    const step = stepMap.get(stage);
    const status: 'completed' | 'current' | 'upcoming' =
      idx < currentIndex || step?.completed
        ? 'completed'
        : idx === currentIndex
          ? 'current'
          : 'upcoming';
    return { stage, status, step, ...STAGE_META[stage] };
  });

  if (isMobile) {
    const currentMeta = STAGE_META[currentStage];
    const completedCount = rendered.filter((r) => r.status === 'completed').length;
    return (
      <Collapsible open={open} onOpenChange={setOpen} className={cn('rounded-xl border bg-card', className)}>
        <CollapsibleTrigger className="w-full flex items-center justify-between p-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <currentMeta.icon className="h-4 w-4" />
            </div>
            <div className="text-right min-w-0">
              <div className="text-sm font-semibold truncate">{currentMeta.label}</div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {completedCount} / {order.length} مراحل مكتملة
              </div>
            </div>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3">
          <ol className="relative border-r-2 border-border/60 pr-4 space-y-3 mt-2">
            {rendered.map((r) => (
              <li key={r.stage} className="relative">
                <span
                  className={cn(
                    'absolute -right-[22px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center',
                    r.status === 'completed' && 'bg-success border-success text-success-foreground',
                    r.status === 'current' && 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20',
                    r.status === 'upcoming' && 'bg-background border-border',
                  )}
                >
                  {r.status === 'completed' && <Check className="h-2.5 w-2.5" />}
                </span>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className={cn('text-sm font-medium', r.status === 'upcoming' && 'text-muted-foreground')}>
                      {r.label}
                    </div>
                    {r.step?.entityNumber && (
                      <div className="text-[11px] text-muted-foreground tabular-nums">{r.step.entityNumber}</div>
                    )}
                  </div>
                  {r.step?.entityId && r.step?.entityNumber && (
                    <EntityLink type={r.entityType} id={r.step.entityId}>
                      <span className="text-xs text-primary">عرض</span>
                    </EntityLink>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Desktop: horizontal glowing timeline
  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-gradient-to-l from-primary/5 via-card to-card p-4',
        className,
      )}
      role="list"
      aria-label="مراحل المستند"
    >
      <div className="flex items-center gap-0 w-full">
        {rendered.map((r, idx) => {
          const Icon = r.icon;
          return (
            <React.Fragment key={r.stage}>
              <div role="listitem" className="flex flex-col items-center gap-2 min-w-0 flex-1">
                <div
                  className={cn(
                    'h-11 w-11 rounded-full flex items-center justify-center border-2 transition-all',
                    r.status === 'completed' && 'bg-success/10 border-success text-success',
                    r.status === 'current' && 'bg-primary/10 border-primary text-primary ring-4 ring-primary/20 shadow-lg shadow-primary/20',
                    r.status === 'upcoming' && 'bg-muted/40 border-border text-muted-foreground',
                  )}
                >
                  {r.status === 'completed' ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="text-center">
                  <div className={cn('text-xs font-semibold', r.status === 'upcoming' && 'text-muted-foreground')}>
                    {r.label}
                  </div>
                  {r.step?.entityId && r.step?.entityNumber ? (
                    <EntityLink type={r.entityType} id={r.step.entityId}>
                      <span className="text-[10px] text-primary tabular-nums">{r.step.entityNumber}</span>
                    </EntityLink>
                  ) : (
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      {r.step?.entityNumber ?? '—'}
                    </div>
                  )}
                </div>
              </div>
              {idx < rendered.length - 1 && (
                <div
                  aria-hidden
                  className={cn(
                    'h-0.5 flex-1 mx-1 rounded-full transition-colors',
                    idx < currentIndex ? 'bg-success/60' : 'bg-border',
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {variant === 'procurement' && (
        <span className="sr-only">دورة المشتريات</span>
      )}
    </div>
  );
}

export default DocumentCycleShell;
