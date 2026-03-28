import { memo, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Trash2, Pencil, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LongPressMenu } from './LongPressMenu';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { haptics } from '@/lib/haptics';
import { useIsMobile } from '@/hooks/use-mobile';

interface DataField {
  label: string;
  value: string | number | React.ReactNode;
  icon?: React.ReactNode;
}

interface DataCardProps {
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  };
  avatar?: string;
  avatarFallback?: string;
  icon?: React.ReactNode;
  fields?: DataField[];
  rightContent?: React.ReactNode;
  onClick?: () => void;
  onDoubleTap?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  menuItems?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive';
    separator?: boolean;
  }>;
  swipeActions?: boolean;
}

// Swipe action button
function SwipeAction({ 
  icon: Icon, 
  label, 
  variant = 'default',
  onClick,
}: { 
  icon: React.ElementType; 
  label: string; 
  variant?: 'default' | 'destructive' | 'primary';
  onClick: () => void;
}) {
  const variantClasses = {
    default: 'bg-muted text-muted-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    primary: 'bg-primary text-primary-foreground',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        haptics.medium();
        onClick();
      }}
      className={cn(
        'flex flex-col items-center justify-center w-16 h-full transition-transform',
        variantClasses[variant]
      )}
    >
      <Icon className="h-5 w-5 mb-1" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export const DataCard = memo(function DataCard({
  title,
  subtitle,
  badge,
  avatar,
  avatarFallback,
  icon,
  fields = [],
  rightContent,
  onClick,
  onDoubleTap,
  onView,
  onEdit,
  onDelete,
  className,
  menuItems = [],
  swipeActions = true,
}: DataCardProps) {
  const isMobile = useIsMobile();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTap = useDoubleTap({
    onDoubleTap: () => {
      haptics.medium();
      onDoubleTap?.();
    },
    onSingleTap: () => {
      haptics.light();
      onClick?.();
    },
    delay: 300,
  });

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeActions || (!onEdit && !onDelete && !onView)) return;
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = startX.current - currentX;
    // RTL: swipe left reveals actions (positive diff)
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 130));
    } else {
      setSwipeOffset(Math.max(diff, 0));
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (swipeOffset > 65) {
      setSwipeOffset(130);
      haptics.light();
    } else {
      setSwipeOffset(0);
    }
  };

  const closeSwipe = () => {
    setSwipeOffset(0);
  };

  const hasSwipeActions = swipeActions && (onView || onEdit || onDelete);

  const cardContent = (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe actions behind the card */}
      {hasSwipeActions && (
        <div className="absolute inset-y-0 left-0 flex h-full">
          {onView && (
            <SwipeAction
              icon={Eye}
              label="عرض"
              variant="primary"
              onClick={() => {
                closeSwipe();
                onView();
              }}
            />
          )}
          {onEdit && (
            <SwipeAction
              icon={Pencil}
              label="تعديل"
              variant="default"
              onClick={() => {
                closeSwipe();
                onEdit();
              }}
            />
          )}
          {onDelete && (
            <SwipeAction
              icon={Trash2}
              label="حذف"
              variant="destructive"
              onClick={() => {
                closeSwipe();
                onDelete();
              }}
            />
          )}
        </div>
      )}

      <Card
        ref={cardRef}
        className={cn(
          'relative transition-all duration-200 border-border/50',
          'shadow-sm hover:shadow-md active:shadow-sm',
          'bg-card/95 backdrop-blur-sm',
          onClick && 'cursor-pointer',
          isSwiping ? '' : 'transition-transform',
          className
        )}
        style={{
          transform: `translateX(-${swipeOffset}px)`,
        }}
        onClick={onDoubleTap ? handleTap : () => {
          haptics.light();
          onClick?.();
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar or Icon */}
            {(avatar || avatarFallback) && (
              <Avatar className="h-12 w-12 shrink-0 ring-2 ring-background shadow-sm">
                <AvatarImage src={avatar} alt={title} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
            )}
            {icon && !avatar && !avatarFallback && (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary shrink-0 shadow-sm">
                {icon}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">{title}</h3>
                {badge && (
                  <Badge
                    variant={badge.variant || 'secondary'}
                    className={cn('shrink-0 text-xs shadow-sm', badge.className)}
                  >
                    {badge.text}
                  </Badge>
                )}
              </div>

              {subtitle && (
                <p className="text-sm text-muted-foreground truncate mb-2">
                  {subtitle}
                </p>
              )}

              {/* Additional fields */}
              {fields.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {fields.map((field, index) => (
                    <span key={index} className="flex items-center gap-1">
                      {field.icon}
                      <span className="text-muted-foreground/70">{field.label}:</span>
                      <span className="text-foreground/80 font-medium">{field.value}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right content or mobile quick actions or arrow */}
            {rightContent || (
              isMobile && (onView || onEdit) ? (
                <div className="flex items-center gap-1 shrink-0">
                  {onView && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11 h-11 w-11 text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); haptics.light(); onView(); }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11 h-11 w-11 text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); haptics.light(); onEdit(); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <ChevronLeft className="h-5 w-5 text-muted-foreground/50 shrink-0 mt-1" />
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // If we have menu actions and not using swipe, wrap in LongPressMenu
  if (!swipeActions && (onView || onEdit || onDelete || menuItems.length > 0)) {
    return (
      <LongPressMenu
        items={menuItems}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      >
        {cardContent}
      </LongPressMenu>
    );
  }

  return cardContent;
});
