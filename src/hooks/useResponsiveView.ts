/**
 * useResponsiveView - Hook for managing responsive view modes
 * 
 * Returns:
 * - effectiveView: The actual view being used (considers auto mode)
 * - setViewMode: Function to change view mode
 * - viewMode: The current mode setting ('auto', 'list', 'grid', 'table')
 * - isMobile: Whether current device is mobile
 * - isListView: Boolean shorthand for list view
 * - isGridView: Boolean shorthand for grid view
 * - isTableView: Boolean shorthand for table view
 */

import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export type ViewMode = 'list' | 'grid' | 'table' | 'auto';

export function useResponsiveView(defaultView: ViewMode = 'auto') {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);

  // Calculate effective view based on viewMode and device
  const effectiveView = viewMode === 'auto' 
    ? (isMobile ? 'list' : 'table') 
    : viewMode;

  return { 
    effectiveView, 
    setViewMode, 
    viewMode,
    isMobile,
    isListView: effectiveView === 'list',
    isGridView: effectiveView === 'grid',
    isTableView: effectiveView === 'table',
  };
}

