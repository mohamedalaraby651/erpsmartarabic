import { memo, useRef, useEffect } from 'react';
import { Search, X, Command } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  collapsed?: boolean;
  placeholder?: string;
}

function SidebarSearch({
  value,
  onChange,
  onClear,
  collapsed = false,
  placeholder = 'ابحث في القائمة...',
}: SidebarSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle keyboard shortcut (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && value) {
        onClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [value, onClear]);

  if (collapsed) {
    return null;
  }

  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'pr-9 pl-16 h-9 text-sm bg-muted/50 border-transparent',
          'focus:bg-background focus:border-border',
          'transition-colors duration-200'
        )}
      />
      <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-destructive/10"
            onClick={onClear}
          >
            <X className="h-3 w-3" />
          </Button>
        ) : (
          <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
            <Command className="h-2.5 w-2.5" />
            <span>K</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(SidebarSearch);
