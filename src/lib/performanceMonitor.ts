/**
 * Performance Monitoring Utility
 * Measures Core Web Vitals: FCP, LCP, CLS, FID, TTFB
 */

export interface PerformanceMetrics {
  fcp: number | null;  // First Contentful Paint
  lcp: number | null;  // Largest Contentful Paint
  cls: number | null;  // Cumulative Layout Shift
  fid: number | null;  // First Input Delay
  ttfb: number | null; // Time to First Byte
  tti: number | null;  // Time to Interactive (estimated)
}

type MetricCallback = (metric: { name: string; value: number; rating: 'good' | 'needs-improvement' | 'poor' }) => void;

const thresholds = {
  fcp: { good: 1800, poor: 3000 },
  lcp: { good: 2500, poor: 4000 },
  cls: { good: 0.1, poor: 0.25 },
  fid: { good: 100, poor: 300 },
  ttfb: { good: 800, poor: 1800 },
};

function getRating(name: keyof typeof thresholds, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = thresholds[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

let metricsStore: PerformanceMetrics = {
  fcp: null,
  lcp: null,
  cls: null,
  fid: null,
  ttfb: null,
  tti: null,
};

let callbacks: MetricCallback[] = [];

/**
 * Subscribe to performance metrics updates
 */
export function onMetric(callback: MetricCallback): () => void {
  callbacks.push(callback);
  return () => {
    callbacks = callbacks.filter(cb => cb !== callback);
  };
}

function reportMetric(name: string, value: number) {
  const rating = getRating(name as keyof typeof thresholds, value);
  callbacks.forEach(cb => cb({ name, value, rating }));
  
  // Log to console in development
  if (import.meta.env.DEV) {
    const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`[Performance] ${emoji} ${name.toUpperCase()}: ${value.toFixed(2)}ms (${rating})`);
  }
}

/**
 * Measure First Contentful Paint
 */
function measureFCP() {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          metricsStore.fcp = entry.startTime;
          reportMetric('fcp', entry.startTime);
          observer.disconnect();
        }
      }
    });
    observer.observe({ type: 'paint', buffered: true });
  } catch (e) {
    // Safari doesn't support paint observer
  }
}

/**
 * Measure Largest Contentful Paint
 */
function measureLCP() {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        metricsStore.lcp = lastEntry.startTime;
        reportMetric('lcp', lastEntry.startTime);
      }
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });

    // Disconnect on interaction or visibility change
    const cleanup = () => {
      observer.disconnect();
      document.removeEventListener('keydown', cleanup);
      document.removeEventListener('click', cleanup);
      document.removeEventListener('visibilitychange', cleanup);
    };
    
    document.addEventListener('keydown', cleanup, { once: true });
    document.addEventListener('click', cleanup, { once: true });
    document.addEventListener('visibilitychange', cleanup, { once: true });
  } catch (e) {
    // Not supported
  }
}

/**
 * Measure Cumulative Layout Shift
 */
function measureCLS() {
  if (!('PerformanceObserver' in window)) return;

  let clsValue = 0;
  let sessionValue = 0;
  let sessionEntries: PerformanceEntry[] = [];

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!layoutShiftEntry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          // If the entry occurred less than 1 second after the previous entry
          // and less than 5 seconds after the first entry in the session
          if (
            sessionValue &&
            firstSessionEntry &&
            lastSessionEntry &&
            entry.startTime - lastSessionEntry.startTime < 1000 &&
            entry.startTime - firstSessionEntry.startTime < 5000
          ) {
            sessionValue += layoutShiftEntry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = layoutShiftEntry.value;
            sessionEntries = [entry];
          }

          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            metricsStore.cls = clsValue;
            reportMetric('cls', clsValue * 1000); // Convert to ms-like scale for consistency
          }
        }
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    // Not supported
  }
}

/**
 * Measure First Input Delay
 */
function measureFID() {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        const value = fidEntry.processingStart - fidEntry.startTime;
        metricsStore.fid = value;
        reportMetric('fid', value);
        observer.disconnect();
      }
    });
    observer.observe({ type: 'first-input', buffered: true });
  } catch (e) {
    // Not supported
  }
}

/**
 * Measure Time to First Byte
 */
function measureTTFB() {
  try {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      metricsStore.ttfb = ttfb;
      reportMetric('ttfb', ttfb);
    }
  } catch (e) {
    // Not supported
  }
}

/**
 * Estimate Time to Interactive
 */
function measureTTI() {
  // Simple estimation based on load event
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        const tti = navigationEntry.domInteractive;
        metricsStore.tti = tti;
        if (import.meta.env.DEV) {
          console.log(`[Performance] ℹ️ TTI (estimated): ${tti.toFixed(2)}ms`);
        }
      }
    }, 0);
  });
}

/**
 * Initialize all performance measurements
 */
export function measureWebVitals(): void {
  if (typeof window === 'undefined') return;
  
  measureFCP();
  measureLCP();
  measureCLS();
  measureFID();
  measureTTFB();
  measureTTI();
}

/**
 * Get current metrics snapshot
 */
export function getMetrics(): PerformanceMetrics {
  return { ...metricsStore };
}

/**
 * Get performance summary
 */
export function getPerformanceSummary(): { 
  score: number; 
  metrics: PerformanceMetrics;
  ratings: Record<string, 'good' | 'needs-improvement' | 'poor' | 'unknown'>;
} {
  const metrics = getMetrics();
  const ratings: Record<string, 'good' | 'needs-improvement' | 'poor' | 'unknown'> = {};
  let totalScore = 0;
  let measuredCount = 0;

  // Calculate ratings
  Object.entries(metrics).forEach(([key, value]) => {
    if (value !== null && key in thresholds) {
      const rating = getRating(key as keyof typeof thresholds, value);
      ratings[key] = rating;
      totalScore += rating === 'good' ? 100 : rating === 'needs-improvement' ? 50 : 0;
      measuredCount++;
    } else {
      ratings[key] = 'unknown';
    }
  });

  return {
    score: measuredCount > 0 ? Math.round(totalScore / measuredCount) : 0,
    metrics,
    ratings,
  };
}

/**
 * Log bundle size info (for development)
 */
export function logBundleInfo(): void {
  if (import.meta.env.DEV) {
    // Log resource timing
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter(r => r.name.endsWith('.js') || r.name.includes('.js?'));
    const cssResources = resources.filter(r => r.name.endsWith('.css') || r.name.includes('.css?'));
    
    const totalJsSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const totalCssSize = cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    
    console.log('[Performance] 📦 Bundle Analysis:');
    console.log(`  JS: ${(totalJsSize / 1024).toFixed(2)} KB (${jsResources.length} files)`);
    console.log(`  CSS: ${(totalCssSize / 1024).toFixed(2)} KB (${cssResources.length} files)`);
    console.log(`  Total: ${((totalJsSize + totalCssSize) / 1024).toFixed(2)} KB`);
  }
}
