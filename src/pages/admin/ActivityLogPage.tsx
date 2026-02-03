import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

import { ExportButton } from '@/components/reports/ExportButton';
import { Activity, Search, Eye, ArrowRight, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const ActivityLogPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
interface ActivityLog {
    id: string;
    action: string;
    entity_type: string;
    entity_name: string | null;
    entity_id: string | null;
    user_id: string;
    created_at: string;
    ip_address: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
  }
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity-logs', searchQuery, actionFilter, entityFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (searchQuery) {
        query = query.or(`entity_name.ilike.%${searchQuery}%`);
      }
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const actionLabels: Record<string, string> = {
    create: 'إنشاء',
    update: 'تعديل',
    delete: 'حذف',
    login: 'تسجيل دخول',
    logout: 'تسجيل خروج',
    export: 'تصدير',
  };

  const entityLabels: Record<string, string> = {
    customer: 'عميل',
    invoice: 'فاتورة',
    product: 'منتج',
    supplier: 'مورد',
    quotation: 'عرض سعر',
    sales_order: 'أمر بيع',
    purchase_order: 'أمر شراء',
    payment: 'دفعة',
    user: 'مستخدم',
  };

  const actionColors: Record<string, string> = {
    create: 'bg-emerald-500/10 text-emerald-600',
    update: 'bg-blue-500/10 text-blue-600',
    delete: 'bg-destructive/10 text-destructive',
    login: 'bg-purple-500/10 text-purple-600',
    logout: 'bg-gray-500/10 text-gray-600',
    export: 'bg-cyan-500/10 text-cyan-600',
  };

  const handleViewDetails = (log: ActivityLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const exportHeaders = {
    action: 'الإجراء',
    entity_type: 'نوع الكيان',
    entity_name: 'اسم الكيان',
    created_at: 'التاريخ والوقت',
    ip_address: 'عنوان IP',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            سجل النشاطات
          </h1>
          <p className="text-muted-foreground">تتبع جميع العمليات في النظام</p>
        </div>
        <ExportButton
          data={(logs as ActivityLog[]).map((log) => ({
            action: actionLabels[log.action] || log.action,
            entity_type: entityLabels[log.entity_type] || log.entity_type,
            entity_name: log.entity_name || '-',
            created_at: new Date(log.created_at).toLocaleString('ar-EG'),
            ip_address: log.ip_address || '-',
          }))}
          filename="سجل_النشاطات"
          headers={exportHeaders}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="نوع الإجراء" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الإجراءات</SelectItem>
                <SelectItem value="create">إنشاء</SelectItem>
                <SelectItem value="update">تعديل</SelectItem>
                <SelectItem value="delete">حذف</SelectItem>
                <SelectItem value="login">تسجيل دخول</SelectItem>
                <SelectItem value="export">تصدير</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="نوع الكيان" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="customer">عملاء</SelectItem>
                <SelectItem value="invoice">فواتير</SelectItem>
                <SelectItem value="product">منتجات</SelectItem>
                <SelectItem value="supplier">موردين</SelectItem>
                <SelectItem value="quotation">عروض أسعار</SelectItem>
                <SelectItem value="sales_order">أوامر بيع</SelectItem>
                <SelectItem value="purchase_order">أوامر شراء</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-auto"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>سجل العمليات ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد نشاطات مسجلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الإجراء</TableHead>
                    <TableHead>الكيان</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>التاريخ والوقت</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="text-left">تفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(logs as ActivityLog[]).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge className={actionColors[log.action] || 'bg-muted'}>
                          {actionLabels[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entityLabels[log.entity_type] || log.entity_type}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{log.entity_name || '-'}</span>
                      </TableCell>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.ip_address || '-'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل النشاط</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">الإجراء</p>
                  <Badge className={actionColors[selectedLog.action] || 'bg-muted'}>
                    {actionLabels[selectedLog.action] || selectedLog.action}
                  </Badge>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">نوع الكيان</p>
                  <p className="font-medium">
                    {entityLabels[selectedLog.entity_type] || selectedLog.entity_type}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">التاريخ والوقت</p>
                  <p className="font-medium">
                    {new Date(selectedLog.created_at).toLocaleString('ar-EG')}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">IP Address</p>
                  <code className="text-sm">{selectedLog.ip_address || '-'}</code>
                </div>
              </div>

              {(selectedLog.old_values || selectedLog.new_values) && (
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedLog.old_values && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-destructive" />
                        القيم السابقة
                      </p>
                      <ScrollArea className="h-[200px] border rounded-lg p-3">
                        <pre className="text-xs" dir="ltr">
                          {JSON.stringify(selectedLog.old_values, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  )}
                  {selectedLog.new_values && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4 text-emerald-500" />
                        القيم الجديدة
                      </p>
                      <ScrollArea className="h-[200px] border rounded-lg p-3">
                        <pre className="text-xs" dir="ltr">
                          {JSON.stringify(selectedLog.new_values, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityLogPage;
