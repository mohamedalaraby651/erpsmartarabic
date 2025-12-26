import { useState, useCallback, useRef } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  className,
  disabled = false 
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshComplete, setRefreshComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const THRESHOLD = 80;
  const MAX_PULL = 120;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled) return;
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      const distance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(distance);
    }
  }, [isPulling, disabled]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;
    
    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD);
      
      try {
        await onRefresh();
        setRefreshComplete(true);
        setTimeout(() => setRefreshComplete(false), 1000);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsPulling(false);
    setPullDistance(0);
  }, [isPulling, pullDistance, isRefreshing, onRefresh, disabled]);

  const indicatorOpacity = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = (pullDistance / THRESHOLD) * 360;
  const scale = 0.5 + (pullDistance / THRESHOLD) * 0.5;

  return (
    <div
      ref={containerRef}
      className={cn('overflow-y-auto relative', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'flex flex-col items-center justify-center transition-all duration-200 overflow-hidden',
          refreshComplete && 'text-success'
        )}
        style={{
          height: pullDistance,
          opacity: indicatorOpacity,
        }}
      >
        {isRefreshing ? (
          <div className="flex flex-col items-center gap-1">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">جاري التحديث...</span>
          </div>
        ) : refreshComplete ? (
          <div className="flex flex-col items-center gap-1">
            <RefreshCw className="h-6 w-6 text-success" />
            <span className="text-xs text-success">تم التحديث!</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <RefreshCw
              className="h-6 w-6 text-primary transition-transform"
              style={{ 
                transform: `rotate(${rotation}deg) scale(${scale})`,
              }}
            />
            <span className="text-xs text-muted-foreground">
              {pullDistance >= THRESHOLD ? 'اترك للتحديث' : 'اسحب للتحديث'}
            </span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: !isPulling ? 'transform 0.3s ease-out' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
