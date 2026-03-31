import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileDetailHeaderProps {
  title: string;
  backTo: string;
  action?: ReactNode;
}

/**
 * Persistent back-button header for detail pages on mobile.
 * Only renders on mobile viewports.
 */
export function MobileDetailHeader({ title, backTo, action }: MobileDetailHeaderProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  if (!isMobile) return null;

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b bg-background px-3 py-2 -mx-3 -mt-3 mb-3 md:hidden">
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 min-h-11 min-w-11"
          onClick={() => navigate(backTo)}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-semibold truncate">{title}</h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
