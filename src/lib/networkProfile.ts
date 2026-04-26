/**
 * networkProfile — كاشف ذكي لسرعة الشبكة وقدرات الجهاز
 *
 * يستخدم Network Information API + Device Memory API + Hardware Concurrency
 * لتحديد ملف أداء الجهاز (low/medium/high) واقتراح إعدادات timeout والجدولة المناسبة.
 *
 * يمكن للمستخدم تجاوز القيم تلقائياً عبر AdaptivePerformanceSettings.
 */

export type NetworkTier = 'slow' | 'medium' | 'fast';
export type DeviceTier = 'low' | 'medium' | 'high';

export interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'unknown';
  downlinkMbps: number;
  rttMs: number;
  saveData: boolean;
  tier: NetworkTier;
}

export interface DeviceInfo {
  memoryGb: number;
  cores: number;
  tier: DeviceTier;
}

export interface AdaptiveProfile {
  network: NetworkInfo;
  device: DeviceInfo;
  // إعدادات مقترحة (يمكن تجاوزها يدوياً)
  recommended: {
    queryTimeoutMs: number;
    syncTimeoutMs: number;
    prefetchEnabled: boolean;
    prefetchOnHover: boolean;
    prefetchOnIdle: boolean;
    backgroundSyncIntervalMs: number;
    imageQuality: 'low' | 'medium' | 'high';
    enableAnimations: boolean;
  };
}

interface NetworkConnection {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (event: string, handler: () => void) => void;
  removeEventListener?: (event: string, handler: () => void) => void;
}

function getConnection(): NetworkConnection | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & {
    connection?: NetworkConnection;
    mozConnection?: NetworkConnection;
    webkitConnection?: NetworkConnection;
  };
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

export function detectNetwork(): NetworkInfo {
  const conn = getConnection();
  const effectiveType = (conn?.effectiveType as NetworkInfo['effectiveType']) || 'unknown';
  const downlinkMbps = conn?.downlink ?? 10;
  const rttMs = conn?.rtt ?? 100;
  const saveData = conn?.saveData ?? false;

  let tier: NetworkTier = 'fast';
  if (saveData || effectiveType === '2g' || effectiveType === '3g' || downlinkMbps < 1.5) {
    tier = 'slow';
  } else if (downlinkMbps < 5 || rttMs > 300) {
    tier = 'medium';
  }

  return { effectiveType, downlinkMbps, rttMs, saveData, tier };
}

export function detectDevice(): DeviceInfo {
  if (typeof navigator === 'undefined') {
    return { memoryGb: 4, cores: 4, tier: 'medium' };
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memoryGb = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;

  let tier: DeviceTier = 'high';
  if (memoryGb <= 2 || cores <= 2) tier = 'low';
  else if (memoryGb <= 4 || cores <= 4) tier = 'medium';

  return { memoryGb, cores, tier };
}

/**
 * يحسب الإعدادات الموصى بها حسب الشبكة والجهاز.
 * المنطق: كلما كانت الشبكة أبطأ أو الجهاز أضعف، زادت timeouts وقلّ prefetch/sync.
 */
export function computeRecommended(
  network: NetworkInfo,
  device: DeviceInfo,
): AdaptiveProfile['recommended'] {
  // Slow network OR low device → conservative
  if (network.tier === 'slow' || device.tier === 'low' || network.saveData) {
    return {
      queryTimeoutMs: 30000,
      syncTimeoutMs: 60000,
      prefetchEnabled: false,
      prefetchOnHover: false,
      prefetchOnIdle: false,
      backgroundSyncIntervalMs: 15 * 60 * 1000, // 15 دقيقة
      imageQuality: 'low',
      enableAnimations: false,
    };
  }

  // Medium
  if (network.tier === 'medium' || device.tier === 'medium') {
    return {
      queryTimeoutMs: 15000,
      syncTimeoutMs: 30000,
      prefetchEnabled: true,
      prefetchOnHover: true,
      prefetchOnIdle: false,
      backgroundSyncIntervalMs: 5 * 60 * 1000, // 5 دقائق
      imageQuality: 'medium',
      enableAnimations: true,
    };
  }

  // Fast network + high-end device → aggressive
  return {
    queryTimeoutMs: 8000,
    syncTimeoutMs: 15000,
    prefetchEnabled: true,
    prefetchOnHover: true,
    prefetchOnIdle: true,
    backgroundSyncIntervalMs: 2 * 60 * 1000, // 2 دقائق
    imageQuality: 'high',
    enableAnimations: true,
  };
}

export function getAdaptiveProfile(): AdaptiveProfile {
  const network = detectNetwork();
  const device = detectDevice();
  return {
    network,
    device,
    recommended: computeRecommended(network, device),
  };
}

/**
 * يتيح الاشتراك في تغييرات حالة الشبكة.
 */
export function onNetworkChange(callback: (info: NetworkInfo) => void): () => void {
  const conn = getConnection();
  if (!conn?.addEventListener) return () => { /* noop */ };
  const handler = () => callback(detectNetwork());
  conn.addEventListener('change', handler);
  return () => conn.removeEventListener?.('change', handler);
}
