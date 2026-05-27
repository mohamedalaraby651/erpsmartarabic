import { lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import AppInitSkeleton from '@/components/shared/AppInitSkeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useEffect } from 'react';
import { AdaptiveShell } from './AdaptiveShell';

// Lazy chunks are pulled inside AdaptiveShell — no direct lazy import needed here.

export default function AppLayout() {
  const { user, loading, initError, retryInit } = useAuth();
  const navigate = useNavigate();

  // Keyboard shortcuts + scroll restoration are stable cross-cutting concerns.
  const { showShortcutsModal, setShowShortcutsModal } = useKeyboardShortcuts();
  useScrollRestoration();

  const { preferences, updateTheme } = useUserPreferences();

  const toggleTheme = () => {
    const newTheme = preferences.theme === 'dark' ? 'light' : 'dark';
    updateTheme(newTheme);
  };

  const isDark =
    preferences.theme === 'dark' ||
    (preferences.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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

  if (loading) {
    return <AppInitSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <AdaptiveShell
      isDark={isDark}
      onThemeToggle={toggleTheme}
      showShortcutsModal={showShortcutsModal}
      setShowShortcutsModal={setShowShortcutsModal}
    />
  );
}
