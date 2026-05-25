/**
 * Canary rollout decision for the v2 PDF engine (Phase 2).
 *
 * Resolution order (first match wins):
 *   1. localStorage `pdf_engine_v2 === '1'`       → force 100% (per-user QA)
 *   2. localStorage `pdf_engine_v2 === '0'`       → force 0%   (per-user opt-out)
 *   3. VITE_PDF_ENGINE_V2_PERCENT (0..100)        → deterministic hash bucket
 *   4. default                                    → 0% (legacy engine)
 *
 * The hash is computed over `tenant_id|docType` so a tenant either always
 * sees v2 for a given document type or never — preventing alternating
 * outputs that confuse end users.
 */

export interface CanaryInput {
  tenantId?: string | null;
  docType: string;
}

export interface CanaryDecision {
  useV2: boolean;
  percent: number;
  source: 'localStorage' | 'env' | 'default';
}

function readLocalStorageFlag(): '1' | '0' | null {
  try {
    const ls = typeof window !== 'undefined' ? window.localStorage : undefined;
    const v = ls?.getItem('pdf_engine_v2');
    if (v === '1' || v === '0') return v;
  } catch {
    /* private mode / SSR */
  }
  return null;
}

function readEnvPercent(): number {
  try {
    const raw = (import.meta as { env?: Record<string, string> }).env?.VITE_PDF_ENGINE_V2_PERCENT;
    if (!raw) return 0;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  } catch {
    return 0;
  }
}

/** Stable, fast 32-bit FNV-1a hash. */
export function hashKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function decideCanary(input: CanaryInput): CanaryDecision {
  const ls = readLocalStorageFlag();
  if (ls === '1') return { useV2: true, percent: 100, source: 'localStorage' };
  if (ls === '0') return { useV2: false, percent: 0, source: 'localStorage' };

  const percent = readEnvPercent();
  if (percent <= 0) return { useV2: false, percent: 0, source: percent === 0 ? 'default' : 'env' };
  if (percent >= 100) return { useV2: true, percent: 100, source: 'env' };

  const key = `${input.tenantId ?? 'anon'}|${input.docType}`;
  const bucket = hashKey(key) % 100;
  return { useV2: bucket < percent, percent, source: 'env' };
}

export function shouldUseV2(input: CanaryInput): boolean {
  return decideCanary(input).useV2;
}
