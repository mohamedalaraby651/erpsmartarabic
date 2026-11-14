import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  shown: number;
  total?: number;
  hasMore: boolean;
  loading?: boolean;
  onLoadMore: () => void;
}

/** Shared "load more" footer (decision 336: continuous loading instead of page numbers). */
export function LoadMoreFooter({ shown, total, hasMore, loading, onLoadMore }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground">
      <span className="tabular-nums">
        {total !== undefined ? `عرض ${shown.toLocaleString('en-US')} من ${total.toLocaleString('en-US')}` : `عرض ${shown.toLocaleString('en-US')}`}
      </span>
      {hasMore && (
        <Button type="button" variant="outline" className="min-h-11" disabled={loading} onClick={onLoadMore}>
          {loading && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
          تحميل المزيد
        </Button>
      )}
    </div>
  );
}
