import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Factory, Search, Bell, LayoutGrid } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

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

  const handleMenuOpen = () => {
    haptics.light();
    onMenuOpen?.();
  };

  const handleSearch = () => {
    haptics.light();
    navigate('/search');
  };

  const handleNotifications = () => {
    haptics.light();
    navigate('/notifications');
  };

  const handleSettings = () => {
    haptics.light();
    navigate('/settings');
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 px-3 md:hidden safe-area-top shadow-sm">
      {/* Right Side - Menu Button First (RTL) */}
      <div className="flex items-center gap-1">
        {/* Menu Button - Grid Icon - Most prominent */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-xl",
            "bg-gradient-to-br from-primary/20 to-primary/10",
            "hover:from-primary/30 hover:to-primary/15",
            "border border-primary/20",
            "shadow-sm shadow-primary/10",
            "transition-all duration-200 active:scale-95"
          )}
          onClick={handleMenuOpen}
        >
          <LayoutGrid className="h-5 w-5 text-primary" />
        </Button>
        
        {/* Search Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-muted/80 active:scale-95 transition-all"
          onClick={handleSearch}
        >
          <Search className="h-4 w-4" />
        </Button>
        
        {/* Notifications Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-muted/80 relative active:scale-95 transition-all"
          onClick={handleNotifications}
        >
          <Bell className="h-4 w-4" />
          {/* Notification indicator */}
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
          </span>
        </Button>
      </div>

      {/* Left Side - Logo and Avatar (RTL) */}
      <div className="flex items-center gap-2">
        {/* Offline Indicator */}
        {!isOnline && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            غير متصل
          </span>
        )}
        
        {/* Company Name */}
        <span className="font-bold text-sm hidden xs:inline">معدات الدواجن</span>
        
        {/* Logo */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
          <Factory className="h-4 w-4 text-primary" />
        </div>
        
        {/* User Avatar */}
        <Avatar 
          className="h-8 w-8 cursor-pointer border-2 border-primary/20 hover:border-primary/40 transition-colors" 
          onClick={handleSettings}
        >
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-semibold">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
