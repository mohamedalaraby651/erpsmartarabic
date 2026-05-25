/**
 * PdfWatermark — value object للعلامة المائية (نص أو صورة).
 * يدعم: opacity, rotation, scale, position, repeat (tiled).
 */

export type WatermarkType = 'text' | 'image';
export type WatermarkPosition =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'tiled';

export interface PdfWatermark {
  enabled: boolean;
  type: WatermarkType;
  text?: string;
  imageAssetId?: string | null;
  opacity: number;     // 0..1
  rotation: number;    // -180..180
  scale: number;       // 0.1..3
  position: WatermarkPosition;
  repeat: boolean;
}

export const DEFAULT_WATERMARK: PdfWatermark = Object.freeze({
  enabled: false,
  type: 'text',
  text: '',
  imageAssetId: null,
  opacity: 0.08,
  rotation: -30,
  scale: 1,
  position: 'center',
  repeat: false,
});

export interface WatermarkIssue {
  field: keyof PdfWatermark;
  severity: 'error' | 'warning';
  message: string;
}

const VALID_POSITIONS: WatermarkPosition[] = [
  'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'tiled',
];

export function validateWatermark(w: PdfWatermark): WatermarkIssue[] {
  const issues: WatermarkIssue[] = [];

  if (!w.enabled) return issues; // لا داعي للتحقق إذا كانت معطلة

  if (w.type !== 'text' && w.type !== 'image') {
    issues.push({ field: 'type', severity: 'error', message: 'نوع العلامة المائية غير صالح' });
  }

  if (w.type === 'text') {
    if (!w.text || !w.text.trim()) {
      issues.push({ field: 'text', severity: 'error', message: 'نص العلامة المائية مطلوب' });
    } else if (w.text.length > 120) {
      issues.push({ field: 'text', severity: 'error', message: 'نص العلامة المائية طويل جداً (≤ 120)' });
    }
  } else if (w.type === 'image' && !w.imageAssetId) {
    issues.push({ field: 'imageAssetId', severity: 'error', message: 'صورة العلامة المائية مطلوبة' });
  }

  if (w.opacity < 0 || w.opacity > 1) {
    issues.push({ field: 'opacity', severity: 'error', message: 'الشفافية يجب أن تكون بين 0 و 1' });
  } else if (w.opacity > 0.4) {
    issues.push({
      field: 'opacity',
      severity: 'warning',
      message: 'شفافية عالية قد تحجب محتوى المستند',
    });
  }

  if (w.rotation < -180 || w.rotation > 180) {
    issues.push({ field: 'rotation', severity: 'error', message: 'الدوران يجب أن يكون بين -180 و 180' });
  }
  if (w.scale < 0.1 || w.scale > 3) {
    issues.push({ field: 'scale', severity: 'error', message: 'الحجم يجب أن يكون بين 0.1 و 3' });
  }
  if (!VALID_POSITIONS.includes(w.position)) {
    issues.push({ field: 'position', severity: 'error', message: 'موضع العلامة المائية غير صالح' });
  }

  return issues;
}

export function isWatermarkValid(w: PdfWatermark): boolean {
  return !validateWatermark(w).some((i) => i.severity === 'error');
}
