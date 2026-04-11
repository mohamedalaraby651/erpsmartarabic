import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Pin } from 'lucide-react';

interface SupplierPinnedNoteProps {
  supplierId: string;
}

const SupplierPinnedNote = ({ supplierId }: SupplierPinnedNoteProps) => {
  const { data: pinnedNote } = useQuery({
    queryKey: ['supplier-pinned-note', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_notes')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  if (!pinnedNote) return null;

  return (
    <div className="flex items-start gap-2 px-4 py-2 rounded-lg bg-primary/5 border border-primary/10">
      <Pin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <p className="text-sm text-foreground/80 line-clamp-2">{pinnedNote.note}</p>
    </div>
  );
};

export default SupplierPinnedNote;
