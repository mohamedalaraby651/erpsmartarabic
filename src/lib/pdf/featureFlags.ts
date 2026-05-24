/**
 * Centralized feature flag for the v2 PDF engine.
 *
 * Reads `localStorage.pdf_engine_v2 === '1'` (per-user opt-in for QA)
 * or `import.meta.env.VITE_PDF_ENGINE_V2 === 'true'` (build-time opt-in
 * for staging / pilot tenants). Defaults to **false** so production
 * keeps using the battle-tested legacy `pdfGenerator.ts` path.
 */
export function isPdfEngineV2Enabled(): boolean {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('pdf_engine_v2') === '1') {
      return true;
    }
  } catch {
    /* private mode / SSR — ignore */
  }
  try {
    if ((import.meta as { env?: Record<string, string> }).env?.VITE_PDF_ENGINE_V2 === 'true') {
      return true;
    }
  } catch {
    /* noop */
  }
  return false;
}
