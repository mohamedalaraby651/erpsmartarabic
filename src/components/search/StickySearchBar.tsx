import { useState, useRef, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StickySearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFilterClick?: () => void;
  placeholder?: string;
  showFilter?: boolean;
  className?: string;
}

export function StickySearchBar({
  value,
  onChange,
  onFilterClick,
  placeholder = 'ابحث...',
  showFilter = true,
  className,
}: StickySearchBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show when scrolling up or at top
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Hide when scrolling down and past threshold
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div
      className={cn(
        'sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b transition-transform duration-300 p-3',
        !isVisible && '-translate-y-full',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pr-10 pl-10 h-11 bg-muted/50"
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
            className="h-11 w-11 shrink-0"
            onClick={onFilterClick}
          >
            <Filter className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
