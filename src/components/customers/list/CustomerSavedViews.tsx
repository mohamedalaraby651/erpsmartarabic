import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bookmark, Plus, Trash2, Check, Loader2 } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SavedView {
  id: string;
  name: string;
  filters: {
    type: string;
    vip: string;
    governorate: string;
    status: string;
    noCommDays: string;
    inactiveDays: string;
  };
}

interface CustomerSavedViewsProps {
  currentFilters: SavedView['filters'];
  onApplyView: (filters: SavedView['filters']) => void;
}

export function CustomerSavedViews({ currentFilters, onApplyView }: CustomerSavedViewsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [showSave, setShowSave] = useState(false);

  const { data: views = [], isLoading } = useQuery({
    queryKey: ['customer-saved-views', user?.id],
    queryFn: async (): Promise<SavedView[]> => {
      const { data, error } = await supabase
        .from('user_saved_views')
        .select('id, name, filters')
        .eq('section', 'customers')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        filters: row.filters as unknown as SavedView['filters'],
      }));
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('user_saved_views').insert({
        user_id: user!.id,
        section: 'customers',
        name,
        filters: currentFilters as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-saved-views'] });
      setNewName("");
      setShowSave(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_saved_views').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-saved-views'] });
    },
  });

  const handleSave = useCallback(() => {
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  }, [newName, createMutation]);

  const hasActiveFilters = Object.values(currentFilters).some(v => v && v !== 'all');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
          <Bookmark className="h-3.5 w-3.5" />
          المحفوظة
          {views.length > 0 && (
            <span className="bg-muted text-muted-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center">
              {views.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">فلاتر محفوظة</p>

          {isLoading && (
            <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          )}

          {!isLoading && views.length === 0 && !showSave && (
            <p className="text-xs text-muted-foreground/60 text-center py-3">لا توجد فلاتر محفوظة</p>
          )}

          {views.map(view => (
            <div key={view.id} className="flex items-center gap-2 group">
              <button
                onClick={() => onApplyView(view.filters)}
                className="flex-1 text-right text-sm hover:text-primary transition-colors truncate"
              >
                {view.name}
              </button>
              <button
                onClick={() => deleteMutation.mutate(view.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          {showSave ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="اسم المجموعة"
                className="h-8 text-xs"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <Button size="sm" className="h-8 w-8 p-0" onClick={handleSave} disabled={!newName.trim() || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ) : (
            hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => setShowSave(true)}
              >
                <Plus className="h-3.5 w-3.5 ml-1" />
                حفظ الفلاتر الحالية
              </Button>
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
