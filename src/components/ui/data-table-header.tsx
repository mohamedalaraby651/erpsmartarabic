import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SortDirection } from '@/hooks/useTableSort';
import { cn } from '@/lib/utils';

interface DataTableHeaderProps {
  label: string;
  sortKey?: string;
  sortConfig?: { key: string; direction: SortDirection };
  onSort?: (key: string) => void;
  filterKey?: string;
  filterValue?: string | string[];
  filterType?: 'text' | 'select' | 'number' | 'date';
  filterOptions?: { label: string; value: string }[];
  onFilter?: (key: string, value: string | { min?: number; max?: number } | undefined) => void;
  className?: string;
}

export function DataTableHeader({
  label,
  sortKey,
  sortConfig,
  onSort,
  filterKey,
  filterValue,
  filterType = 'text',
  filterOptions,
  onFilter,
  className,
}: DataTableHeaderProps) {
  const isSorted = sortConfig?.key === sortKey;
  const isFiltered = filterValue !== undefined && filterValue !== '';

  const getSortIcon = () => {
    if (!sortKey) return null;
    
    if (isSorted && sortConfig?.direction === 'asc') {
      return <ArrowUp className="h-4 w-4" />;
    }
    if (isSorted && sortConfig?.direction === 'desc') {
      return <ArrowDown className="h-4 w-4" />;
    }
    return <ArrowUpDown className="h-4 w-4 opacity-50" />;
  };

  const handleClearFilter = () => {
    if (filterKey && onFilter) {
      onFilter(filterKey, undefined);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="font-medium">{label}</span>
      
      {sortKey && onSort && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onSort(sortKey)}
        >
          {getSortIcon()}
        </Button>
      )}

      {filterKey && onFilter && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8 w-8 p-0', isFiltered && 'text-primary')}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-60">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">فلترة {label}</span>
                {isFiltered && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={handleClearFilter}
                  >
                    <X className="h-3 w-3 ml-1" />
                    مسح
                  </Button>
                )}
              </div>
              
              {filterType === 'text' && (
                <Input
                  placeholder={`بحث في ${label}...`}
                  value={(filterValue as string) || ''}
                  onChange={(e) => onFilter(filterKey, e.target.value)}
                />
              )}

              {filterType === 'number' && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="من"
                    onChange={(e) => {
                      const current = (filterValue as Record<string, unknown>) || {};
                      onFilter(filterKey, {
                        ...current,
                        min: e.target.value ? Number(e.target.value) : undefined,
                      });
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="إلى"
                    onChange={(e) => {
                      const current = (filterValue as Record<string, unknown>) || {};
                      onFilter(filterKey, {
                        ...current,
                        max: e.target.value ? Number(e.target.value) : undefined,
                      });
                    }}
                  />
                </div>
              )}

              {filterType === 'select' && filterOptions && (
                <Select
                  value={(filterValue as string) || ''}
                  onValueChange={(value) => onFilter(filterKey, value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">الكل</SelectItem>
                    {filterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filterType === 'date' && (
                <Input
                  type="date"
                  value={(filterValue as string) || ''}
                  onChange={(e) => onFilter(filterKey, e.target.value)}
                />
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
