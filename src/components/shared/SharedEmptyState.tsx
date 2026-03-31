import { memo, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Package, Search, FileX, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SharedEmptyStateProps {
  /** 'no-data' = first time, 'no-results' = filtered empty */
  type?: 'no-data' | 'no-results';
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Primary action (e.g. Add new) */
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  /** Secondary action (e.g. Reset filters) */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

function SharedEmptyStateInner({
  type = 'no-data',
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: SharedEmptyStateProps) {
  const DefaultIcon = type === 'no-results' ? Search : type === 'no-data' ? Package : FileX;
  const DisplayIcon = Icon || DefaultIcon;

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)} dir="rtl">
      {/* Gradient icon container */}
      <div className={cn(
        'mb-5 p-5 rounded-2xl',
        type === 'no-results'
          ? 'bg-gradient-to-br from-warning/10 to-warning/5'
          : 'bg-gradient-to-br from-primary/10 to-primary/5'
      )}>
        <DisplayIcon className={cn(
          'h-10 w-10',
          type === 'no-results' ? 'text-warning' : 'text-primary'
        )} strokeWidth={1.5} />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1.5">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-5">
          {description}
        </p>
      )}

      <div className="flex items-center gap-2">
        {action && (
          <Button onClick={action.onClick} size="sm" className="gap-1.5">
            {action.icon}
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button onClick={secondaryAction.onClick} variant="outline" size="sm">
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

export const SharedEmptyState = memo(SharedEmptyStateInner);
export default SharedEmptyState;
