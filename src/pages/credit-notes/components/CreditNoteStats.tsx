import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw, FileText } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  total: number;
  totalAmount: number;
  confirmed: number;
}

export function CreditNoteStats({ total, totalAmount, confirmed }: Props) {
  const isMobile = useIsMobile();

  return (
    <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <RotateCcw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-sm text-muted-foreground">إجمالي المرتجعات</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <FileText className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAmount.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {!isMobile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <RotateCcw className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{confirmed}</p>
                <p className="text-sm text-muted-foreground">مؤكدة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
