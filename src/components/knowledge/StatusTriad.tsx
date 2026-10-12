import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  APPROVAL_LABELS, EXECUTION_LABELS, VERIFICATION_LABELS, type KnowledgeStatus,
} from '@/domain/knowledge';

const tone = (known: boolean, good: boolean) =>
  !known ? 'border-dashed text-muted-foreground' : good ? 'border-success/40 bg-success/10 text-success' : 'border-warning/40 bg-warning/10 text-warning';

/** Three independent status badges — execution, verification, approval. */
export function StatusTriad({ status, compact = false }: { status: KnowledgeStatus; compact?: boolean }) {
  const items = [
    { label: 'التنفيذ', value: EXECUTION_LABELS[status.execution], known: status.execution !== 'unknown', good: status.execution === 'executed' },
    { label: 'التحقق', value: VERIFICATION_LABELS[status.verification], known: status.verification !== 'unknown', good: status.verification === 'verified' },
    { label: 'الاعتماد', value: APPROVAL_LABELS[status.approval], known: status.approval !== 'unknown', good: status.approval === 'accepted' },
  ];
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="حالة السجل">
      {items.map((i) => (
        <li key={i.label}>
          <Badge variant="outline" className={cn('gap-1 font-normal', tone(i.known, i.good), compact && 'text-[11px] px-1.5')}>
            <span className="text-muted-foreground">{i.label}:</span>
            <span>{i.value}</span>
          </Badge>
        </li>
      ))}
    </ul>
  );
}
