import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  showFilter?: boolean;
  className?: string;
}

export function MobileSearchBar({
  value,
  onChange,
  placeholder = 'بحث...',
  onFilterClick,
  showFilter = false,
  className,
}: MobileSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'relative flex-1 transition-all',
        isFocused && 'ring-2 ring-primary ring-offset-2 rounded-lg'
      )}>
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10 pl-10"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => onChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {showFilter && onFilterClick && (
        <Button
          variant="outline"
          size="icon"
          onClick={onFilterClick}
          className="shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
