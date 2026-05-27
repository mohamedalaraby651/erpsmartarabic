import { Suspense, lazy, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import MobileDrawer from './MobileDrawer';
import { FABMenu } from '@/components/mobile/FABMenu';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { PageErrorBoundary } from '@/components/shared/PageErrorBoundary';
import { EnvironmentBadge } from '@/components/system/EnvironmentBadge';
import PageTransition from '@/components/transitions/PageTransition';

const ShortcutsModal = lazy(() => import('@/components/keyboard/ShortcutsModal'));
const CommandBar = lazy(() =>
  import('@/components/dashboard/CommandBar').then((m) => ({ default: m.CommandBar }))
);

interface AdaptiveShellProps {
  isDark: boolean;
  onThemeToggle: () => void;
  showShortcutsModal: boolean;
  setShowShortcutsModal: (v: boolean) => void;
}

/**
 * Unified adaptive shell — a single DOM tree whose layout adapts via Tailwind
 * responsive utilities instead of branching on `useIsMobile()`. Sidebar shows
 * on `lg+`, mobile chrome (header/bottom-nav/FAB) on `<lg`.
 */
export function AdaptiveShell({
  isDark,
  onThemeToggle,
  showShortcutsModal,
  setShowShortcutsModal,
}: AdaptiveShellProps) {
  const location = useLocation();
  const { preferences, updateSidebarCompact } = useUserPreferences();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(preferences.sidebar_compact);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(preferences.sidebar_compact);
  }, [preferences.sidebar_compact]);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    updateSidebarCompact(next);
  };

  const pageContext = (location.pathname.split('/')[1] || 'dashboard');

  return (
    <>
      <div className="min-h-screen bg-background">
        <EnvironmentBadge />

        {/* Desktop sidebar — hidden on small screens */}
        <div className="hidden lg:block">
          <AppSidebar
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebar}
            isDark={isDark}
            onThemeToggle={onThemeToggle}
          />
        </div>

        {/* Mobile header — visible below lg */}
        <div className="lg:hidden">
          <MobileHeader onMenuOpen={() => setMobileMenuOpen(true)} />
        </div>

        {/* Main content — padded to sidebar on desktop */}
        <div
          className={cn(
            'transition-all duration-300',
            'lg:' + (sidebarCollapsed ? 'mr-[70px]' : 'mr-[260px]'),
            sidebarCollapsed ? 'lg:mr-[70px]' : 'lg:mr-[260px]',
            'pb-12 lg:pb-0'
          )}
        >
          <div className="hidden lg:block">
            <AppHeader />
          </div>

          <main className="container-wide p-2.5 lg:p-6">
            <PageErrorBoundary>
              <Suspense fallback={<PageLoadingState />}>
                <PageTransition direction="fade" duration="fast">
                  <Outlet />
                </PageTransition>
              </Suspense>
            </PageErrorBoundary>
          </main>
        </div>

        {/* Mobile chrome — bottom nav + FAB + drawer */}
        <div className="lg:hidden">
          <FABMenu pageContext={pageContext} />
          <MobileBottomNav onMenuOpen={() => setMobileMenuOpen(true)} />
          <MobileDrawer
            open={mobileMenuOpen}
            onOpenChange={setMobileMenuOpen}
            isDark={isDark}
            onThemeToggle={onThemeToggle}
          />
        </div>
      </div>

      <Suspense fallback={null}>
        <ShortcutsModal open={showShortcutsModal} onOpenChange={setShowShortcutsModal} />
        <CommandBar />
      </Suspense>
    </>
  );
}

export default AdaptiveShell;
