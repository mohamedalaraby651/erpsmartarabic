import { memo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pin, PinOff, Send, StickyNote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CustomerTabNotesProps {
  customerId: string;
}

interface Note {
  id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
}

export const CustomerTabNotes = memo(function CustomerTabNotes({ customerId }: CustomerTabNotesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['customer-notes', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Note[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('غير مسجل الدخول');
      
      const { error } = await supabase
        .from('customer_notes')
        .insert({
          customer_id: customerId,
          user_id: user.id,
          content,
          tenant_id: (await supabase.rpc('get_current_tenant')).data,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes', customerId] });
      setNewNote('');
      toast({ title: "تمت إضافة الملاحظة" });
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('customer_notes')
        .update({ is_pinned: !isPinned })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes', customerId] });
    },
  });

  const handleSubmit = () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">الملاحظات الداخلية</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add note form */}
        <div className="space-y-2">
          <Textarea
            placeholder="اكتب ملاحظة داخلية..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newNote.trim() || addMutation.isPending}
            >
              <Send className="h-4 w-4 ml-1.5" />
              {addMutation.isPending ? 'جاري الإضافة...' : 'إضافة ملاحظة'}
            </Button>
          </div>
        </div>

        {/* Notes list */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8">
            <StickyNote className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد ملاحظات بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  note.is_pinned && "bg-amber-500/5 border-amber-500/30"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {note.is_pinned && (
                      <Badge variant="outline" className="text-[10px] mb-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400">
                        <Pin className="h-2.5 w-2.5 ml-0.5" />مثبتة
                      </Badge>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(note.created_at).toLocaleDateString('ar-EG', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => togglePinMutation.mutate({ id: note.id, isPinned: note.is_pinned })}
                  >
                    {note.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
