/**
 * Build Info — exposes the build stamp injected by Vite via `define`.
 *
 * Used by:
 *   - <EnvironmentBadge /> to detect dev/preview/production
 *   - The "About" section of UnifiedSettingsPage to show which version is live
 *   - Future cache-busting logic (compare against /version.json)
 *
 * The constants are inlined at build time so reading them is free at runtime.
 */

declare const __BUILD_TIME__: string | undefined;
declare const __BUILD_ID__: string | undefined;

export type EnvironmentKind = 'development' | 'preview' | 'production' | 'sandbox';

/**
 * Detect which environment the app is running in based on the host name.
 *
 *  - `development` : Vite dev server (localhost / sandbox)
 *  - `preview`     : `id-preview--*.lovable.app` (Lovable Cloud Dev backend)
 *  - `production`  : the published `*.lovable.app` URL or a custom domain
 *  - `sandbox`     : in-editor preview iframe (only when window is undefined)
 */
export function detectEnvironment(): EnvironmentKind {
  if (typeof window === 'undefined') return 'sandbox';
  const host = window.location.hostname;

  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
    return 'development';
  }
  if (host.includes('id-preview--') && host.endsWith('.lovable.app')) {
    return 'preview';
  }
  return 'production';
}

export interface BuildInfo {
  /** ISO timestamp when this bundle was built. */
  buildTime: string;
  /** Short identifier for the build (commit-style, generated at build time). */
  buildId: string;
  /** Detected environment based on host. */
  environment: EnvironmentKind;
  /** Whether this is the production deployment. */
  isProduction: boolean;
}

let cached: BuildInfo | null = null;

export function getBuildInfo(): BuildInfo {
  if (cached) return cached;
  const env = detectEnvironment();
  cached = {
    buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'unknown',
    buildId: typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev',
    environment: env,
    isProduction: env === 'production',
  };
  return cached;
}

/** Human-readable Arabic label for the current environment. */
export function getEnvironmentLabel(env: EnvironmentKind): string {
  switch (env) {
    case 'development': return 'وضع التطوير';
    case 'preview':     return 'بيئة المعاينة';
    case 'sandbox':     return 'صندوق المحرر';
    case 'production':  return 'النسخة المنشورة';
  }
}
