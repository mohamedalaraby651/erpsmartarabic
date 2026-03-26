import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Camera, Loader2, X, Crop as CropIcon } from 'lucide-react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageUploaded: (url: string) => void;
  onImageRemoved?: () => void;
  bucket: 'avatars' | 'customer-images' | 'supplier-images' | 'employee-images';
  folder?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  fallback?: string;
  className?: string;
  showAvatar?: boolean;
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
  xl: 'h-40 w-40',
};

function centerAspectCrop(mediaWidth: number, mediaHeight: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, 1, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

async function getCroppedBlob(image: HTMLImageElement, crop: Crop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelCrop = {
    x: (crop.x ?? 0) * scaleX,
    y: (crop.y ?? 0) * scaleY,
    width: (crop.width ?? 0) * scaleX,
    height: (crop.height ?? 0) * scaleY,
  };
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', 0.9);
  });
}

export default function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  bucket,
  folder,
  size = 'lg',
  shape = 'circle',
  fallback = '?',
  className = '',
  showAvatar = true,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'خطأ', description: 'يرجى اختيار ملف صورة صالح', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'خطأ', description: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImgSrc(reader.result?.toString() || '');
      setCropDialogOpen(true);
    });
    reader.readAsDataURL(file);
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  }, []);

  const handleCropAndUpload = async () => {
    if (!imgRef.current || !crop) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, crop);
      const fileName = `${Date.now()}.jpg`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60 * 60 * 24);
      if (urlError) throw urlError;

      onImageUploaded(data.signedUrl);
      toast({ title: 'تم رفع الصورة', description: 'تم رفع الصورة بنجاح' });
      setCropDialogOpen(false);
      setImgSrc('');
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error uploading image:', error);
      toast({ title: 'خطأ في الرفع', description: 'فشل في رفع الصورة، يرجى المحاولة مرة أخرى', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    if (onImageRemoved) onImageRemoved();
  };

  return (
    <>
      <div className={`relative inline-block ${className}`}>
        {showAvatar && (
          <Avatar className={`${sizeClasses[size]} ${shape === 'square' ? 'rounded-lg' : ''}`}>
            <AvatarImage src={currentImageUrl || undefined} alt="صورة" />
            <AvatarFallback className={`text-2xl ${shape === 'square' ? 'rounded-lg' : ''}`}>
              {fallback.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        <div className={`${showAvatar ? 'absolute -bottom-1 -left-1' : ''} flex gap-1`}>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full shadow-md"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </Button>

          {currentImageUrl && onImageRemoved && (
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="h-8 w-8 rounded-full shadow-md"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={(open) => { if (!uploading) { setCropDialogOpen(open); if (!open) setImgSrc(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CropIcon className="h-5 w-5" />
              اقتصاص الصورة
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center max-h-[60vh] overflow-auto">
            {imgSrc && (
              <ReactCrop crop={crop} onChange={setCrop} aspect={1} circularCrop={shape === 'circle'}>
                <img ref={imgRef} src={imgSrc} alt="اقتصاص" onLoad={onImageLoad} className="max-h-[55vh] object-contain" />
              </ReactCrop>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCropDialogOpen(false); setImgSrc(''); }} disabled={uploading}>
              إلغاء
            </Button>
            <Button onClick={handleCropAndUpload} disabled={uploading || !crop}>
              {uploading ? <><Loader2 className="h-4 w-4 animate-spin ml-2" /> جاري الرفع...</> : 'رفع الصورة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
