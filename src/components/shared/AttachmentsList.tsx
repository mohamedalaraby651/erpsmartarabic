import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Image,
  FileSpreadsheet,
  Archive,
  File,
  Download,
  Trash2,
  Eye,
  Loader2,
  Paperclip,
  AlertTriangle,
  Clock,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getSafeErrorMessage, logErrorSafely } from '@/lib/errorHandler';
import { format, differenceInDays, isPast } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AttachmentsSearch, AttachmentFilters, defaultFilters } from './AttachmentsSearch';
import { ATTACHMENT_CATEGORIES } from './AttachmentUploadForm';
import { cn } from '@/lib/utils';

const FILE_ICONS = {
  image: Image,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  archive: Archive,
  other: File,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExpiryStatus(expiryDate: string | null): 'expired' | 'expiring' | 'valid' | null {
  if (!expiryDate) return null;
  const date = new Date(expiryDate);
  if (isPast(date)) return 'expired';
  if (differenceInDays(date, new Date()) <= 30) return 'expiring';
  return 'valid';
}

interface AttachmentsListProps {
  entityType: string;
  entityId: string;
  canDelete?: boolean;
  className?: string;
  showSearch?: boolean;
  compact?: boolean;
}

export function AttachmentsList({
  entityType,
  entityId,
  canDelete = true,
  className,
  showSearch = false,
  compact = false,
}: AttachmentsListProps) {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>('');
  const [filters, setFilters] = useState<AttachmentFilters>(defaultFilters);

  const { data: attachments, isLoading } = useQuery({
    queryKey: ['attachments', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!entityId,
  });

  // Filter attachments
  const filteredAttachments = useMemo(() => {
    if (!attachments) return [];
    
    return attachments.filter((attachment) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!attachment.file_name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Category filter
      if (filters.category !== 'all' && attachment.category !== filters.category) {
        return false;
      }

      // File type filter
      if (filters.fileType !== 'all' && attachment.file_type !== filters.fileType) {
        return false;
      }

      // Date filters
      if (filters.dateFrom) {
        const createdAt = new Date(attachment.created_at);
        if (createdAt < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
        const createdAt = new Date(attachment.created_at);
        if (createdAt > filters.dateTo) return false;
      }

      // Expiry filters
      const expiryStatus = getExpiryStatus(attachment.expiry_date);
      if (filters.showExpiringSoon && expiryStatus !== 'expiring') return false;
      if (filters.showExpired && expiryStatus !== 'expired') return false;

      return true;
    });
  }, [attachments, filters]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const attachment = attachments?.find((a) => a.id === id);
      if (!attachment) throw new Error('Attachment not found');

      // Delete from storage
      const urlPath = attachment.file_url.split('/documents/')[1]?.split('?')[0];
      if (urlPath) {
        await supabase.storage.from('documents').remove([decodeURIComponent(urlPath)]);
      }

      // Delete from database
      const { error } = await supabase.from('attachments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', entityType, entityId] });
      toast.success('تم حذف الملف بنجاح');
      setDeleteId(null);
    },
    onError: (error: any) => {
      logErrorSafely('AttachmentsList.deleteMutation', error);
      toast.error('فشل حذف الملف: ' + getSafeErrorMessage(error));
    },
  });

  const canDeleteAttachment = (uploadedBy: string | null) => {
    if (userRole === 'admin') return true;
    if (canDelete && uploadedBy === user?.id) return true;
    return false;
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error('فشل تحميل الملف');
    }
  };

  const handlePreview = (url: string, fileName: string, fileType: string) => {
    if (fileType === 'image') {
      setPreviewUrl(url);
      setPreviewName(fileName);
    } else {
      window.open(url, '_blank');
    }
  };

  const getCategoryLabel = (category: string | null) => {
    return ATTACHMENT_CATEGORIES.find((c) => c.value === category)?.label || 'أخرى';
  };

  if (isLoading) {
    return (
      <div className={className}>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-8 text-muted-foreground">
          <Paperclip className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>لا توجد مرفقات</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {showSearch && (
        <AttachmentsSearch
          filters={filters}
          onFiltersChange={setFilters}
          className="mb-4"
        />
      )}

      <div className="space-y-2">
        {filteredAttachments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>لا توجد نتائج مطابقة للبحث</p>
          </div>
        ) : (
          filteredAttachments.map((attachment) => {
            const IconComponent = FILE_ICONS[attachment.file_type as keyof typeof FILE_ICONS] || File;
            const isImage = attachment.file_type === 'image';
            const expiryStatus = getExpiryStatus(attachment.expiry_date);

            return (
              <div
                key={attachment.id}
                className={cn(
                  'flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors',
                  expiryStatus === 'expired' && 'border border-destructive/50 bg-destructive/5',
                  expiryStatus === 'expiring' && 'border border-warning/50 bg-warning/5'
                )}
              >
                <div className="flex-shrink-0">
                  {isImage ? (
                    <img
                      src={attachment.file_url}
                      alt={attachment.file_name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <IconComponent className="h-10 w-10 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{attachment.file_name}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(attachment.file_size)}</span>
                    <span>•</span>
                    <span>{format(new Date(attachment.created_at), 'dd MMM yyyy', { locale: ar })}</span>
                    
                    {!compact && attachment.category && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs h-5">
                          <Tag className="h-3 w-3 ml-1" />
                          {getCategoryLabel(attachment.category)}
                        </Badge>
                      </>
                    )}

                    {expiryStatus === 'expired' && (
                      <Badge variant="destructive" className="text-xs h-5 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        منتهي
                      </Badge>
                    )}
                    {expiryStatus === 'expiring' && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="text-xs h-5 gap-1 bg-warning/20 text-warning-foreground">
                            <Clock className="h-3 w-3" />
                            قريب الانتهاء
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          ينتهي في {format(new Date(attachment.expiry_date!), 'dd MMM yyyy', { locale: ar })}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  
                  {!compact && attachment.notes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {attachment.notes}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0 flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePreview(attachment.file_url, attachment.file_name, attachment.file_type)}
                    title="معاينة"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(attachment.file_url, attachment.file_name)}
                    title="تحميل"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canDeleteAttachment(attachment.uploaded_by) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(attachment.id)}
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الملف؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'حذف'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewName}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={previewName}
                className="max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
