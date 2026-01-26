import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Factory, Search, Bell, LayoutGrid } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  onMenuOpen?: () => void;
}

export default function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:hidden">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Factory className="h-4 w-4 text-primary" />
        </div>
        <span className="font-bold text-sm">معدات الدواجن</span>
        
        {/* Offline Indicator */}
        {!isOnline && (
          <span className="flex items-center gap-1 text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
            Offline
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => navigate('/search')}
        >
          <Search className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          onClick={() => navigate('/notifications')}
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 left-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <Avatar className="h-8 w-8 cursor-pointer" onClick={() => navigate('/settings')}>
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {userInitials}
          </AvatarFallback>
        </Avatar>

        {/* Menu Button - Grid Icon */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onMenuOpen}
        >
          <LayoutGrid className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
