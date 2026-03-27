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
import { cn } from "@/lib/utils";

interface CommunicationLogTabProps {
  customerId: string;
}

const typeConfig = {
  call: { label: 'مكالمة', icon: Phone, color: 'bg-info/10 text-info border-info/30' },
  visit: { label: 'زيارة', icon: MapPin, color: 'bg-warning/10 text-warning border-warning/30' },
  email: { label: 'بريد', icon: Mail, color: 'bg-primary/10 text-primary border-primary/30' },
  whatsapp: { label: 'واتساب', icon: MessagesSquare, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  other: { label: 'أخرى', icon: MessageSquare, color: 'bg-muted text-muted-foreground border-muted' },
};

type CommType = keyof typeof typeConfig;

// Group communications by month
function groupByMonth(items: Array<{ communication_date: string; [key: string]: unknown }>) {
  const groups: Record<string, typeof items> = {};
  for (const item of items) {
    const date = new Date(item.communication_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

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
        .from('customer_communications')
        .select('*')
        .eq('customer_id', customerId)
        .order('communication_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('customer_communications').insert({
        customer_id: customerId,
        type: commType,
        subject: subject.trim() || null,
        note: note.trim(),
        created_by: user?.id || '',
      });
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

  const grouped = groupByMonth(communications);

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
          <div className="space-y-6">
            {grouped.map(([monthKey, items]) => {
              const [year, month] = monthKey.split('-');
              const monthLabel = new Date(Number(year), Number(month) - 1).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
              return (
                <div key={monthKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">{monthLabel}</Badge>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  {/* Timeline */}
                  <div className="relative pr-6">
                    {/* Vertical line */}
                    <div className="absolute right-2.5 top-2 bottom-2 w-px bg-border" />
                    
                    <div className="space-y-4">
                      {items.map((comm) => {
                        const type = (comm.type as CommType) || 'other';
                        const config = typeConfig[type] || typeConfig.other;
                        const Icon = config.icon;
                        const colorParts = config.color.split(' ');
                        return (
                          <div key={comm.id as string} className="relative flex items-start gap-3">
                            {/* Timeline dot */}
                            <div className={cn("absolute right-[-14px] w-5 h-5 rounded-full border-2 flex items-center justify-center bg-background", colorParts[2] || 'border-border')}>
                              <div className={cn("w-2 h-2 rounded-full", colorParts[0]?.replace('/10', '/60') || 'bg-muted')} />
                            </div>
                            
                            {/* Content */}
                            <div className={cn("flex-1 p-3 border rounded-lg", `border-l-2`)}>
                              <div className="flex items-center gap-2 mb-1">
                                <div className={cn("p-1 rounded", colorParts[0], colorParts[1])}>
                                  <Icon className="h-3 w-3" />
                                </div>
                                <Badge variant="outline" className="text-[10px] h-5">{config.label}</Badge>
                                {comm.subject && <span className="font-medium text-sm">{comm.subject as string}</span>}
                                <span className="text-xs text-muted-foreground mr-auto">
                                  {new Date(comm.communication_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{comm.note as string}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
