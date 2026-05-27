import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Layers, LayoutGrid } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useEffect, useState } from 'react';
import { TenantSelector } from '@/components/tenant';
import { useTenant } from '@/hooks/useTenant';
import { GlobalSearchTrigger } from './shared/GlobalSearchTrigger';
import { NotificationsBell } from './shared/NotificationsBell';
import { UserMenu } from './shared/UserMenu';

interface MobileHeaderProps {
  onMenuOpen?: () => void;
}

export default function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
  const navigate = useNavigate();
  const { isOnline } = useOnlineStatus();
  const { hasManyTenants } = useTenant();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkPending = () => {
      try {
        const queue = localStorage.getItem('offline_mutation_queue');
        if (queue) {
          const parsed = JSON.parse(queue);
          const count = Array.isArray(parsed) ? parsed.length : 0;
          setPendingCount((prev) => (prev !== count ? count : prev));
        } else {
          setPendingCount((prev) => (prev !== 0 ? 0 : prev));
        }
      } catch {
        setPendingCount((prev) => (prev !== 0 ? 0 : prev));
      }
    };
    checkPending();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'offline_mutation_queue') checkPending();
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(checkPending, 30000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const handleMenuOpen = () => {
    haptics.light();
    onMenuOpen?.();
  };

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/90 px-2.5 lg:hidden safe-area-top shadow-sm">
      {/* Right Side - Menu + utilities (RTL) */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-9 w-9 rounded-lg',
            'bg-gradient-to-br from-primary/20 to-primary/10',
            'hover:from-primary/30 hover:to-primary/15',
            'border border-primary/20',
            'shadow-sm shadow-primary/10',
            'transition-all duration-200 active:scale-95'
          )}
          onClick={handleMenuOpen}
          aria-label="فتح القائمة"
        >
          <LayoutGrid className="h-4 w-4 text-primary" />
        </Button>

        <GlobalSearchTrigger variant="mobile" />
        <NotificationsBell variant="mobile" />
      </div>

      {/* Center — Tenant selector (only when user has multiple) */}
      {hasManyTenants && (
        <div className="flex-1 max-w-[140px] mx-2">
          <TenantSelector />
        </div>
      )}

      {/* Left Side — Branding + User (RTL) */}
      <div className="flex items-center gap-1.5">
        {!isOnline && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/20">
            <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
            غير متصل
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white rounded-full px-1 min-w-[16px] text-center text-[9px] font-bold">
                {pendingCount}
              </span>
            )}
          </span>
        )}

        <span className="font-bold text-xs hidden xs:inline bg-gradient-to-l from-primary to-violet-500 bg-clip-text text-transparent">نظرة</span>

        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 shadow-sm shadow-primary/20"
          aria-hidden="true"
        >
          <Layers className="h-3.5 w-3.5 text-white" />
        </div>

        <UserMenu compact />
      </div>
    </header>
  );
}
