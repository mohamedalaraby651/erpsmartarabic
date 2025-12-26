import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileListItemProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  avatar?: string;
  avatarFallback?: string;
  icon?: React.ReactNode;
  phone?: string;
  email?: string;
  rightContent?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileListItem({
  title,
  subtitle,
  badge,
  badgeVariant = 'secondary',
  avatar,
  avatarFallback,
  icon,
  phone,
  email,
  rightContent,
  onClick,
  className,
}: MobileListItemProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer hover:bg-accent/50 transition-colors',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Avatar or Icon */}
          {(avatar || avatarFallback) && (
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={avatar} alt={title} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
          )}
          {icon && !avatar && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              {icon}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{title}</h3>
              {badge && (
                <Badge variant={badgeVariant} className="shrink-0 text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
            
            {/* Contact info */}
            {(phone || email) && (
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {phone}
                  </span>
                )}
                {email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {email}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right content or arrow */}
          {rightContent || (
            <ChevronLeft className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
