import { supabase } from '@/integrations/supabase/client';

// =============================================
// STRUCTURED LOGGING
// =============================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLog {
  level: LogLevel;
  message: string;
  context: {
    userId?: string;
    tenantId?: string;
    endpoint?: string;
    duration_ms?: number;
    error_code?: string;
    component?: string;
    action?: string;
    metadata?: Record<string, unknown>;
  };
  timestamp: string;
}

/**
 * Log a structured event
 */
export function logStructured(log: StructuredLog): void {
  const formattedLog = {
    ...log,
    timestamp: log.timestamp || new Date().toISOString(),
  };

  // In development, pretty print to console
  if (import.meta.env.DEV) {
    const colors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    
    console.log(
      `${colors[log.level]}[${log.level.toUpperCase()}]${reset} ${log.message}`,
      log.context
    );
    return;
  }

  // In production, send to backend (could be Edge Function)
  // For now, we'll use console.log with JSON format
  console.log(JSON.stringify(formattedLog));
}

/**
 * Convenience method for debug logs
 */
export function logDebug(message: string, context: StructuredLog['context'] = {}): void {
  logStructured({
    level: 'debug',
    message,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Convenience method for info logs
 */
export function logInfo(message: string, context: StructuredLog['context'] = {}): void {
  logStructured({
    level: 'info',
    message,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Convenience method for warning logs
 */
export function logWarn(message: string, context: StructuredLog['context'] = {}): void {
  logStructured({
    level: 'warn',
    message,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Convenience method for error logs
 */
export function logError(message: string, context: StructuredLog['context'] = {}): void {
  logStructured({
    level: 'error',
    message,
    context,
    timestamp: new Date().toISOString(),
  });
}

// =============================================
// PERFORMANCE METRICS
// =============================================

export interface PerformanceMetric {
  name: string;
  value: number;
  labels?: Record<string, string>;
}

/**
 * Record a performance metric to the database
 * Note: Uses raw insert since types aren't generated yet
 */
export async function recordMetric(metric: PerformanceMetric): Promise<void> {
  try {
    // Use a raw query approach since the table is new
    const { error } = await supabase
      .from('performance_metrics' as never)
      .insert({
        metric_name: metric.name,
        metric_value: metric.value,
        labels: metric.labels || {},
      } as never);

    if (error && import.meta.env.DEV) {
      console.error('Failed to record metric:', error);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Error recording metric:', err);
    }
  }
}

/**
 * Measure and record execution time of an async function
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  labels?: Record<string, string>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    await recordMetric({
      name: `${name}_duration_ms`,
      value: duration,
      labels: { ...labels, status: 'success' },
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    
    await recordMetric({
      name: `${name}_duration_ms`,
      value: duration,
      labels: { ...labels, status: 'error' },
    });
    
    throw error;
  }
}

/**
 * Create a timer for manual timing
 */
export function startTimer(): () => number {
  const start = performance.now();
  return () => performance.now() - start;
}

// =============================================
// WEB VITALS
// =============================================

export interface WebVitals {
  lcp?: number;  // Largest Contentful Paint
  fid?: number;  // First Input Delay
  cls?: number;  // Cumulative Layout Shift
  fcp?: number;  // First Contentful Paint
  ttfb?: number; // Time to First Byte
}

/**
 * Collect and report Web Vitals
 */
export function reportWebVitals(onReport: (vitals: WebVitals) => void): void {
  if (typeof window === 'undefined') return;

  const vitals: WebVitals = {};

  // Observe LCP
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        vitals.lcp = lastEntry.startTime;
        onReport({ ...vitals });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // LCP not supported
    }

    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          if ('processingStart' in entry) {
            vitals.fid = (entry as PerformanceEventTiming).processingStart - entry.startTime;
            onReport({ ...vitals });
          }
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch {
      // FID not supported
    }

    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        let clsValue = 0;
        entryList.getEntries().forEach((entry) => {
          if ('hadRecentInput' in entry && !(entry as LayoutShift).hadRecentInput) {
            clsValue += (entry as LayoutShift).value;
          }
        });
        vitals.cls = clsValue;
        onReport({ ...vitals });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // CLS not supported
    }
  }

  // Get FCP and TTFB from Navigation Timing
  if ('performance' in window && 'getEntriesByType' in performance) {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const navEntry = navEntries[0] as PerformanceNavigationTiming;
      vitals.ttfb = navEntry.responseStart;
    }

    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach((entry) => {
      if (entry.name === 'first-contentful-paint') {
        vitals.fcp = entry.startTime;
      }
    });

    onReport({ ...vitals });
  }
}

// TypeScript interfaces for Performance API
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
}

interface LayoutShift extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}
