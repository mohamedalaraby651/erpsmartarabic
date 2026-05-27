import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface NotificationsBellProps {
  /** Mobile variant navigates directly to /notifications; desktop opens a dropdown. */
  variant?: 'desktop' | 'mobile';
  count?: number;
  className?: string;
}

export function NotificationsBell({
  variant = 'desktop',
  count = 0,
  className,
}: NotificationsBellProps) {
  const navigate = useNavigate();

  if (variant === 'mobile') {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 rounded-lg hover:bg-muted/80 relative active:scale-95 transition-all', className)}
        onClick={() => {
          haptics.light();
          navigate('/notifications');
        }}
        aria-label="الإشعارات"
      >
        <Bell className="h-3.5 w-3.5" />
        <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive" />
        </span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative hover:bg-muted/80', className)}
          aria-label="الإشعارات"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -left-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center animate-pulse">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="p-4 text-center text-sm text-muted-foreground">
          لا توجد إشعارات جديدة
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationsBell;
