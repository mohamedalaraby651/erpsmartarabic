import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export type ViewMode = 'list' | 'grid' | 'table' | 'auto';

export function useResponsiveView(defaultView: ViewMode = 'auto') {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);

  // Calculate effective view based on viewMode and device
  const effectiveView = viewMode === 'auto' 
    ? (isMobile ? 'list' : 'table') 
    : viewMode;

  // Reset to auto when device changes
  useEffect(() => {
    if (viewMode === 'auto') return;
    // Keep user preference if they explicitly set it
  }, [isMobile]);

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

