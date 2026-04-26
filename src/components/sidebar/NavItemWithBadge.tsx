import { memo, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { createPrefetchHandler, getRouteNameFromPath } from '@/lib/prefetch';

interface NavItemWithBadgeProps {
  title: string;
  href: string;
  icon: React.ElementType;
  count?: number;
  countColor?: 'default' | 'destructive' | 'warning' | 'success' | 'info';
  sectionColor?: string;
  sectionBgColor?: string;
  collapsed?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (href: string, title: string) => void;
}

const countColors = {
  default: 'bg-muted text-muted-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  warning: 'bg-amber-500 text-white',
  success: 'bg-emerald-500 text-white',
  info: 'bg-blue-500 text-white',
};

function NavItemWithBadge({
  title,
  href,
  icon: Icon,
  count,
  countColor = 'default',
  sectionColor,
  sectionBgColor,
  collapsed = false,
  isFavorite = false,
  onToggleFavorite,
}: NavItemWithBadgeProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === href;

  // Build a single hover-prefetch handler keyed to this href. `useMemo`
  // ensures we don't churn a new closure (and a new "first hover") on
  // every render — important since this list re-renders on route change.
  const prefetchOnIntent = useMemo(() => {
    const routeName = getRouteNameFromPath(href);
    return routeName ? createPrefetchHandler(routeName) : undefined;
  }, [href]);

  const handleClick = () => {
    navigate(href);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(href, title);
  };

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? 'secondary' : 'ghost'}
            size="icon"
            className={cn(
              'w-full h-10 relative transition-all duration-200',
              isActive && sectionBgColor && `${sectionBgColor}`,
              'hover:scale-105'
            )}
            onClick={handleClick}
            onMouseEnter={prefetchOnIntent}
            onFocus={prefetchOnIntent}
            onTouchStart={prefetchOnIntent}
          >
            <div className={cn(
              'p-1.5 rounded-md transition-colors',
              isActive ? sectionBgColor : 'bg-transparent hover:bg-muted/50'
            )}>
              <Icon className={cn(
                'h-5 w-5 transition-colors',
                isActive ? sectionColor : 'text-muted-foreground',
                !isActive && sectionColor && `hover:${sectionColor}`
              )} />
            </div>
            {count !== undefined && count > 0 && (
              <span className={cn(
                'absolute -top-1 -left-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold shadow-sm',
                countColors[countColor]
              )}>
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="flex items-center gap-2">
          {title}
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4">
              {count}
            </Badge>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="group relative">
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start gap-3 h-10 text-sm pr-3 transition-all duration-200',
          isActive && sectionBgColor && `${sectionBgColor}`,
          'hover:translate-x-1'
        )}
        onClick={handleClick}
      >
        <div className={cn(
          'p-1.5 rounded-md transition-colors',
          isActive ? sectionBgColor : 'bg-muted/50'
        )}>
          <Icon className={cn(
            'h-4 w-4 shrink-0 transition-colors',
            isActive ? sectionColor : 'text-muted-foreground',
            !isActive && `group-hover:${sectionColor}`
          )} style={{
            color: isActive ? undefined : undefined
          }} />
        </div>
        <span className={cn(
          'truncate flex-1 text-right transition-colors',
          isActive && sectionColor
        )}>{title}</span>
        
        {count !== undefined && count > 0 && (
          <Badge
            variant="secondary"
            className={cn(
              'ml-auto text-[10px] h-5 min-w-[20px] justify-center shadow-sm',
              countColors[countColor]
            )}
          >
            {count > 99 ? '99+' : count}
          </Badge>
        )}
      </Button>
      
      {/* Favorite toggle button */}
      {onToggleFavorite && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            isFavorite && 'opacity-100'
          )}
          onClick={handleFavoriteClick}
        >
          <Star
            className={cn(
              'h-3 w-3 transition-colors',
              isFavorite
                ? 'fill-amber-500 text-amber-500'
                : 'text-muted-foreground hover:text-amber-500'
            )}
          />
        </Button>
      )}
    </div>
  );
}

export default memo(NavItemWithBadge);
