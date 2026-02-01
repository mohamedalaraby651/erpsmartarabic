import { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getSyncQueueCount } from '@/lib/offlineStorage';
import { toast } from 'sonner';

interface OfflineIndicatorProps {
  pendingCount?: number;
  onSync?: () => Promise<void>;
  syncing?: boolean;
}

export default function OfflineIndicator({
  pendingCount: externalPendingCount,
  onSync,
  syncing = false,
}: OfflineIndicatorProps) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [internalPendingCount, setInternalPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(syncing);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Use external count if provided, otherwise use internal
  const pendingCount = externalPendingCount ?? internalPendingCount;

  // Fetch pending count from IndexedDB
  useEffect(() => {
    if (externalPendingCount === undefined) {
      const fetchCount = async () => {
        try {
          const count = await getSyncQueueCount();
          setInternalPendingCount(count);
        } catch (error) {
          console.error('Error fetching sync queue count:', error);
        }
      };

      fetchCount();
      // Refresh count every 10 seconds
      const interval = setInterval(fetchCount, 10000);
      return () => clearInterval(interval);
    }
  }, [externalPendingCount]);

  // Show toast when online status changes
  useEffect(() => {
    if (wasOffline && isOnline) {
      toast.success('تم استعادة الاتصال بالإنترنت', {
        description: pendingCount > 0 ? `${pendingCount} تغيير في انتظار المزامنة` : undefined,
      });
    }
  }, [isOnline, wasOffline, pendingCount]);

  const handleSync = async () => {
    if (!onSync || !isOnline || isSyncing) return;

    setIsSyncing(true);
    setSyncSuccess(false);

    try {
      await onSync();
      setSyncSuccess(true);
      toast.success('تمت المزامنة بنجاح');
      
      // Reset success indicator after 2 seconds
      setTimeout(() => setSyncSuccess(false), 2000);
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('فشلت المزامنة، سيتم إعادة المحاولة');
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show if online and no pending changes
  if (isOnline && pendingCount === 0 && !wasOffline) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Online/Offline Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300',
                isOnline
                  ? 'bg-success/10 text-success'
                  : 'bg-warning/10 text-warning animate-pulse'
              )}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">متصل</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">غير متصل</span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isOnline
              ? 'أنت متصل بالإنترنت'
              : 'أنت غير متصل - البيانات محفوظة محلياً'}
          </TooltipContent>
        </Tooltip>

        {/* Pending Changes with Sync Button */}
        {pendingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 gap-1.5 text-xs relative',
                  isOnline 
                    ? 'text-info hover:text-info hover:bg-info/10' 
                    : 'text-warning hover:text-warning hover:bg-warning/10',
                  syncSuccess && 'text-success'
                )}
                onClick={handleSync}
                disabled={!isOnline || isSyncing}
              >
                {syncSuccess ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isSyncing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : isOnline ? (
                  <Cloud className="h-3.5 w-3.5" />
                ) : (
                  <CloudOff className="h-3.5 w-3.5" />
                )}
                <span className="tabular-nums">
                  {syncSuccess ? 'تمت المزامنة' : `${pendingCount} معلق`}
                </span>
                {/* Progress indicator */}
                {isSyncing && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-info/20 overflow-hidden rounded-b">
                    <div className="h-full bg-info animate-progress w-full" />
                  </div>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {syncSuccess ? (
                'تمت مزامنة جميع التغييرات'
              ) : isSyncing ? (
                'جاري المزامنة...'
              ) : isOnline ? (
                'اضغط لمزامنة التغييرات الآن'
              ) : (
                'سيتم المزامنة تلقائياً عند الاتصال'
              )}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Back online indicator */}
        {wasOffline && isOnline && pendingCount === 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success animate-fade-in">
            <Check className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">تمت المزامنة</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
