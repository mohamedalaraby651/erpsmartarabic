/**
 * PdfRenderService — جسر بين Domain (DocumentRenderProfile) ومحركات الـ PDF.
 *
 * المسؤوليات:
 *  1. تحميل profile النطاق المطلوب (global + doctype) من المستودع.
 *  2. دمجهما عبر ProfileMerger.
 *  3. تحويل النتيجة إلى PdfConfigInput يفهمه printXxxHtmlPdf.
 *  4. تخزين مؤقت قصير TTL لتجنّب جلب RPC مع كل عملية تصدير.
 *
 * الـ Loader قابل للحقن لاختبار routePdfRequest بدون قاعدة بيانات.
 */
import type { PdfConfigInput } from '@/lib/pdf/config/pdfConfigSchema';
import type {
  DocumentRenderProfile,
  ProfileScope,
} from '@/domain/pdf/entities/DocumentRenderProfile';
import { mergeProfiles } from '@/domain/pdf/services/ProfileMerger';
import { profileToPdfConfigInput } from '@/domain/pdf/rendering/RenderProfileMapper';
import { pdfProfilesRepository } from '@/lib/repositories/pdfProfilesRepository';
import type { RoutableDocType } from '@/lib/pdf/routing/routePdfRequest';

const DOCTYPE_TO_SCOPE: Record<RoutableDocType, ProfileScope> = {
  invoice: 'invoice',
  quotation: 'quotation',
  purchase_order: 'purchase_order',
  statement: 'statement',
  // Fallbacks for future doc types
  delivery_note: 'delivery_note' as ProfileScope,
};

export interface ProfileLoader {
  /** يجلب profile واحد للنطاق المطلوب أو null إن لم يوجد. */
  (tenantId: string, scope: ProfileScope): Promise<DocumentRenderProfile | null>;
}

interface CacheEntry {
  config: PdfConfigInput;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

let loader: ProfileLoader = async (tenantId, scope) =>
  pdfProfilesRepository.findActive(tenantId, scope, null);

/** للاختبارات والـ overrides الإدارية. */
export function setProfileLoader(fn: ProfileLoader | null): void {
  loader = fn ?? (async (t, s) => pdfProfilesRepository.findActive(t, s, null));
}

/** إبطال الكاش — يُستدعى بعد حفظ أي profile. */
export function invalidatePdfRenderCache(tenantId?: string): void {
  if (!tenantId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${tenantId}:`)) cache.delete(key);
  }
}

function cacheKey(tenantId: string, docType: RoutableDocType): string {
  return `${tenantId}:${docType}`;
}

/**
 * يحلّ إعدادات التصيير لمستند معيّن.
 * يعيد undefined عند غياب tenantId — حينها يستخدم printer الإعدادات الافتراضية.
 */
export async function resolvePdfConfig(
  tenantId: string | null | undefined,
  docType: RoutableDocType,
): Promise<PdfConfigInput | undefined> {
  if (!tenantId) return undefined;

  const key = cacheKey(tenantId, docType);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.config;

  const scope = DOCTYPE_TO_SCOPE[docType] ?? 'global';

  let global: DocumentRenderProfile | null = null;
  let scoped: DocumentRenderProfile | null = null;
  try {
    [global, scoped] = await Promise.all([
      loader(tenantId, 'global'),
      scope !== 'global' ? loader(tenantId, scope) : Promise.resolve(null),
    ]);
  } catch (err) {
    // فشل الجلب لا يجب أن يكسر التصدير — نعود undefined ونترك defaults.
    if (typeof console !== 'undefined') {
      console.warn('[PdfRenderService] failed to load profile, using defaults', err);
    }
    return undefined;
  }

  if (!global && !scoped) return undefined;

  const merged = scoped && global
    ? mergeProfiles(global, scoped)
    : (scoped ?? global)!;

  const config = profileToPdfConfigInput(merged);
  cache.set(key, { config, expiresAt: Date.now() + CACHE_TTL_MS });
  return config;
}

/** للاختبار. */
export function _clearAllCachesForTest(): void {
  cache.clear();
}
