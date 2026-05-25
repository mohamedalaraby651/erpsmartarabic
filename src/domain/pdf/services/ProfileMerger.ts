/**
 * ProfileMerger — يدمج Profile خاص بنوع مستند مع الـglobal.
 * استراتيجية: أي حقل في الـscoped يتجاوز الـglobal، وما لا يُحدَّد يُورَّث.
 */
import type { DocumentRenderProfile } from '../entities/DocumentRenderProfile';

/** دمج عميق (shallow per-section) — كل قسم يُؤخذ كاملاً من scoped إذا وُجد. */
export function mergeProfiles(
  global: DocumentRenderProfile,
  scoped?: DocumentRenderProfile | null,
): DocumentRenderProfile {
  if (!scoped) return global;
  return {
    ...global,
    ...scoped,
    layout: scoped.layout ?? global.layout,
    typography: scoped.typography ?? global.typography,
    branding: { ...global.branding, ...scoped.branding },
    watermark: scoped.watermark ?? global.watermark,
    header: { ...global.header, ...scoped.header },
    footer: { ...global.footer, ...scoped.footer },
    scopeType: scoped.scopeType,
    scopeId: scoped.scopeId ?? null,
    version: scoped.version,
  };
}

/** اختار الـprofile الأنسب من قائمة بناءً على scope مطلوب. */
export function pickProfileForScope(
  profiles: DocumentRenderProfile[],
  scope: DocumentRenderProfile['scopeType'],
): { scoped?: DocumentRenderProfile; global?: DocumentRenderProfile } {
  const global = profiles.find((p) => p.scopeType === 'global' && p.isActive);
  const scoped = profiles.find((p) => p.scopeType === scope && p.isActive);
  return { scoped, global };
}
