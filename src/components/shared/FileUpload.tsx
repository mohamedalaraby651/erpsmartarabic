import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, Image, FileSpreadsheet, Archive, File, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { getSafeErrorMessage, logErrorSafely } from '@/lib/errorHandler';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const FILE_TYPES = {
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    icon: Image,
    label: 'صورة',
  },
  document: {
    extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
    ],
    icon: FileText,
    label: 'مستند',
  },
  spreadsheet: {
    extensions: ['xls', 'xlsx', 'csv'],
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
    icon: FileSpreadsheet,
    label: 'جدول بيانات',
  },
  archive: {
    extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
    mimeTypes: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
    ],
    icon: Archive,
    label: 'ملف مضغوط',
  },
};

function getFileType(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  for (const [type, config] of Object.entries(FILE_TYPES)) {
    if (config.extensions.includes(extension) || config.mimeTypes.includes(file.type)) {
      return type;
    }
  }
  return 'other';
}

function getFileIcon(fileType: string) {
  const config = FILE_TYPES[fileType as keyof typeof FILE_TYPES];
  return config?.icon || File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadedFile {
  id?: string;
  name: string;
  url: string;
  type: string;
  size: number;
  mimeType: string;
}

interface FileUploadProps {
  entityType: string;
  entityId: string;
  onUploadComplete?: (file: UploadedFile) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
  disabled?: boolean;
}

export function FileUpload({
  entityType,
  entityId,
  onUploadComplete,
  accept,
  maxSize = MAX_FILE_SIZE,
  className,
  disabled = false,
}: FileUploadProps) {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = useCallback((file: File): boolean => {
    if (file.size > maxSize) {
      toast.error(`حجم الملف يتجاوز الحد الأقصى (${formatFileSize(maxSize)})`);
      return false;
    }
    return true;
  }, [maxSize]);

  const uploadFile = useCallback(async (file: File) => {
    if (!user || !validateFile(file)) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileType = getFileType(file);
      const fileExtension = file.name.split('.').pop();
      const fileName = `${entityType}/${entityId}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      // Upload to storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (storageError) throw storageError;

      // Get signed URL for private bucket
      const { data: urlData } = await supabase.storage
        .from('documents')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      const fileUrl = urlData?.signedUrl || '';

      // Save to attachments table
      const { data: attachmentData, error: attachmentError } = await supabase
        .from('attachments')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          file_name: file.name,
          file_url: fileUrl,
          file_type: fileType,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (attachmentError) throw attachmentError;

      setUploadProgress(100);
      toast.success('تم رفع الملف بنجاح');

      if (onUploadComplete) {
        onUploadComplete({
          id: attachmentData.id,
          name: file.name,
          url: fileUrl,
          type: fileType,
          size: file.size,
          mimeType: file.type,
        });
      }

      setSelectedFile(null);
    } catch (error: unknown) {
      logErrorSafely('FileUpload.handleUpload', error);
      toast.error('فشل رفع الملف: ' + getSafeErrorMessage(error));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [user, entityType, entityId, onUploadComplete, validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, [disabled]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, []);

  const handleUpload = useCallback(() => {
    if (selectedFile) {
      uploadFile(selectedFile);
    }
  }, [selectedFile, uploadFile]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const FileIcon = selectedFile ? getFileIcon(getFileType(selectedFile)) : Upload;

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
          isDragging && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed',
          !isDragging && !disabled && 'border-muted-foreground/25 hover:border-primary/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <FileIcon className="h-10 w-10 text-primary" />
            <div className="text-sm font-medium">{selectedFile.name}</div>
            <div className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)} • {getFileType(selectedFile)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              اسحب الملف هنا أو انقر للاختيار
            </div>
            <div className="text-xs text-muted-foreground">
              الحد الأقصى: {formatFileSize(maxSize)}
            </div>
          </div>
        )}
      </div>

      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            جاري الرفع... {uploadProgress}%
          </div>
        </div>
      )}

      {selectedFile && !isUploading && (
        <div className="flex gap-2">
          <Button onClick={handleUpload} className="flex-1">
            <Upload className="h-4 w-4 ml-2" />
            رفع الملف
          </Button>
          <Button variant="outline" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
