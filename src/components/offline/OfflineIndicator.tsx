import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OfflineIndicatorProps {
  pendingCount?: number;
  onSync?: () => void;
  syncing?: boolean;
}

export default function OfflineIndicator({
  pendingCount = 0,
  onSync,
  syncing = false,
}: OfflineIndicatorProps) {
  const { isOnline, wasOffline } = useOnlineStatus();

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
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                isOnline
                  ? 'bg-success/10 text-success'
                  : 'bg-warning/10 text-warning'
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

        {/* Pending Changes */}
        {pendingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 gap-1.5 text-xs',
                  isOnline ? 'text-info hover:text-info' : 'text-warning hover:text-warning'
                )}
                onClick={onSync}
                disabled={!isOnline || syncing}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
                <span>{pendingCount} تغيير معلق</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isOnline
                ? 'اضغط لمزامنة التغييرات'
                : 'سيتم المزامنة عند الاتصال'}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
