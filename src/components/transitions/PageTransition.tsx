import { memo, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade';
  duration?: 'fast' | 'normal' | 'slow';
}

const directionClasses = {
  up: 'animate-slide-up',
  down: 'animate-slide-down',
  left: 'animate-slide-in-left',
  right: 'animate-slide-in-right',
  fade: 'animate-fade-in',
};

const durationClasses = {
  fast: 'duration-150',
  normal: 'duration-300',
  slow: 'duration-500',
};

function PageTransition({
  children,
  className,
  direction = 'fade',
  duration = 'normal',
}: PageTransitionProps) {
  return (
    <div
      className={cn(
        directionClasses[direction],
        durationClasses[duration],
        className
      )}
    >
      {children}
    </div>
  );
}

export default memo(PageTransition);
