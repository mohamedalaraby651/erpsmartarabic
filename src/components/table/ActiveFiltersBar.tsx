/**
 * ActiveFiltersBar (OPA-UI-002).
 *
 * Shows every column filter currently narrowing the table as a removable
 * chip, and lets the user store the whole combination as a named set that is
 * persisted per user via the existing saved-views repository.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, BookmarkPlus, Filter, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  savedViewsRepository,
  type SavedViewSection,
} from '@/lib/repositories/savedViewsRepository';
import {
  describeFilter,
  type ColumnFilter,
  type ColumnFilters,
  type FilterOption,
} from '@/components/ui/column-filter';

export interface FilterColumnMeta {
  label: string;
  options?: FilterOption[];
}

interface ActiveFiltersBarProps {
  filters: ColumnFilters;
  columns: Record<string, FilterColumnMeta>;
  onRemove: (key: string) => void;
  onClearAll: () => void;
  onApplySet: (filters: ColumnFilters) => void;
  section: SavedViewSection;
  /** Number of rows matching the current filters, shown as context. */
  resultCount?: number;
}

export function ActiveFiltersBar({
  filters,
  columns,
  onRemove,
  onClearAll,
  onApplySet,
  section,
  resultCount,
}: ActiveFiltersBarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);

  const entries = Object.entries(filters);

  const { data: savedSets = [] } = useQuery({
    queryKey: ['column-filter-sets', section, user?.id],
    queryFn: () => savedViewsRepository.list<ColumnFilters>(section, user!.id),
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      savedViewsRepository.create<ColumnFilters>({
        userId: user!.id,
        section,
        name: name.trim(),
        filters,
      }),
    meta: { successMessage: 'تم حفظ مجموعة الفلاتر' },
    onSuccess: () => {
      setName('');
      setSaveOpen(false);
      queryClient.invalidateQueries({ queryKey: ['column-filter-sets', section] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => savedViewsRepository.remove(id),
    meta: { successMessage: 'تم حذف المجموعة' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['column-filter-sets', section] }),
  });

  const hasFilters = entries.length > 0;
  if (!hasFilters && savedSets.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        <span>{hasFilters ? `${entries.length} فلتر نشط` : 'لا توجد فلاتر نشطة'}</span>
        {hasFilters && typeof resultCount === 'number' && (
          <span className="tabular-nums">· {resultCount} نتيجة</span>
        )}
      </div>

      {hasFilters && <Separator orientation="vertical" className="h-5" />}

      {entries.map(([key, filter]) => (
        <Badge
          key={key}
          variant="secondary"
          className="gap-1 border border-border/60 bg-background py-1 ps-1 pe-2 font-normal"
        >
          <button
            type="button"
            onClick={() => onRemove(key)}
            aria-label={`إزالة فلتر ${columns[key]?.label ?? key}`}
            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
          <span className="font-medium">{columns[key]?.label ?? key}:</span>
          <span className="text-muted-foreground">
            {describeFilter(filter as ColumnFilter, columns[key]?.options)}
          </span>
        </Badge>
      ))}

      <div className="ms-auto flex items-center gap-1.5">
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearAll}>
            مسح الكل
          </Button>
        )}

        {hasFilters && user?.id && (
          <Popover open={saveOpen} onOpenChange={setSaveOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <BookmarkPlus className="h-3.5 w-3.5" />حفظ المجموعة
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-2 p-3">
              <p className="text-sm font-medium">حفظ الفلاتر الحالية</p>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم المجموعة..."
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                className="w-full"
                disabled={!name.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                حفظ
              </Button>
            </PopoverContent>
          </Popover>
        )}

        {savedSets.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <Bookmark className="h-3.5 w-3.5" />المجموعات ({savedSets.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-1">
              {savedSets.map((v) => (
                <div key={v.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onApplySet(v.filters)}
                    className="flex-1 truncate rounded-md px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted"
                  >
                    {v.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label={`حذف ${v.name}`}
                    onClick={() => deleteMutation.mutate(v.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
