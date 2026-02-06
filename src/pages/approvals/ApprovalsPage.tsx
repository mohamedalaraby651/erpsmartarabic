import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface ApprovalRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  current_level: number;
  approved_by: string[] | null;
  rejection_reason: string | null;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
}

const statusLabels: Record<string, string> = {
  pending: 'معلقة',
  approved: 'موافق عليها',
  rejected: 'مرفوضة',
  escalated: 'مصعّدة',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600',
  approved: 'bg-emerald-500/10 text-emerald-600',
  rejected: 'bg-destructive/10 text-destructive',
  escalated: 'bg-blue-500/10 text-blue-600',
};

const entityLabels: Record<string, string> = {
  invoice: 'فاتورة',
  expense: 'مصروف',
  purchase_order: 'أمر شراء',
  journal: 'قيد يومي',
};

const ApprovalsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['approval-records', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('approval_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ApprovalRecord[];
    },
    enabled: !!user,
  });

  const approveMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const record = records.find((r) => r.id === recordId);
      if (!record) throw new Error('Record not found');

      const newApprovedBy = [...(record.approved_by || []), user?.id];
      const { error } = await supabase
        .from('approval_records')
        .update({
          approved_by: newApprovedBy,
          status: 'approved',
          current_level: record.current_level + 1,
        })
        .eq('id', recordId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-records'] });
      toast.success('تمت الموافقة بنجاح');
    },
    onError: () => toast.error('حدث خطأ أثناء الموافقة'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ recordId, reason }: { recordId: string; reason: string }) => {
      const { error } = await supabase
        .from('approval_records')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', recordId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-records'] });
      toast.success('تم رفض الطلب');
      setRejectDialogOpen(false);
      setRejectingId(null);
      setRejectionReason('');
    },
    onError: () => toast.error('حدث خطأ أثناء الرفض'),
  });

  const pendingCount = records.filter((r) => r.status === 'pending').length;

  const renderRecordCard = (record: ApprovalRecord) => (
    <Card key={record.id}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">
                  {entityLabels[record.entity_type] || record.entity_type}
                </h3>
                <Badge className={statusColors[record.status]}>
                  {statusLabels[record.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                الكيان: {record.entity_id.substring(0, 8)}...
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(record.created_at).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {record.approved_by && record.approved_by.length > 0 && (
                  <span>{record.approved_by.length} موافقة</span>
                )}
              </div>
              {record.rejection_reason && (
                <div className="mt-2 p-2 rounded bg-destructive/5 text-sm">
                  <span className="font-medium text-destructive">سبب الرفض: </span>
                  {record.rejection_reason}
                </div>
              )}
            </div>
          </div>
          {record.status === 'pending' && (
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                className="gap-1"
                onClick={() => approveMutation.mutate(record.id)}
                disabled={approveMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4" />
                موافقة
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1"
                onClick={() => {
                  setRejectingId(record.id);
                  setRejectDialogOpen(true);
                }}
              >
                <XCircle className="h-4 w-4" />
                رفض
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">طلبات الموافقة</h1>
          <p className="text-muted-foreground">مراجعة والبت في الطلبات المعلقة</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-lg px-3 py-1">
            {pendingCount} معلقة
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="gap-1">
            <Clock className="h-4 w-4" />
            معلقة
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1">
            <CheckCircle2 className="h-4 w-4" />
            موافق عليها
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1">
            <XCircle className="h-4 w-4" />
            مرفوضة
          </TabsTrigger>
          <TabsTrigger value="all">الكل</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : records.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  لا توجد طلبات {statusLabels[activeTab] || ''}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {records.map(renderRecordCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={(open) => !open && setRejectDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>سبب الرفض</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="اذكر سبب رفض هذا الطلب..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectingId && rejectionReason.trim()) {
                  rejectMutation.mutate({ recordId: rejectingId, reason: rejectionReason });
                }
              }}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'جاري الرفض...' : 'تأكيد الرفض'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalsPage;
