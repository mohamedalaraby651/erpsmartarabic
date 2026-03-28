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
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

// Lazy load ShortcutsModal and PageTransition
const ShortcutsModal = lazy(() => import('@/components/keyboard/ShortcutsModal'));
const PageTransition = lazy(() => import('@/components/transitions/PageTransition'));

// Skeleton loader for page content
function PageSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 w-full rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-64 w-full rounded-lg bg-muted animate-pulse" />
    </div>
  );
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
  const [isHydrated, setIsHydrated] = useState(false);

  // مزامنة حالة القائمة مع التفضيلات
  useEffect(() => {
    setSidebarCollapsed(preferences.sidebar_compact);
  }, [preferences.sidebar_compact]);

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

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

  // Show skeleton while hydrating to prevent flash
  if (!isHydrated) {
    return <AppInitSkeleton />;
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-14">
        <MobileHeader onMenuOpen={() => setMobileMenuOpen(true)} />
        <main className="p-3">
          <Suspense fallback={<PageSkeleton />}>
            <PageTransition key={location.pathname} direction="fade" duration="fast">
              <Outlet />
            </PageTransition>
          </Suspense>
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
            <Suspense fallback={<PageSkeleton />}>
              <PageTransition direction="fade" duration="fast">
                <Outlet />
              </PageTransition>
            </Suspense>
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
