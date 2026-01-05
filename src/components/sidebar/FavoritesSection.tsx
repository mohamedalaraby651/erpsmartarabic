import { memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Star, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FavoritePage } from '@/hooks/useFavoritePages';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableFavoriteItemProps {
  favorite: FavoritePage;
  isActive: boolean;
  onNavigate: (href: string) => void;
  onRemove: (href: string) => void;
  collapsed?: boolean;
}

function SortableFavoriteItem({
  favorite,
  isActive,
  onNavigate,
  onRemove,
  collapsed,
}: SortableFavoriteItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: favorite.href });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={setNodeRef}
            style={style}
            variant={isActive ? 'secondary' : 'ghost'}
            size="icon"
            className={cn(
              'w-full h-9',
              isActive && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
              isDragging && 'opacity-50'
            )}
            onClick={() => onNavigate(favorite.href)}
            {...attributes}
          >
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">{favorite.title}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-1 rounded-md',
        isDragging && 'opacity-50'
      )}
    >
      <button
        className="p-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </button>
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn(
          'flex-1 justify-start gap-2 h-8 text-sm',
          isActive && 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        )}
        onClick={() => onNavigate(favorite.href)}
      >
        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
        <span className="truncate">{favorite.title}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(favorite.href);
        }}
      >
        <Star className="h-3 w-3 fill-current" />
      </Button>
    </div>
  );
}

interface FavoritesSectionProps {
  favorites: FavoritePage[];
  onRemove: (href: string) => void;
  onReorder: (newOrder: FavoritePage[]) => void;
  collapsed?: boolean;
}

function FavoritesSection({
  favorites,
  onRemove,
  onReorder,
  collapsed = false,
}: FavoritesSectionProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = favorites.findIndex((f) => f.href === active.id);
      const newIndex = favorites.findIndex((f) => f.href === over.id);
      onReorder(arrayMove(favorites, oldIndex, newIndex));
    }
  };

  if (favorites.length === 0) return null;

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="space-y-1">
      {!collapsed && (
        <div className="flex items-center gap-2 px-1 mb-1">
          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          <span className="text-xs font-medium text-muted-foreground">المفضلة</span>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={favorites.map((f) => f.href)}
          strategy={verticalListSortingStrategy}
        >
          <div className={cn('space-y-0.5', collapsed && 'space-y-1')}>
            {favorites.map((favorite) => (
              <SortableFavoriteItem
                key={favorite.href}
                favorite={favorite}
                isActive={isActive(favorite.href)}
                onNavigate={(href) => navigate(href)}
                onRemove={onRemove}
                collapsed={collapsed}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default memo(FavoritesSection);
