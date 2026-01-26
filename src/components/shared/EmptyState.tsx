import { LucideIcon, Lightbulb, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'default' | 'outline' | 'secondary';
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  tips?: string[];
  className?: string;
  compact?: boolean;
  illustration?: 'default' | 'search' | 'empty' | 'error';
}

// Animated background circles
function AnimatedBackground({ color }: { color?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn(
        'absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-10 animate-pulse',
        color || 'bg-primary'
      )} />
      <div className={cn(
        'absolute -bottom-2 -left-2 w-16 h-16 rounded-full opacity-5 animate-pulse delay-150',
        color || 'bg-primary'
      )} />
    </div>
  );
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  secondaryAction,
  tips,
  className,
  compact = false,
  illustration = 'default',
}: EmptyStateProps) {
  return (
    <div className={cn(
      'relative flex flex-col items-center justify-center text-center animate-fade-in',
      compact ? 'py-8 px-4' : 'py-16 px-6',
      className
    )}>
      <AnimatedBackground />
      
      {/* Icon Container with gradient */}
      <div className="relative mb-6">
        <div className={cn(
          'rounded-2xl bg-gradient-to-br from-muted via-muted/80 to-muted/50 flex items-center justify-center shadow-lg',
          compact ? 'h-16 w-16' : 'h-24 w-24'
        )}>
          <div className={cn(
            'rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center',
            compact ? 'h-12 w-12' : 'h-16 w-16'
          )}>
            <Icon className={cn(
              'text-muted-foreground/60',
              compact ? 'h-6 w-6' : 'h-8 w-8'
            )} />
          </div>
        </div>
        
        {/* Decorative dot */}
        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-primary/40" />
        </div>
      </div>
      
      {/* Title */}
      <h3 className={cn(
        'font-bold text-foreground mb-2',
        compact ? 'text-base' : 'text-xl'
      )}>
        {title}
      </h3>
      
      {/* Description */}
      {description && (
        <p className={cn(
          'text-muted-foreground max-w-[300px] leading-relaxed',
          compact ? 'text-xs mb-4' : 'text-sm mb-6'
        )}>
          {description}
        </p>
      )}
      
      {/* Tips Section */}
      {tips && tips.length > 0 && (
        <div className={cn(
          'w-full max-w-[320px] rounded-xl bg-muted/30 border border-border/50 p-4 mb-6',
          compact && 'p-3 mb-4'
        )}>
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-warning" />
            <span className="text-xs font-medium">نصائح مفيدة</span>
          </div>
          <ul className="space-y-1.5 text-right">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="shrink-0 mt-1 h-1 w-1 rounded-full bg-primary/50" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Actions */}
      <div className={cn('flex items-center gap-3', compact && 'flex-col w-full')}>
        {action && (
          <Button 
            onClick={action.onClick}
            size={compact ? 'sm' : 'default'}
            variant={action.variant || 'default'}
            className={cn(
              'gap-2 shadow-md hover:shadow-lg transition-all hover:scale-[1.02]',
              compact && 'w-full'
            )}
          >
            {action.icon && <action.icon className="h-4 w-4" />}
            {action.label}
          </Button>
        )}
        
        {secondaryAction && (
          <Button 
            onClick={secondaryAction.onClick}
            size={compact ? 'sm' : 'default'}
            variant={secondaryAction.variant || 'outline'}
            className={cn('gap-2', compact && 'w-full')}
          >
            {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4" />}
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

// Search Empty State
export function SearchEmptyState({ 
  query,
  onClear,
}: { 
  query: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={ArrowLeft}
      title="لا توجد نتائج"
      description={`لم نجد نتائج مطابقة لـ "${query}"`}
      tips={[
        'تأكد من كتابة الكلمات بشكل صحيح',
        'جرب استخدام كلمات مختلفة',
        'استخدم كلمات أقل للحصول على نتائج أكثر',
      ]}
      action={onClear ? {
        label: 'مسح البحث',
        onClick: onClear,
        variant: 'outline',
      } : undefined}
      compact
    />
  );
}

