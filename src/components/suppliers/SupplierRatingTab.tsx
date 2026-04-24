import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { Star, Plus, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface SupplierRatingTabProps {
  supplierId: string;
  currentRating: number;
  onRatingChange: (rating: number) => void;
}

const SupplierRatingTab = ({ supplierId, currentRating, onRatingChange }: SupplierRatingTabProps) => {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hoveredRating, setHoveredRating] = useState(0);
  const [newNote, setNewNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  const { data: notes, isLoading } = useQuery({
    queryKey: ['supplier-notes', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_notes')
        .select(`
          *,
          profiles:created_by (full_name)
        `)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase
        .from('supplier_notes')
        .insert({
          supplier_id: supplierId,
          note,
          created_by: user?.id,
          tenant_id: tenantId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-notes', supplierId] });
      setNewNote("");
      setShowNoteInput(false);
      toast({ title: "تم إضافة الملاحظة بنجاح" });
    },
    onError: (error) => {
      logErrorSafely('SupplierRatingTab', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNoteMutation.mutate(newNote);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rating Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">تقييم المورد</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onRatingChange(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || currentRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-2xl font-bold text-primary">
              {currentRating}/5
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            اضغط على النجوم لتحديث التقييم
          </p>
        </CardContent>
      </Card>

      {/* Notes Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">ملاحظات الموظفين</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              ملاحظات داخلية حول هذا المورد
            </p>
          </div>
          <Button
            onClick={() => setShowNoteInput(!showNoteInput)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            إضافة ملاحظة
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Note Input */}
          {showNoteInput && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="اكتب ملاحظتك هنا..."
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNoteInput(false);
                    setNewNote("");
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                >
                  {addNoteMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </div>
          )}

          {/* Notes List */}
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : notes && notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="p-4 border rounded-lg bg-background">
                  <p className="text-sm">{note.note}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>{'مستخدم'}</span>
                    <span>•</span>
                    <span>{format(new Date(note.created_at), "d MMM yyyy HH:mm", { locale: ar })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد ملاحظات</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierRatingTab;
