import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, CheckCircle, Wifi, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppBadge } from '@/hooks/useAppBadge';
import { useEffect } from 'react';

// PWA Version for display
const PWA_VERSION = '2.0.0';

export function ReloadPrompt() {
  const { clearBadge } = useAppBadge();

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('[PWA 2.0] Service Worker registered:', registration);
      
      // Check for updates every 60 seconds
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[PWA 2.0] Service Worker registration error:', error);
    },
    onNeedRefresh() {
      console.log('[PWA 2.0] New content available');
    },
    onOfflineReady() {
      console.log('[PWA 2.0] App ready for offline use');
    },
  });

  // Clear app badge when update is applied
  useEffect(() => {
    if (!needRefresh) {
      clearBadge();
    }
  }, [needRefresh, clearBadge]);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  // Show offline ready notification
  if (offlineReady) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[420px] z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-white/20 rounded-full backdrop-blur-sm">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-base">جاهز للعمل بدون إنترنت!</h4>
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">v{PWA_VERSION}</span>
              </div>
              <p className="text-sm opacity-90 leading-relaxed">
                تم تخزين التطبيق بنجاح. يمكنك الآن استخدامه حتى بدون اتصال بالإنترنت مع جميع ميزات PWA 2025.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={close}
                  className="bg-white text-green-600 hover:bg-white/90 font-semibold"
                >
                  <Wifi className="h-4 w-4 ml-2" />
                  حسناً
                </Button>
              </div>
            </div>
            <button
              onClick={close}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show update available notification
  if (needRefresh) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[420px] z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-gradient-to-r from-primary to-blue-600 text-primary-foreground rounded-xl shadow-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-primary-foreground/20 rounded-full backdrop-blur-sm animate-pulse">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-base">تحديث جديد متاح!</h4>
                <span className="px-2 py-0.5 bg-primary-foreground/20 rounded-full text-xs">v{PWA_VERSION}</span>
              </div>
              <p className="text-sm opacity-90 leading-relaxed">
                يتوفر إصدار جديد من التطبيق مع تحسينات في الأداء وميزات PWA 2025 الجديدة.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleUpdate}
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold"
                >
                  <Download className="h-4 w-4 ml-2" />
                  تحديث الآن
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={close}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  لاحقاً
                </Button>
              </div>
            </div>
            <button
              onClick={close}
              className="p-1.5 hover:bg-primary-foreground/20 rounded-lg transition-colors"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
