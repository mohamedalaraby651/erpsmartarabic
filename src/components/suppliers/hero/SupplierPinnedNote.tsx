import { useQuery } from '@tanstack/react-query';
import { supplierRepository } from '@/application/queries/suppliers';
import { Pin } from 'lucide-react';

interface SupplierPinnedNoteProps {
  supplierId: string;
}

const SupplierPinnedNote = ({ supplierId }: SupplierPinnedNoteProps) => {
  const { data: pinnedNote } = useQuery({
    queryKey: ['supplier-pinned-note', supplierId],
    queryFn: async () => {
      const notes = await supplierRepository.listNotes(supplierId);
      return notes.find((n) => n.is_pinned) ?? null;
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
