import { useTenant } from '@/hooks/useTenant';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import AdminMenu from './AdminMenu';
import QuickActions from '@/components/navigation/QuickActions';
import OfflineIndicator from '@/components/offline/OfflineIndicator';
import { SmartBreadcrumbs } from '@/components/navigation/SmartBreadcrumbs';
import { UserMenu } from './shared/UserMenu';
import { NotificationsBell } from './shared/NotificationsBell';
import { GlobalSearchTrigger } from './shared/GlobalSearchTrigger';

export default function AppHeader() {
  const { currentTenantName } = useTenant();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-6 flex-1">
          <GlobalSearchTrigger variant="desktop" />
          <div className="hidden lg:block">
            <SmartBreadcrumbs />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentTenantName && (
            <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border-primary/30 bg-primary/5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="truncate max-w-[120px] text-sm">{currentTenantName}</span>
            </Badge>
          )}

          <OfflineIndicator />
          <QuickActions />
          <AdminMenu />
          <NotificationsBell variant="desktop" count={3} />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
