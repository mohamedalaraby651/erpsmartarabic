import { memo, useState, useRef, useEffect } from 'react';
import { Search, X, Command } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClickableSearchButtonProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

function ClickableSearchButton({
  value,
  onChange,
  onClear,
  placeholder = 'ابحث في القائمة...',
}: ClickableSearchButtonProps) {
  const [isActive, setIsActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle keyboard shortcut (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsActive(true);
      }
      if (e.key === 'Escape' && isActive) {
        setIsActive(false);
        onClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onClear]);

  // Focus input when activated
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  const handleBlur = () => {
    // Only deactivate if empty
    if (!value.trim()) {
      setIsActive(false);
    }
  };

  const handleClear = () => {
    onClear();
    setIsActive(false);
  };

  if (!isActive && !value) {
    return (
      <Button
        variant="outline"
        className={cn(
          'w-full justify-start gap-2 h-9 text-sm bg-muted/50 border-transparent',
          'hover:bg-muted hover:border-border text-muted-foreground'
        )}
        onClick={() => setIsActive(true)}
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-right">{placeholder}</span>
        <div className="flex items-center gap-0.5 text-[10px] bg-background/80 rounded px-1.5 py-0.5">
          <Command className="h-2.5 w-2.5" />
          <span>K</span>
        </div>
      </Button>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn(
          'pr-9 pl-9 h-9 text-sm bg-background border-border',
          'focus:ring-2 focus:ring-primary/20',
          'transition-all duration-200'
        )}
      />
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-destructive/10"
        onClick={handleClear}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default memo(ClickableSearchButton);
