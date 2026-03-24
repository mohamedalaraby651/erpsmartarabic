import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Plus, Phone, Mail, MapPin, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface CommunicationLogTabProps {
  customerId: string;
}

interface CommunicationRecord {
  id: string;
  customer_id: string;
  type: string;
  subject: string | null;
  note: string;
  communication_date: string;
  created_by: string;
  created_at: string;
}

const typeConfig = {
  call: { label: 'مكالمة', icon: Phone, color: 'bg-info/10 text-info' },
  visit: { label: 'زيارة', icon: MapPin, color: 'bg-warning/10 text-warning' },
  email: { label: 'بريد', icon: Mail, color: 'bg-primary/10 text-primary' },
  whatsapp: { label: 'واتساب', icon: MessagesSquare, color: 'bg-emerald-500/10 text-emerald-600' },
  other: { label: 'أخرى', icon: MessageSquare, color: 'bg-muted text-muted-foreground' },
};

type CommType = keyof typeof typeConfig;

const CommunicationLogTab = ({ customerId }: CommunicationLogTabProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commType, setCommType] = useState<CommType>('call');
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');

  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['customer-communications', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_communications' as never)
        .select('*')
        .eq('customer_id', customerId)
        .order('communication_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CommunicationRecord[];
    },
    staleTime: 30000,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('customer_communications' as never).insert({
        customer_id: customerId,
        type: commType,
        subject: subject.trim() || null,
        note: note.trim(),
        created_by: user?.id || '',
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-communications', customerId] });
      toast.success('تم إضافة سجل التواصل');
      setDialogOpen(false);
      setSubject('');
      setNote('');
      setCommType('call');
    },
    onError: () => toast.error('فشل إضافة سجل التواصل'),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          سجل التواصل ({communications.length})
        </CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : communications.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">لا يوجد سجل تواصل</p>
          </div>
        ) : (
          <div className="space-y-3">
            {communications.map((comm) => {
              const type = (comm.type as CommType) || 'other';
              const config = typeConfig[type] || typeConfig.other;
              const Icon = config.icon;
              return (
                <div key={comm.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className={`p-2 rounded-full ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{config.label}</Badge>
                      {comm.subject && <span className="font-medium text-sm">{comm.subject}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{comm.note}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(comm.communication_date).toLocaleString('ar-EG')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة سجل تواصل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">نوع التواصل</label>
              <Select value={commType} onValueChange={(v) => setCommType(v as CommType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">الموضوع (اختياري)</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="موضوع التواصل" />
            </div>
            <div>
              <label className="text-sm font-medium">الملاحظات</label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="تفاصيل التواصل..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!note.trim() || addMutation.isPending}>
              {addMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CommunicationLogTab;
