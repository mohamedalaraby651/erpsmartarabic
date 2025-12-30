import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Paperclip,
  FileText,
  Image,
  FileSpreadsheet,
  Archive,
  File,
  Download,
  Eye,
  AlertTriangle,
  Clock,
  Tag,
  BarChart3,
  Users,
  Package,
  Receipt,
  Briefcase,
  Truck,
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AttachmentsSearch, AttachmentFilters, defaultFilters } from '@/components/shared/AttachmentsSearch';
import { ATTACHMENT_CATEGORIES } from '@/components/shared/AttachmentUploadForm';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FILE_ICONS = {
  image: Image,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  archive: Archive,
  other: File,
};

const ENTITY_ICONS = {
  customer: Users,
  employee: Briefcase,
  supplier: Truck,
  product: Package,
  invoice: Receipt,
  quotation: FileText,
  sales_order: Receipt,
  purchase_order: FileText,
  profile: Users,
};

const ENTITY_LABELS: Record<string, string> = {
  customer: 'عميل',
  employee: 'موظف',
  supplier: 'مورد',
  product: 'منتج',
  invoice: 'فاتورة',
  quotation: 'عرض سعر',
  sales_order: 'أمر بيع',
  purchase_order: 'أمر شراء',
  profile: 'ملف شخصي',
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

export default function AttachmentsPage() {
  const { userRole } = useAuth();
  const [filters, setFilters] = useState<AttachmentFilters>(defaultFilters);
  const [activeTab, setActiveTab] = useState('all');

  // Check if user is admin
  const isAdmin = userRole === 'admin';

  // Fetch all attachments (admin only)
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['all-attachments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Filter attachments
  const filteredAttachments = useMemo(() => {
    let filtered = attachments;

    // Tab filter
    if (activeTab !== 'all') {
      if (activeTab === 'expiring') {
        filtered = filtered.filter((a) => getExpiryStatus(a.expiry_date) === 'expiring');
      } else if (activeTab === 'expired') {
        filtered = filtered.filter((a) => getExpiryStatus(a.expiry_date) === 'expired');
      } else {
        filtered = filtered.filter((a) => a.entity_type === activeTab);
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((a) => a.file_name.toLowerCase().includes(searchLower));
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter((a) => a.category === filters.category);
    }

    // File type filter
    if (filters.fileType !== 'all') {
      filtered = filtered.filter((a) => a.file_type === filters.fileType);
    }

    // Date filters
    if (filters.dateFrom) {
      filtered = filtered.filter((a) => new Date(a.created_at) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filtered = filtered.filter((a) => new Date(a.created_at) <= filters.dateTo!);
    }

    return filtered;
  }, [attachments, filters, activeTab]);

  // Statistics
  const stats = useMemo(() => {
    const total = attachments.length;
    const expired = attachments.filter((a) => getExpiryStatus(a.expiry_date) === 'expired').length;
    const expiring = attachments.filter((a) => getExpiryStatus(a.expiry_date) === 'expiring').length;
    const totalSize = attachments.reduce((sum, a) => sum + a.file_size, 0);

    const byCategory: Record<string, number> = {};
    const byEntityType: Record<string, number> = {};

    attachments.forEach((a) => {
      byCategory[a.category || 'other'] = (byCategory[a.category || 'other'] || 0) + 1;
      byEntityType[a.entity_type] = (byEntityType[a.entity_type] || 0) + 1;
    });

    return { total, expired, expiring, totalSize, byCategory, byEntityType };
  }, [attachments]);

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

  const handlePreview = (url: string, fileType: string) => {
    window.open(url, '_blank');
  };

  const getCategoryLabel = (category: string | null) => {
    return ATTACHMENT_CATEGORIES.find((c) => c.value === category)?.label || 'أخرى';
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-warning" />
          <p className="text-lg">هذه الصفحة متاحة للمديرين فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Paperclip className="h-6 w-6" />
          إدارة المرفقات
        </h1>
        <p className="text-muted-foreground">عرض وإدارة جميع المرفقات في النظام</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Paperclip className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المرفقات</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <BarChart3 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الحجم الإجمالي</p>
                <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">قريبة الانتهاء</p>
                <p className="text-2xl font-bold">{stats.expiring}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">منتهية الصلاحية</p>
                <p className="text-2xl font-bold">{stats.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>جميع المرفقات</CardTitle>
          <CardDescription>
            عرض {filteredAttachments.length} من {attachments.length} مرفق
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <AttachmentsSearch
            filters={filters}
            onFiltersChange={setFilters}
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="all">الكل ({stats.total})</TabsTrigger>
              <TabsTrigger value="expiring" className="text-warning">
                قريبة الانتهاء ({stats.expiring})
              </TabsTrigger>
              <TabsTrigger value="expired" className="text-destructive">
                منتهية ({stats.expired})
              </TabsTrigger>
              {Object.entries(stats.byEntityType).map(([type, count]) => (
                <TabsTrigger key={type} value={type}>
                  {ENTITY_LABELS[type] || type} ({count})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : filteredAttachments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Paperclip className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>لا توجد مرفقات</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الملف</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>التصنيف</TableHead>
                        <TableHead>الكيان</TableHead>
                        <TableHead>الحجم</TableHead>
                        <TableHead>تاريخ الرفع</TableHead>
                        <TableHead>الانتهاء</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttachments.map((attachment) => {
                        const IconComponent = FILE_ICONS[attachment.file_type as keyof typeof FILE_ICONS] || File;
                        const EntityIcon = ENTITY_ICONS[attachment.entity_type as keyof typeof ENTITY_ICONS] || File;
                        const expiryStatus = getExpiryStatus(attachment.expiry_date);

                        return (
                          <TableRow
                            key={attachment.id}
                            className={cn(
                              expiryStatus === 'expired' && 'bg-destructive/5',
                              expiryStatus === 'expiring' && 'bg-warning/5'
                            )}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-5 w-5 text-primary" />
                                <span className="font-medium truncate max-w-[200px]">
                                  {attachment.file_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{attachment.file_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="gap-1">
                                <Tag className="h-3 w-3" />
                                {getCategoryLabel(attachment.category)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <EntityIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {ENTITY_LABELS[attachment.entity_type] || attachment.entity_type}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{formatFileSize(attachment.file_size)}</TableCell>
                            <TableCell>
                              {format(new Date(attachment.created_at), 'dd MMM yyyy', { locale: ar })}
                            </TableCell>
                            <TableCell>
                              {attachment.expiry_date ? (
                                <Badge
                                  variant={
                                    expiryStatus === 'expired'
                                      ? 'destructive'
                                      : expiryStatus === 'expiring'
                                      ? 'secondary'
                                      : 'outline'
                                  }
                                  className={cn(
                                    expiryStatus === 'expiring' && 'bg-warning/20 text-warning-foreground'
                                  )}
                                >
                                  {format(new Date(attachment.expiry_date), 'dd MMM yyyy', { locale: ar })}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handlePreview(attachment.file_url, attachment.file_type)}
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
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
