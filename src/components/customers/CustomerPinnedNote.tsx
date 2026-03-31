import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pin, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CustomerPinnedNoteProps {
  customerId: string;
  onViewAllNotes: () => void;
}

export const CustomerPinnedNote = memo(function CustomerPinnedNote({
  customerId, onViewAllNotes,
}: CustomerPinnedNoteProps) {
  const [open, setOpen] = useState(true);

  const { data: pinnedNote } = useQuery({
    queryKey: ['customer-pinned-note', customerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!customerId,
    staleTime: 60000,
  });

  if (!pinnedNote) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-3">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full text-right">
              <div className="flex items-center gap-2">
                <Pin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 rotate-45" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">ملاحظة مثبتة</span>
              </div>
              {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="text-sm mt-2 text-foreground leading-relaxed line-clamp-3">{pinnedNote.content}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-muted-foreground">
                {new Date(pinnedNote.created_at).toLocaleDateString('ar-EG')}
              </span>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs text-amber-700 dark:text-amber-400" onClick={onViewAllNotes}>
                عرض الكل
              </Button>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
});
