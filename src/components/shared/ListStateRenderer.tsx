import { ReactNode, memo } from 'react';
import { LucideIcon } from 'lucide-react';
import { MobileListSkeleton } from '@/components/mobile/MobileListSkeleton';
import { ListErrorState } from './ListErrorState';
import { EmptyState } from './EmptyState';

interface ListStateRendererProps<T> {
  /** Loaded data array */
  data: T[];
  /** Initial fetch loading flag */
  isLoading: boolean;
  /** Error from query (TanStack Query / RPC) */
  error?: Error | unknown | null;
  /** Whether the user has filters/search applied */
  hasFilters?: boolean;

  /** Retry handler — usually `refetch` from useQuery */
  onRetry?: () => void;
  /** Reset filters when no results match the active filters */
  onClearFilters?: () => void;

  /** Empty state config when there is no data at all */
  empty: {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void; icon?: LucideIcon };
  };

  /** Render the actual list content when data is present */
  children: ReactNode;

  /** Skeleton variant + count */
  skeletonVariant?: 'default' | 'invoice' | 'order' | 'employee' | 'product';
  skeletonCount?: number;
}

/**
 * Unified loading / error / empty / data renderer for all primary mobile lists.
 * Handles the four canonical states with consistent spacing, animation, and tone.
 */
function ListStateRendererInner<T>({
  data,
  isLoading,
  error,
  hasFilters,
  onRetry,
  onClearFilters,
  empty,
  children,
  skeletonVariant = 'default',
  skeletonCount = 6,
}: ListStateRendererProps<T>) {
  // 1. Loading
  if (isLoading && data.length === 0) {
    return <MobileListSkeleton count={skeletonCount} variant={skeletonVariant} />;
  }

  // 2. Error (only if no cached data)
  if (error && data.length === 0) {
    return <ListErrorState error={error} onRetry={onRetry} />;
  }

  // 3. Empty - filtered
  if (data.length === 0 && hasFilters) {
    return (
      <EmptyState
        icon={empty.icon}
        title="لا توجد نتائج مطابقة"
        description="جرب تعديل أو مسح الفلاتر للعثور على ما تبحث عنه."
        action={
          onClearFilters
            ? { label: 'مسح الفلاتر', onClick: onClearFilters, variant: 'outline' }
            : undefined
        }
        compact
      />
    );
  }

  // 4. Empty - no data at all
  if (data.length === 0) {
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        action={empty.action}
      />
    );
  }

  // 5. Data
  return <>{children}</>;
}

export const ListStateRenderer = memo(ListStateRendererInner) as typeof ListStateRendererInner;
export default ListStateRenderer;
