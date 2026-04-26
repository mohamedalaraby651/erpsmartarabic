import { memo } from 'react';
import { AlertTriangle, RotateCw, WifiOff, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ListErrorVariant = 'network' | 'server' | 'permission' | 'generic';

interface ListErrorStateProps {
  /** Optional Error object — used to derive variant + technical details */
  error?: Error | unknown;
  /** Force a specific variant; otherwise auto-detected from error */
  variant?: ListErrorVariant;
  /** Custom heading shown to the user */
  title?: string;
  /** Custom description shown to the user */
  description?: string;
  /** Retry handler */
  onRetry?: () => void;
  /** Loading flag for the retry button */
  isRetrying?: boolean;
  /** Compact mode (used inline) vs full-page */
  compact?: boolean;
  className?: string;
}

const VARIANT_META: Record<ListErrorVariant, {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  tone: string;
  bg: string;
}> = {
  network: {
    icon: WifiOff,
    title: 'تعذر الاتصال بالشبكة',
    description: 'تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.',
    tone: 'text-warning',
    bg: 'bg-warning/10 border-warning/20',
  },
  server: {
    icon: ServerCrash,
    title: 'حدث خطأ في الخادم',
    description: 'نواجه مشكلة فنية مؤقتة. يرجى إعادة المحاولة بعد لحظات.',
    tone: 'text-destructive',
    bg: 'bg-destructive/10 border-destructive/20',
  },
  permission: {
    icon: AlertTriangle,
    title: 'لا تملك صلاحية الوصول',
    description: 'تواصل مع مدير النظام إذا كنت تعتقد أن هذا خطأ.',
    tone: 'text-warning',
    bg: 'bg-warning/10 border-warning/20',
  },
  generic: {
    icon: AlertTriangle,
    title: 'حدث خطأ غير متوقع',
    description: 'لم نتمكن من تحميل البيانات. حاول مرة أخرى.',
    tone: 'text-destructive',
    bg: 'bg-destructive/10 border-destructive/20',
  },
};

function detectVariant(error: unknown): ListErrorVariant {
  if (!error) return 'generic';
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('offline')) return 'network';
  if (msg.includes('permission') || msg.includes('rls') || msg.includes('forbidden') || msg.includes('401') || msg.includes('403')) return 'permission';
  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('timeout')) return 'server';
  return 'generic';
}

function ListErrorStateInner({
  error,
  variant,
  title,
  description,
  onRetry,
  isRetrying = false,
  compact = false,
  className,
}: ListErrorStateProps) {
  const resolvedVariant = variant ?? detectVariant(error);
  const meta = VARIANT_META[resolvedVariant];
  const Icon = meta.icon;
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <Card className={cn('border-dashed shadow-sm animate-fade-in', className)}>
      <CardContent
        className={cn(
          'flex flex-col items-center justify-center text-center',
          compact ? 'py-8 px-4' : 'py-12 px-6',
        )}
      >
        <div
          className={cn(
            'rounded-2xl flex items-center justify-center border mb-5',
            meta.bg,
            compact ? 'h-14 w-14' : 'h-20 w-20',
          )}
        >
          <Icon className={cn(meta.tone, compact ? 'h-7 w-7' : 'h-10 w-10')} strokeWidth={1.75} />
        </div>

        <h3 className={cn('font-bold text-foreground mb-2', compact ? 'text-base' : 'text-lg')}>
          {title ?? meta.title}
        </h3>

        <p
          className={cn(
            'text-muted-foreground max-w-sm leading-relaxed',
            compact ? 'text-xs mb-4' : 'text-sm mb-6',
          )}
        >
          {description ?? meta.description}
        </p>

        {/* Technical details — hidden by default, available on tap for debugging */}
        {errorMessage && import.meta.env.DEV && (
          <details className="mb-4 w-full max-w-sm">
            <summary className="text-xs text-muted-foreground/70 cursor-pointer hover:text-muted-foreground">
              التفاصيل التقنية
            </summary>
            <code className="block mt-2 p-2 text-xs bg-muted/50 rounded-md text-left direction-ltr text-destructive/80 break-all">
              {errorMessage}
            </code>
          </details>
        )}

        {onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            size={compact ? 'sm' : 'default'}
            className="gap-2 shadow-sm hover:shadow-md transition-all"
          >
            <RotateCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
            {isRetrying ? 'جارٍ المحاولة...' : 'إعادة المحاولة'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export const ListErrorState = memo(ListErrorStateInner);
export default ListErrorState;
