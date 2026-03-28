import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PushSubscriptionData {
  id: string;
  user_id: string;
  subscription: PushSubscriptionJSON;
  device_info: {
    userAgent?: string;
    platform?: string;
    language?: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UsePushNotificationsReturn {
  permission: NotificationPermission;
  subscription: PushSubscription | null;
  isSupported: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: () => void;
}

// VAPID public key would come from environment/secrets in production
const VAPID_PUBLIC_KEY = '';

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isSupported = typeof window !== 'undefined' && 
    'Notification' in window && 
    'serviceWorker' in navigator &&
    'PushManager' in window;

  // Check current permission status
  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  // Get existing subscription on mount
  useEffect(() => {
    const getExistingSubscription = async () => {
      if (!isSupported) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSub = await (registration as unknown as { pushManager?: PushManager }).pushManager?.getSubscription();
        setSubscription(existingSub);
      } catch (error) {
        console.error('Error getting push subscription:', error);
      }
    };

    getExistingSubscription();
  }, [isSupported]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('الإشعارات غير مدعومة في هذا المتصفح');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('تم تفعيل الإشعارات بنجاح');
        return true;
      } else if (result === 'denied') {
        toast.error('تم رفض إذن الإشعارات');
        return false;
      } else {
        toast.info('لم يتم منح إذن الإشعارات');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('حدث خطأ أثناء طلب الإذن');
      return false;
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) {
      return false;
    }

    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      let pushSubscription = await (registration as unknown as { pushManager?: PushManager }).pushManager?.getSubscription();

      if (!pushSubscription && VAPID_PUBLIC_KEY) {
        // Create new subscription
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        pushSubscription = await (registration as unknown as { pushManager: PushManager }).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
      }

      if (pushSubscription) {
        setSubscription(pushSubscription);

        // Save subscription to database
        const subscriptionJSON = pushSubscription.toJSON();
        
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            subscription: subscriptionJSON as unknown as Record<string, unknown>,
            device_info: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language,
            } as unknown as Record<string, unknown>,
            is_active: true,
          });

        if (error) {
          console.error('Error saving push subscription:', error);
          toast.error('حدث خطأ أثناء حفظ الاشتراك');
          return false;
        }

        toast.success('تم الاشتراك في الإشعارات بنجاح');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('حدث خطأ أثناء الاشتراك في الإشعارات');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, permission, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription || !user) {
      return false;
    }

    setIsLoading(true);

    try {
      await subscription.unsubscribe();
      setSubscription(null);

      // Remove subscription from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing push subscription:', error);
      }

      toast.success('تم إلغاء الاشتراك في الإشعارات');
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error('حدث خطأ أثناء إلغاء الاشتراك');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [subscription, user]);

  // Send a test notification (local only)
  const sendTestNotification = useCallback(() => {
    if (permission !== 'granted') {
      toast.error('يجب تفعيل الإشعارات أولاً');
      return;
    }

    try {
      new Notification('اختبار الإشعارات', {
        body: 'هذا إشعار تجريبي للتأكد من عمل الإشعارات',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'test-notification',
        requireInteraction: false,
      });
      toast.success('تم إرسال إشعار تجريبي');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('حدث خطأ أثناء إرسال الإشعار');
    }
  }, [permission]);

  return {
    permission,
    subscription,
    isSupported,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
