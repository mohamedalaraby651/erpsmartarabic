import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles?: string[];
  countKey?: string;
  countColor?: string;
}

interface NavSection {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  items: NavItem[];
}

interface MobileNavSectionProps {
  section: NavSection;
  currentPath: string;
  userRole: string | null;
  counts: Record<string, number> | undefined;
  favorites: { href: string }[];
  onNavigate: (href: string) => void;
  onToggleFavorite: (href: string, title: string) => void;
}

export function MobileNavSection({
  section,
  currentPath,
  userRole,
  counts,
  favorites,
  onNavigate,
  onToggleFavorite,
}: MobileNavSectionProps) {
  const filterItems = (items: NavItem[]) => {
    return items.filter(item => {
      if (!item.roles) return true;
      if (!userRole) return false;
      return item.roles.includes(userRole);
    });
  };

  const isActive = (href: string) => currentPath === href;

  const getCount = (item: NavItem) => {
    if (!item.countKey || !counts) return undefined;
    return counts[item.countKey as keyof typeof counts];
  };

  const isFavorite = (href: string) => favorites.some(f => f.href === href);

  const filteredItems = filterItems(section.items);
  if (filteredItems.length === 0) return null;

  const SectionIcon = section.icon;

  return (
    <div>
      <div className={cn('flex items-center gap-2 mb-2', section.color)}>
        <div className={cn('p-1.5 rounded', section.bgColor)}>
          <SectionIcon className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold">{section.title}</h3>
      </div>
      <div className="space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const count = getCount(item);
          const favorite = isFavorite(item.href);

          return (
            <div key={item.href} className="flex items-center gap-1 group">
              <Button
                variant={active ? 'secondary' : 'ghost'}
                className={cn(
                  'flex-1 justify-start gap-3 h-10',
                  active && `${section.bgColor} ${section.color}`
                )}
                onClick={() => onNavigate(item.href)}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-right">{item.title}</span>
                {count !== undefined && count > 0 && (
                  <Badge
                    className={cn(
                      'text-[10px] h-5 min-w-[20px]',
                      item.countColor,
                      'text-white'
                    )}
                  >
                    {count > 99 ? '99+' : count}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity',
                  favorite && 'opacity-100'
                )}
                onClick={() => onToggleFavorite(item.href, item.title)}
              >
                <Star
                  className={cn(
                    'h-3.5 w-3.5',
                    favorite
                      ? 'fill-amber-500 text-amber-500'
                      : 'text-muted-foreground'
                  )}
                />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
