/**
 * ProfileDiff — يحسب الفرق بين إصدارين من Profile لأغراض التدقيق (audit log).
 * المخرج JSON قابل للتخزين في DB ويُعرض بالعربية في AuditTimeline.
 */
import type { DocumentRenderProfile } from '../entities/DocumentRenderProfile';

export interface ProfileDiffEntry {
  path: string;
  before: unknown;
  after: unknown;
}

export interface ProfileDiff {
  versionFrom: number;
  versionTo: number;
  changes: ProfileDiffEntry[];
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  out: ProfileDiffEntry[],
): void {
  if (Object.is(before, after)) return;

  const bothObjects =
    before && after &&
    typeof before === 'object' && typeof after === 'object' &&
    !Array.isArray(before) && !Array.isArray(after);

  if (bothObjects) {
    const keys = new Set([
      ...Object.keys(before as object),
      ...Object.keys(after as object),
    ]);
    for (const k of keys) {
      walk(
        (before as Record<string, unknown>)[k],
        (after as Record<string, unknown>)[k],
        path ? `${path}.${k}` : k,
        out,
      );
    }
    return;
  }

  // مقارنة قيم بدائية أو مصفوفات (JSON.stringify لتجنب false positives بسيطة)
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    out.push({ path, before, after });
  }
}

// الحقول التي لا يهمنا تسجيلها في التدقيق
const IGNORED_PATHS = new Set([
  'version', 'updatedAt', 'createdAt', 'updatedBy', 'createdBy', 'id', 'tenantId',
]);

export function diffProfiles(
  before: DocumentRenderProfile,
  after: DocumentRenderProfile,
): ProfileDiff {
  const all: ProfileDiffEntry[] = [];
  walk(before, after, '', all);
  const changes = all.filter((c) => {
    const top = c.path.split('.')[0];
    return !IGNORED_PATHS.has(top);
  });
  return {
    versionFrom: before.version,
    versionTo: after.version,
    changes,
  };
}

const ARABIC_LABELS: Record<string, string> = {
  'layout.pageSize': 'حجم الصفحة',
  'layout.orientation': 'اتجاه الصفحة',
  'layout.margins.top': 'الهامش العلوي',
  'layout.margins.right': 'الهامش الأيمن',
  'layout.margins.bottom': 'الهامش السفلي',
  'layout.margins.left': 'الهامش الأيسر',
  'typography.fontKey': 'الخط',
  'typography.baseFontSizePx': 'حجم الخط الأساسي',
  'typography.lineHeight': 'ارتفاع السطر',
  'typography.letterSpacing': 'تباعد الأحرف',
  'branding.primaryColor': 'اللون الأساسي',
  'branding.secondaryColor': 'اللون الثانوي',
  'branding.textColor': 'لون النص',
  'branding.companyName': 'اسم الشركة',
  'branding.taxNumber': 'الرقم الضريبي',
  'branding.logoAssetId': 'الشعار',
  'watermark.enabled': 'تفعيل العلامة المائية',
  'watermark.text': 'نص العلامة المائية',
  'watermark.opacity': 'شفافية العلامة المائية',
  'watermark.rotation': 'دوران العلامة المائية',
  'watermark.position': 'موضع العلامة المائية',
  'header.enabled': 'تفعيل رأس الصفحة',
  'footer.enabled': 'تفعيل تذييل الصفحة',
  'footer.showPageNumbers': 'إظهار أرقام الصفحات',
};

export function labelForPath(path: string): string {
  return ARABIC_LABELS[path] ?? path;
}
