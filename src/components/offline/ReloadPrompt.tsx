import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, CheckCircle, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('[PWA] Service Worker registered successfully:', registration);
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration error:', error);
    },
  });

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
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-green-600 text-white rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">جاهز للعمل بدون إنترنت!</h4>
              <p className="text-sm opacity-90 mt-1">
                تم تخزين التطبيق بنجاح. يمكنك الآن استخدامه حتى بدون اتصال بالإنترنت.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={close}
                  className="bg-white text-green-600 hover:bg-white/90"
                >
                  <Wifi className="h-4 w-4 ml-2" />
                  حسناً
                </Button>
              </div>
            </div>
            <button
              onClick={close}
              className="p-1 hover:bg-white/20 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show update available notification
  if (needRefresh) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-foreground/20 rounded-full">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">تحديث متاح!</h4>
              <p className="text-sm opacity-90 mt-1">
                يتوفر إصدار جديد من التطبيق. قم بالتحديث للحصول على أحدث الميزات.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleUpdate}
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  <RefreshCw className="h-4 w-4 ml-2" />
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
              className="p-1 hover:bg-primary-foreground/20 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
