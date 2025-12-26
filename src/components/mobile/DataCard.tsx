import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LongPressMenu } from './LongPressMenu';
import { useDoubleTap } from '@/hooks/useDoubleTap';

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
}

export function DataCard({
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
}: DataCardProps) {
  const handleTap = useDoubleTap({
    onDoubleTap: () => onDoubleTap?.(),
    onSingleTap: onClick,
    delay: 300,
  });

  const cardContent = (
    <Card
      className={cn(
        'transition-all duration-200 active:scale-[0.98]',
        onClick && 'cursor-pointer hover:bg-accent/50',
        className
      )}
      onClick={onDoubleTap ? handleTap : onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar or Icon */}
          {(avatar || avatarFallback) && (
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={avatar} alt={title} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
          )}
          {icon && !avatar && !avatarFallback && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
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
                  className={cn('shrink-0 text-xs', badge.className)}
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
                    <span className="text-foreground/80">{field.value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right content or arrow */}
          {rightContent || (
            <ChevronLeft className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
          )}
        </div>
      </CardContent>
    </Card>
  );

  // If we have menu actions, wrap in LongPressMenu
  if (onView || onEdit || onDelete || menuItems.length > 0) {
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
}
