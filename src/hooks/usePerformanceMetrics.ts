import { useState, useEffect, useCallback } from 'react';
import { 
  measureWebVitals, 
  onMetric, 
  getMetrics, 
  getPerformanceSummary,
  logBundleInfo,
  type PerformanceMetrics 
} from '@/lib/performanceMonitor';

interface MetricUpdate {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

interface UsePerformanceMetricsReturn {
  metrics: PerformanceMetrics;
  summary: {
    score: number;
    ratings: Record<string, 'good' | 'needs-improvement' | 'poor' | 'unknown'>;
  };
  isCollecting: boolean;
  latestUpdate: MetricUpdate | null;
  refresh: () => void;
}

/**
 * Hook to access performance metrics in components
 */
export function usePerformanceMetrics(): UsePerformanceMetricsReturn {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(getMetrics());
  const [latestUpdate, setLatestUpdate] = useState<MetricUpdate | null>(null);
  const [isCollecting, setIsCollecting] = useState(true);
  const [summary, setSummary] = useState(() => {
    const { score, ratings } = getPerformanceSummary();
    return { score, ratings };
  });

  useEffect(() => {
    // Start measuring
    measureWebVitals();
    
    // Log bundle info after load
    window.addEventListener('load', () => {
      setTimeout(logBundleInfo, 1000);
    });

    // Subscribe to updates
    const unsubscribe = onMetric((metric) => {
      setLatestUpdate(metric);
      setMetrics(getMetrics());
      const { score, ratings } = getPerformanceSummary();
      setSummary({ score, ratings });
    });

    // Stop collecting after 30 seconds
    const timeout = setTimeout(() => {
      setIsCollecting(false);
    }, 30000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const refresh = useCallback(() => {
    setMetrics(getMetrics());
    const { score, ratings } = getPerformanceSummary();
    setSummary({ score, ratings });
  }, []);

  return {
    metrics,
    summary,
    isCollecting,
    latestUpdate,
    refresh,
  };
}

/**
 * Simple hook to just initialize performance monitoring
 * Use this in App.tsx or main.tsx
 */
export function usePerformanceMonitoring(): void {
  useEffect(() => {
    measureWebVitals();
    
    // Log bundle info after load
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        setTimeout(logBundleInfo, 1000);
      });
    }
  }, []);
}
