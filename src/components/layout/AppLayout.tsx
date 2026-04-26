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
import { EnvironmentBadge } from '@/components/system/EnvironmentBadge';

import PageTransition from '@/components/transitions/PageTransition';

// Lazy load ShortcutsModal
const ShortcutsModal = lazy(() => import('@/components/keyboard/ShortcutsModal'));

// Use unified PageLoadingState as fallback
function PageSkeleton() {
  return <PageLoadingState />;
}

export default function AppLayout() {
  const { user, loading, initError, retryInit } = useAuth();
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

  // Auth-init failure (timeout / network) — surface a clear recovery UI
  // instead of leaving the user stuck on the loading skeleton forever.
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background" dir="rtl" role="alert">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="h-7 w-7 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">تعذّر التحقق من الجلسة</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            انتهت مهلة الاتصال بالخادم. تأكد من اتصالك بالإنترنت ثم اضغط إعادة المحاولة.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={retryInit}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              إعادة المحاولة
            </button>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        <EnvironmentBadge />
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
        <EnvironmentBadge />
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
