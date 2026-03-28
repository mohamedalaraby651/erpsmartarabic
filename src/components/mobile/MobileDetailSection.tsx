import { memo, ReactNode } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

type Priority = 'high' | 'medium' | 'low';

interface MobileDetailSectionProps {
  title: string;
  priority?: Priority;
  icon?: ReactNode;
  badge?: number | string;
  children: ReactNode;
  className?: string;
}

/**
 * Unified collapsible section for detail pages on mobile.
 * - priority="high"   → always visible, not collapsible
 * - priority="medium" → open by default, collapsible
 * - priority="low"    → collapsed by default, collapsible
 * On desktop, renders children directly without collapsible wrapper.
 */
function MobileDetailSection({
  title,
  priority = 'medium',
  icon,
  badge,
  children,
  className,
}: MobileDetailSectionProps) {
  const isMobile = useIsMobile();

  // Desktop: render children directly
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  // Mobile high priority: always visible, no collapse
  if (priority === 'high') {
    return <div className={className}>{children}</div>;
  }

  const defaultOpen = priority === 'medium';

  return (
    <Collapsible defaultOpen={defaultOpen} className={cn('rounded-xl border border-border/50 bg-card/50', className)}>
      <CollapsibleTrigger className="flex w-full items-center justify-between p-4 min-h-[44px] group">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className="font-semibold text-sm">{title}</span>
          {badge !== undefined && (
            <Badge variant="secondary" className="text-[10px] h-5 min-w-5 px-1.5">
              {badge}
            </Badge>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default memo(MobileDetailSection);
