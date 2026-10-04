import { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface GlobalSearchTriggerProps {
  variant?: 'desktop' | 'mobile';
  className?: string;
}

/**
 * Unified global search primitive.
 * - Desktop: inline input that submits to `/search?q=...`.
 * - Mobile: icon trigger that routes directly to `/search`.
 */
export function GlobalSearchTrigger({
  variant = 'desktop',
  className,
}: GlobalSearchTriggerProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  if (variant === 'mobile') {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 rounded-lg hover:bg-muted/80 active:scale-95 transition-all', className)}
        onClick={() => {
          haptics.light();
          navigate('/search');
        }}
        aria-label="بحث"
      >
        <Search className="h-3.5 w-3.5" />
      </Button>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('flex items-center max-w-md', className)}>
      <div className="relative w-full min-w-[200px]">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pr-10 w-full bg-muted/50 border-transparent focus:border-primary/50 focus:bg-background transition-all"
          aria-label="بحث شامل"
        />
      </div>
    </form>
  );
}

export default GlobalSearchTrigger;
