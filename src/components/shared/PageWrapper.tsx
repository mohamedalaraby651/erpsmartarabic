import { ReactNode, memo } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageErrorBoundary } from './PageErrorBoundary';
import { cn } from '@/lib/utils';

interface PageWrapperProps {
  title?: string;
  children: ReactNode;
  className?: string;
  /** Disable entrance animation */
  noAnimation?: boolean;
}

/**
 * Unified page wrapper providing:
 * 1. Dynamic document.title (SEO)
 * 2. Error boundary with retry
 * 3. Consistent layout & entrance animation
 */
function PageWrapperInner({ title, children, className, noAnimation }: PageWrapperProps) {
  usePageTitle(title);

  return (
    <PageErrorBoundary>
      <div
        className={cn(
          !noAnimation && 'animate-fade-in duration-200',
          className
        )}
      >
        {children}
      </div>
    </PageErrorBoundary>
  );
}

export const PageWrapper = memo(PageWrapperInner);
export default PageWrapper;
