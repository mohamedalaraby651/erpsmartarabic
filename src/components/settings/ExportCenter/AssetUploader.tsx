/**
 * AssetUploader — رفع شعار/صورة علامة مائية إلى bucket `pdf-branding`.
 *
 * المسار: `{tenant_id}/{kind}/{uuid}.{ext}`
 * بعد رفع ناجح:
 *  1. إدراج سجل في tenant_pdf_assets (ref_count = 1)
 *  2. تمرير الـ assetId إلى onChange ليُربط بـ branding.logoAssetId
 *     أو watermark.imageAssetId داخل الـ draft profile.
 *
 * يدعم السحب والإفلات + معاينة فورية + إزالة الربط.
 * كل التحقق (mime/حجم/أبعاد) من خلال domain validateAssetUpload.
 */
import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { usePdfAssetUrl } from '@/hooks/usePdfAssetUrl';
import { pdfAssetsRepository } from '@/lib/repositories/pdfAssetsRepository';
import {
  validateAssetUpload,
  detectMimeFromBytes,
  type AssetKind,
  ALLOWED_ASSET_MIME,
  MAX_ASSET_BYTES,
} from '@/domain/pdf/entities/PdfAsset';
import { toast } from 'sonner';

interface Props {
  kind: AssetKind;
  label: string;
  description?: string;
  value: string | null | undefined;
  onChange: (assetId: string | null) => void;
  disabled?: boolean;
}

async function readImageDims(file: File): Promise<{ width?: number; height?: number }> {
  if (file.type === 'image/svg+xml') return {};
  try {
    const url = URL.createObjectURL(file);
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('decode-failed'));
      img.src = url;
    });
    URL.revokeObjectURL(url);
    return dims;
  } catch {
    return {};
  }
}

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/png': return 'png';
    case 'image/jpeg': return 'jpg';
    case 'image/webp': return 'webp';
    case 'image/svg+xml': return 'svg';
    default: return 'bin';
  }
}

export function AssetUploader({ kind, label, description, value, onChange, disabled }: Props) {
  const { tenantId } = useTenant();
  const { url: previewUrl, isLoading: urlLoading } = usePdfAssetUrl(value);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!tenantId) {
      toast.error('لا توجد مؤسسة نشطة');
      return;
    }
    const file = files[0];
    setError(null);
    setUploading(true);

    try {
      // 1. Magic-byte check
      const buf = new Uint8Array(await file.slice(0, 256).arrayBuffer());
      const detected = detectMimeFromBytes(buf);
      const effectiveMime = detected ?? file.type;
      if (!ALLOWED_ASSET_MIME.includes(effectiveMime as typeof ALLOWED_ASSET_MIME[number])) {
        throw new Error('نوع الملف غير مدعوم. المسموح: PNG, JPEG, WebP, SVG');
      }

      // 2. Dimensions + domain validation
      const dims = await readImageDims(file);
      const v = validateAssetUpload({
        mimeType: effectiveMime,
        sizeBytes: file.size,
        width: dims.width,
        height: dims.height,
      });
      if (!v.valid) throw new Error(v.errors.join('، '));

      // 3. Upload to storage — path must start with {tenant_id} (RLS)
      const uuid = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const ext = extFromMime(effectiveMime);
      const path = `${tenantId}/${kind}/${uuid}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('pdf-branding')
        .upload(path, file, {
          contentType: effectiveMime,
          cacheControl: '3600',
          upsert: false,
        });
      if (upErr) throw new Error(upErr.message);

      // 4. Insert metadata row
      const row = await pdfAssetsRepository.insert({
        tenantId,
        kind,
        filePath: path,
        mimeType: effectiveMime,
        fileSize: file.size,
        width: dims.width,
        height: dims.height,
      });

      onChange(row.id);
      toast.success(kind === 'logo' ? 'تم رفع الشعار' : 'تم رفع صورة العلامة المائية');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'فشل الرفع';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange(null);
    setError(null);
  };

  return (
    <div className="space-y-2" dir="rtl">
      <Label className="text-sm font-medium">{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <div
        className={[
          'relative flex items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border',
          disabled ? 'opacity-60 pointer-events-none' : '',
        ].join(' ')}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        {/* Preview */}
        <div className="h-16 w-16 flex-shrink-0 rounded border bg-muted/30 flex items-center justify-center overflow-hidden">
          {urlLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt={label}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_ASSET_MIME.join(',')}
            className="sr-only"
            onChange={(e) => void handleFiles(e.target.files)}
            disabled={disabled || uploading}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 ml-1 animate-spin" /> جارٍ الرفع…</>
              ) : (
                <><Upload className="h-4 w-4 ml-1" /> {value ? 'استبدال' : 'رفع'}</>
              )}
            </Button>
            {value && !uploading && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleRemove}
                disabled={disabled}
              >
                <X className="h-4 w-4 ml-1" /> إزالة
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            PNG, JPEG, WebP, SVG · حتى {(MAX_ASSET_BYTES / 1024 / 1024).toFixed(0)} MB · حتى 2000×2000px
          </p>
          {error && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AssetUploader;
