import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Star, X } from 'lucide-react';

interface FavoriteItem {
  href: string;
  title: string;
}

interface MobileFavoritesSectionProps {
  favorites: FavoriteItem[];
  currentPath: string;
  onNavigate: (href: string) => void;
  onRemove: (href: string) => void;
}

export function MobileFavoritesSection({
  favorites,
  currentPath,
  onNavigate,
  onRemove,
}: MobileFavoritesSectionProps) {
  const isActive = (href: string) => currentPath === href;

  if (favorites.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
        <span>المفضلة</span>
      </div>
      <div className="space-y-1">
        {favorites.map((fav) => (
          <div key={fav.href} className="flex items-center gap-1">
            <Button
              variant={isActive(fav.href) ? 'secondary' : 'ghost'}
              className={cn(
                'flex-1 justify-start gap-2 h-9',
                isActive(fav.href) && 'bg-amber-500/10 text-amber-600'
              )}
              onClick={() => onNavigate(fav.href)}
            >
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <span className="text-sm truncate">{fav.title}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onRemove(fav.href)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
