import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Activity, Search, RefreshCw, Eye, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { StandardPageHeader } from '@/components/ui-kit/StandardPageHeader';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type EventStatus = 'pending' | 'processing' | 'processed' | 'failed';

interface DomainEvent {
  id: string;
  event_type: string;
  aggregate_type: string | null;
  aggregate_id: string | null;
  payload: any;
  status: string;
  attempts: number;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
  processed_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; icon: typeof Clock }> = {
  pending: { label: 'قيد الانتظار', variant: 'secondary', className: 'bg-warning/10 text-warning border-warning/30', icon: Clock },
  processing: { label: 'قيد المعالجة', variant: 'secondary', className: 'bg-info/10 text-info border-info/30', icon: Loader2 },
  processed: { label: 'مكتمل', variant: 'secondary', className: 'bg-success/10 text-success border-success/30', icon: CheckCircle2 },
  failed: { label: 'فشل', variant: 'destructive', className: 'bg-destructive/10 text-destructive border-destructive/30', icon: AlertCircle },
};

export default function DomainEventsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<DomainEvent | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['domain-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domain_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as DomainEvent[];
    },
    refetchInterval: 30000,
  });

  const requeueMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.rpc('admin_requeue_event', { _event_id: eventId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تمت إعادة جدولة الحدث للمعالجة');
      queryClient.invalidateQueries({ queryKey: ['domain-events'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'فشلت إعادة المحاولة');
    },
  });

  const stats = useMemo(() => {
    const counts = { pending: 0, processing: 0, processed: 0, failed: 0 };
    events.forEach((e) => {
      if (e.status in counts) counts[e.status as keyof typeof counts]++;
    });
    return counts;
  }, [events]);

  const eventTypes = useMemo(() => {
    return Array.from(new Set(events.map((e) => e.event_type))).sort();
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (typeFilter !== 'all' && e.event_type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.event_type.toLowerCase().includes(q) ||
          (e.aggregate_id?.toLowerCase().includes(q) ?? false) ||
          (e.aggregate_type?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [events, statusFilter, typeFilter, search]);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <StandardPageHeader
        title="أحداث النظام (Domain Events)"
        icon={Activity}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالنوع أو المعرف..."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['domain-events'] })}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(['pending', 'processing', 'processed', 'failed'] as EventStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <Card key={s}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  <p className="text-2xl font-bold mt-1">{stats[s]}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${cfg.className}`}>
                  <Icon className={`h-5 w-5 ${s === 'processing' ? 'animate-spin' : ''}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="pending">قيد الانتظار</SelectItem>
              <SelectItem value="processing">قيد المعالجة</SelectItem>
              <SelectItem value="processed">مكتمل</SelectItem>
              <SelectItem value="failed">فشل</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="sm:w-64">
              <SelectValue placeholder="نوع الحدث" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              {eventTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            الأحداث ({filtered.length} {filtered.length !== events.length && `من ${events.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد أحداث مطابقة</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>النوع</TableHead>
                  <TableHead className="hidden md:table-cell">الكيان</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="hidden sm:table-cell">المحاولات</TableHead>
                  <TableHead className="hidden lg:table-cell">التاريخ</TableHead>
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((event) => {
                  const cfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-xs">{event.event_type}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {event.aggregate_type || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${cfg.className}`}>
                          <Icon className={`h-3 w-3 ${event.status === 'processing' ? 'animate-spin' : ''}`} />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className={event.attempts >= 3 ? 'text-destructive font-semibold' : ''}>
                          {event.attempts}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {format(new Date(event.created_at), 'dd MMM HH:mm', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEvent(event)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(event.status === 'failed' || event.status === 'pending') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => requeueMutation.mutate(event.id)}
                              disabled={requeueMutation.isPending}
                              className="h-8 gap-1 text-info hover:text-info"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${requeueMutation.isPending ? 'animate-spin' : ''}`} />
                              <span className="hidden sm:inline text-xs">إعادة</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              تفاصيل الحدث
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{selectedEvent?.id}</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">النوع</p>
                  <p className="font-mono">{selectedEvent.event_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">الحالة</p>
                  <Badge variant="outline" className={STATUS_CONFIG[selectedEvent.status]?.className}>
                    {STATUS_CONFIG[selectedEvent.status]?.label || selectedEvent.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">المحاولات</p>
                  <p>{selectedEvent.attempts}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">الإنشاء</p>
                  <p className="text-xs">{format(new Date(selectedEvent.created_at), 'dd MMM yyyy HH:mm:ss', { locale: ar })}</p>
                </div>
                {selectedEvent.processed_at && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">المعالجة</p>
                    <p className="text-xs">{format(new Date(selectedEvent.processed_at), 'dd MMM yyyy HH:mm:ss', { locale: ar })}</p>
                  </div>
                )}
                {selectedEvent.next_retry_at && selectedEvent.status !== 'processed' && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">إعادة المحاولة التالية</p>
                    <p className="text-xs">{format(new Date(selectedEvent.next_retry_at), 'dd MMM yyyy HH:mm:ss', { locale: ar })}</p>
                  </div>
                )}
              </div>

              {selectedEvent.last_error && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">رسالة الخطأ</p>
                  <pre className="bg-destructive/10 text-destructive border border-destructive/30 rounded-md p-3 text-xs overflow-auto whitespace-pre-wrap">
                    {selectedEvent.last_error}
                  </pre>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1">البيانات (Payload)</p>
                <pre className="bg-muted rounded-md p-3 text-xs overflow-auto max-h-64">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>

              {(selectedEvent.status === 'failed' || selectedEvent.status === 'pending') && (
                <Button
                  onClick={() => {
                    requeueMutation.mutate(selectedEvent.id);
                    setSelectedEvent(null);
                  }}
                  disabled={requeueMutation.isPending}
                  className="w-full gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${requeueMutation.isPending ? 'animate-spin' : ''}`} />
                  إعادة جدولة المعالجة
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
