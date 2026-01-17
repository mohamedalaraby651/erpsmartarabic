import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-8' : 'py-12',
      className
    )}>
      <div className={cn(
        'rounded-full bg-muted flex items-center justify-center mb-4',
        compact ? 'h-12 w-12' : 'h-16 w-16'
      )}>
        <Icon className={cn(
          'text-muted-foreground',
          compact ? 'h-6 w-6' : 'h-8 w-8'
        )} />
      </div>
      
      <h3 className={cn(
        'font-semibold mb-1',
        compact ? 'text-base' : 'text-lg'
      )}>
        {title}
      </h3>
      
      {description && (
        <p className={cn(
          'text-muted-foreground max-w-[250px]',
          compact ? 'text-xs mb-3' : 'text-sm mb-4'
        )}>
          {description}
        </p>
      )}
      
      {action && (
        <Button 
          onClick={action.onClick}
          size={compact ? 'sm' : 'default'}
          className="gap-2"
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
