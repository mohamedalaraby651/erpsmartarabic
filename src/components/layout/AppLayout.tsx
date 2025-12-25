import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import MobileDrawer from './MobileDrawer';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <MobileHeader />
        <main className="p-4">
          <Outlet />
        </main>
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
