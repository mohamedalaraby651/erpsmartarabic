import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdaptiveContainerProps {
  desktop: ReactNode;
  mobile: ReactNode;
}

/**
 * Render Strategy Pattern — centralizes platform-specific rendering.
 * Replaces scattered `if (isMobile)` checks throughout the codebase.
 */
export function AdaptiveContainer({ desktop, mobile }: AdaptiveContainerProps) {
  const isMobile = useIsMobile();
  return <>{isMobile ? mobile : desktop}</>;
}
