import { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LogoUploadProps {
  currentLogoUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

export function LogoUpload({ currentLogoUrl, onUpload, onRemove }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'يجب أن يكون الملف بصيغة PNG أو JPG';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'حجم الملف يجب أن يكون أقل من 5MB';
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setUploading(true);
    
    try {
      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Use signed URL for private bucket (7 day expiry for logos)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('logos')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7);

      if (urlError) throw urlError;

      onUpload(urlData.signedUrl);
      toast.success('تم رفع الشعار بنجاح');
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error('Upload error:', error);
      }
      toast.error('فشل رفع الشعار');
      setPreviewUrl(currentLogoUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleRemove = async () => {
    if (previewUrl && previewUrl.includes('logos')) {
      try {
        // Extract filename from URL
        const urlParts = previewUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        await supabase.storage.from('logos').remove([fileName]);
      } catch (error) {
        console.error('Remove error:', error);
      }
    }
    
    setPreviewUrl(null);
    onRemove?.();
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="الشعار"
              className="max-h-32 mx-auto rounded-lg object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-0 left-0 h-8 w-8"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <label className="cursor-pointer">
                <span className="text-primary font-medium">اختر ملف</span>
                <span className="text-muted-foreground"> أو اسحب وأفلت هنا</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleChange}
                  disabled={uploading}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              PNG أو JPG بحد أقصى 5MB
            </p>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 animate-bounce" />
              <span>جاري الرفع...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
