/**
 * PdfAsset — كيان الأصول (شعار/صورة علامة مائية) مع دورة حياة.
 */

export type AssetKind = 'logo' | 'watermark';

export interface PdfAsset {
  id: string;
  tenantId: string;
  kind: AssetKind;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  checksum?: string;
  uploadedBy?: string | null;
  refCount: number;
  deletedAt?: string | null;
  createdAt: string;
}

export const MAX_ASSET_BYTES = 2 * 1024 * 1024;   // 2 MB
export const MAX_ASSET_DIMENSION = 2000;          // px

export const ALLOWED_ASSET_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;
export type AllowedAssetMime = typeof ALLOWED_ASSET_MIME[number];

export interface AssetValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateAssetUpload(input: {
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}): AssetValidationResult {
  const errors: string[] = [];
  if (!ALLOWED_ASSET_MIME.includes(input.mimeType as AllowedAssetMime)) {
    errors.push(`نوع الملف غير مدعوم (${input.mimeType}). المسموح: PNG, JPEG, WebP, SVG`);
  }
  if (input.sizeBytes > MAX_ASSET_BYTES) {
    errors.push(`حجم الملف يتجاوز الحد الأقصى (${(MAX_ASSET_BYTES / 1024 / 1024).toFixed(0)} MB)`);
  }
  if (input.sizeBytes <= 0) {
    errors.push('الملف فارغ');
  }
  if (input.width && input.width > MAX_ASSET_DIMENSION) {
    errors.push(`عرض الصورة يتجاوز ${MAX_ASSET_DIMENSION}px`);
  }
  if (input.height && input.height > MAX_ASSET_DIMENSION) {
    errors.push(`ارتفاع الصورة يتجاوز ${MAX_ASSET_DIMENSION}px`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * فحص magic bytes للتأكد من نوع الملف الحقيقي (لا الامتداد فقط).
 * Returns null إذا الـbytes لا تطابق أي نوع معروف.
 */
export function detectMimeFromBytes(bytes: Uint8Array): AllowedAssetMime | null {
  if (bytes.length < 4) return null;
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  // WEBP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  // SVG: نص يبدأ بـ "<?xml" أو "<svg"
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 256)).trimStart();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) {
    return 'image/svg+xml';
  }
  return null;
}
