import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { savedViewsRepository } from "@/application/queries/saved-views";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface SupplierSavedViewsProps {
  onApply: (filters: Record<string, string>) => void;
  currentFilters: Record<string, string>;
}

const SupplierSavedViews = ({ onApply, currentFilters }: SupplierSavedViewsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [viewName, setViewName] = useState('');

  const { data: views = [] } = useQuery({
    queryKey: ['saved-views', 'suppliers', user?.id],
    queryFn: () => savedViewsRepository.list<Record<string, string>>('suppliers', user?.id),
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      await savedViewsRepository.create({
        userId: user.id,
        section: 'suppliers',
        name,
        filters: currentFilters,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-views', 'suppliers'] });
      toast.success('تم حفظ العرض');
      setShowSaveInput(false);
      setViewName('');
    },
    onError: () => toast.error('فشل حفظ العرض'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => savedViewsRepository.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-views', 'suppliers'] });
      toast.success('تم حذف العرض');
    },
  });

  const handleSave = () => {
    if (!viewName.trim()) return;
    saveMutation.mutate(viewName.trim());
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {views.map((view) => (
        <Badge
          key={view.id}
          variant="outline"
          className="cursor-pointer hover:bg-primary/10 gap-1 py-1 px-2"
          onClick={() => onApply(view.filters)}
        >
          <Star className="h-3 w-3" />
          {view.name}
          <button
            className="mr-1 hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(view.id); }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {showSaveInput ? (
        <div className="flex items-center gap-1">
          <Input
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder="اسم العرض"
            className="h-7 w-32 text-xs"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleSave}>حفظ</Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setShowSaveInput(false)}>إلغاء</Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={() => setShowSaveInput(true)}>
          <Plus className="h-3 w-3" />حفظ العرض الحالي
        </Button>
      )}
    </div>
  );
};

export default SupplierSavedViews;
