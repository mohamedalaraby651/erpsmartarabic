import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Pin, PinOff, Trash2, Plus, StickyNote, Loader2 } from 'lucide-react';

interface SupplierNotesTabProps {
  supplierId: string;
}

interface SupplierNote {
  id: string;
  supplier_id: string;
  note: string;
  is_pinned: boolean;
  user_id: string | null;
  created_by: string | null;
  created_at: string;
}

const SupplierNotesTab = ({ supplierId }: SupplierNotesTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['supplier-notes', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_notes')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SupplierNote[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (note: string) => {
      const { error } = await supabase.from('supplier_notes').insert({
        supplier_id: supplierId,
        note,
        user_id: user?.id,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-notes', supplierId] });
      setNewNote('');
      setIsAdding(false);
      toast({ title: 'تمت إضافة الملاحظة' });
    },
    onError: () => toast({ title: 'حدث خطأ', variant: 'destructive' }),
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from('supplier_notes').update({ is_pinned: pinned }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['supplier-notes', supplierId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('supplier_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-notes', supplierId] });
      toast({ title: 'تم حذف الملاحظة' });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5" />الملاحظات ({notes.length})</CardTitle>
        <Button size="sm" onClick={() => setIsAdding(true)} className="gap-1"><Plus className="h-4 w-4" />إضافة</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isAdding && (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="اكتب ملاحظة..." className="min-h-[80px]" />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setNewNote(''); }}>إلغاء</Button>
              <Button size="sm" onClick={() => addMutation.mutate(newNote)} disabled={!newNote.trim() || addMutation.isPending}>
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : notes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد ملاحظات</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className={`p-3 rounded-lg border ${note.is_pinned ? 'bg-primary/5 border-primary/20' : 'bg-background'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {note.is_pinned && <Badge variant="outline" className="mb-1 text-[10px] bg-primary/10 text-primary border-primary/20">مثبتة</Badge>}
                  <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(note.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePinMutation.mutate({ id: note.id, pinned: !note.is_pinned })}>
                    {note.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(note.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default SupplierNotesTab;
