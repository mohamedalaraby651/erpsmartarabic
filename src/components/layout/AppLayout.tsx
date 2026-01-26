import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import MobileDrawer from './MobileDrawer';
import { FABMenu } from '@/components/mobile/FABMenu';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Skeleton } from '@/components/ui/skeleton';

// Full screen loader for initial app load
function AppLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    </div>
  );
}

// Skeleton loader for page content
function PageSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

export default function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  useKeyboardShortcuts(); // Global keyboard shortcuts
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  // Get current page context for FAB
  const getPageContext = () => {
    const path = location.pathname.split('/')[1];
    return path || 'dashboard';
  };

  // Show loader while auth is loading
  if (loading) {
    return <AppLoader />;
  }

  if (!user) {
    return null;
  }

  // Show skeleton while hydrating to prevent flash
  if (!isHydrated) {
    return <AppLoader />;
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <MobileHeader onMenuOpen={() => setMobileMenuOpen(true)} />
        <main className="p-4">
          <div className="animate-fade-in">
            <Outlet />
          </div>
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
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
