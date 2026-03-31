import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bookmark, Plus, Trash2, Check } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

const STORAGE_KEY = 'customer-saved-views';

function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveViews(views: SavedView[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

interface CustomerSavedViewsProps {
  currentFilters: {
    type: string;
    vip: string;
    governorate: string;
    status: string;
    noCommDays: string;
    inactiveDays: string;
  };
  onApplyView: (filters: SavedView['filters']) => void;
}

export function CustomerSavedViews({ currentFilters, onApplyView }: CustomerSavedViewsProps) {
  const [views, setViews] = useState<SavedView[]>(loadViews);
  const [newName, setNewName] = useState("");
  const [showSave, setShowSave] = useState(false);

  useEffect(() => { saveViews(views); }, [views]);

  const handleSave = useCallback(() => {
    if (!newName.trim()) return;
    const newView: SavedView = {
      id: Date.now().toString(),
      name: newName.trim(),
      filters: { ...currentFilters },
    };
    setViews(prev => [...prev, newView]);
    setNewName("");
    setShowSave(false);
  }, [newName, currentFilters]);

  const handleDelete = useCallback((id: string) => {
    setViews(prev => prev.filter(v => v.id !== id));
  }, []);

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

          {views.length === 0 && !showSave && (
            <p className="text-xs text-muted-foreground/60 text-center py-3">لا توجد فلاتر محفوظة</p>
          )}

          {views.map(view => (
            <div
              key={view.id}
              className="flex items-center gap-2 group"
            >
              <button
                onClick={() => onApplyView(view.filters)}
                className="flex-1 text-right text-sm hover:text-primary transition-colors truncate"
              >
                {view.name}
              </button>
              <button
                onClick={() => handleDelete(view.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
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
              <Button size="sm" className="h-8 w-8 p-0" onClick={handleSave} disabled={!newName.trim()}>
                <Check className="h-3.5 w-3.5" />
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
