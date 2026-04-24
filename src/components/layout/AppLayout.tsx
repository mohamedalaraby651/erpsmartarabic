import { useState, useEffect, lazy, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import MobileDrawer from './MobileDrawer';
import { FABMenu } from '@/components/mobile/FABMenu';
import AppInitSkeleton from '@/components/shared/AppInitSkeleton';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { PageErrorBoundary } from '@/components/shared/PageErrorBoundary';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

import PageTransition from '@/components/transitions/PageTransition';

// Lazy load ShortcutsModal
const ShortcutsModal = lazy(() => import('@/components/keyboard/ShortcutsModal'));

// Use unified PageLoadingState as fallback
function PageSkeleton() {
  return <PageLoadingState />;
}

export default function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Keyboard shortcuts with modal
  const { showShortcutsModal, setShowShortcutsModal } = useKeyboardShortcuts();
  useScrollRestoration();
  
  // ربط مع تفضيلات المستخدم
  const { preferences, updateSidebarCompact, updateTheme } = useUserPreferences();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(preferences.sidebar_compact);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // مزامنة حالة القائمة مع التفضيلات
  useEffect(() => {
    setSidebarCollapsed(preferences.sidebar_compact);
  }, [preferences.sidebar_compact]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const toggleSidebar = () => {
    const newValue = !sidebarCollapsed;
    setSidebarCollapsed(newValue);
    updateSidebarCompact(newValue);
  };

  const toggleTheme = () => {
    const currentTheme = preferences.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    updateTheme(newTheme);
  };

  // حساب isDark من التفضيلات
  const isDark = preferences.theme === 'dark' || 
    (preferences.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Get current page context for FAB
  const getPageContext = () => {
    const path = location.pathname.split('/')[1];
    return path || 'dashboard';
  };

  // Show loader while auth is loading
  if (loading) {
    return <AppInitSkeleton />;
  }

  if (!user) {
    return null;
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-14">
        <MobileHeader onMenuOpen={() => setMobileMenuOpen(true)} />
        <main className="p-3">
          <PageErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <PageTransition direction="fade" duration="fast">
                <Outlet />
              </PageTransition>
            </Suspense>
          </PageErrorBoundary>
        </main>
        <FABMenu pageContext={getPageContext()} />
        <MobileBottomNav onMenuOpen={() => setMobileMenuOpen(true)} />
        <MobileDrawer
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
          isDark={isDark}
          onThemeToggle={toggleTheme}
        />
      </div>
    );
  }

  // Desktop Layout
  return (
    <>
      <div className="min-h-screen bg-background">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          isDark={isDark}
          onThemeToggle={toggleTheme}
        />
        
        <div
          className={cn(
            'transition-all duration-300',
            sidebarCollapsed ? 'mr-[70px]' : 'mr-[260px]'
          )}
        >
          <AppHeader />
          <main className="p-6">
          <PageErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <PageTransition direction="fade" duration="fast">
                <Outlet />
              </PageTransition>
            </Suspense>
          </PageErrorBoundary>
          </main>
        </div>
      </div>
      
      {/* Keyboard Shortcuts Modal */}
      <Suspense fallback={null}>
        <ShortcutsModal 
          open={showShortcutsModal} 
          onOpenChange={setShowShortcutsModal} 
        />
      </Suspense>
    </>
  );
}
