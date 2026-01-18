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
      'flex flex-col items-center justify-center text-center animate-fade-in',
      compact ? 'py-8' : 'py-16',
      className
    )}>
      <div className="relative mb-6">
        <div className={cn(
          'rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-inner',
          compact ? 'h-14 w-14' : 'h-20 w-20'
        )}>
          <Icon className={cn(
            'text-muted-foreground/50',
            compact ? 'h-7 w-7' : 'h-10 w-10'
          )} />
        </div>
        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background border-2 border-muted flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        </div>
      </div>
      
      <h3 className={cn(
        'font-semibold text-foreground mb-2',
        compact ? 'text-base' : 'text-lg'
      )}>
        {title}
      </h3>
      
      {description && (
        <p className={cn(
          'text-muted-foreground max-w-[280px] leading-relaxed',
          compact ? 'text-xs mb-4' : 'text-sm mb-6'
        )}>
          {description}
        </p>
      )}
      
      {action && (
        <Button 
          onClick={action.onClick}
          size={compact ? 'sm' : 'default'}
          className="gap-2 shadow-md hover:shadow-lg transition-shadow"
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
