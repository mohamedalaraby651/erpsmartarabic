import { memo, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Cloud, Smartphone, ArrowRight, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ConflictData {
  id: string;
  table: string;
  field: string;
  localValue: any;
  serverValue: any;
  localUpdatedAt: string;
  serverUpdatedAt: string;
}

interface ConflictResolution {
  id: string;
  resolution: 'local' | 'server';
}

interface ConflictResolverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictData[];
  onResolve: (resolutions: ConflictResolution[]) => Promise<void>;
  onResolveAll: (resolution: 'local' | 'server') => Promise<void>;
}

const tableLabels: Record<string, string> = {
  customers: 'العملاء',
  products: 'المنتجات',
  invoices: 'الفواتير',
  quotations: 'عروض الأسعار',
  suppliers: 'الموردين',
  sales_orders: 'أوامر البيع',
  purchase_orders: 'أوامر الشراء',
  payments: 'المدفوعات',
  expenses: 'المصروفات',
  tasks: 'المهام',
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

function ConflictResolver({
  open,
  onOpenChange,
  conflicts,
  onResolve,
  onResolveAll,
}: ConflictResolverProps) {
  const [resolutions, setResolutions] = useState<Record<string, 'local' | 'server'>>({});
  const [isResolving, setIsResolving] = useState(false);

  // تحديد الحل لتعارض معين
  const setResolution = useCallback((id: string, resolution: 'local' | 'server') => {
    setResolutions(prev => ({ ...prev, [id]: resolution }));
  }, []);

  // حل جميع التعارضات بنفس الخيار
  const handleResolveAll = async (resolution: 'local' | 'server') => {
    setIsResolving(true);
    try {
      await onResolveAll(resolution);
      onOpenChange(false);
    } finally {
      setIsResolving(false);
    }
  };

  // حل التعارضات المحددة
  const handleResolve = async () => {
    // التحقق من أن جميع التعارضات لها حل
    const allResolved = conflicts.every(c => resolutions[c.id]);
    if (!allResolved) return;

    setIsResolving(true);
    try {
      const resolutionList: ConflictResolution[] = conflicts.map(c => ({
        id: c.id,
        resolution: resolutions[c.id],
      }));
      await onResolve(resolutionList);
      onOpenChange(false);
    } finally {
      setIsResolving(false);
    }
  };

  const allResolved = conflicts.every(c => resolutions[c.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            تعارض في البيانات
          </DialogTitle>
          <DialogDescription>
            تم اكتشاف {conflicts.length} تعارض بين البيانات المحلية والخادم. يرجى اختيار البيانات التي تريد الاحتفاظ بها.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {conflicts.map((conflict, index) => (
              <Card key={conflict.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline">
                      {tableLabels[conflict.table] || conflict.table}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      الحقل: {conflict.field}
                    </span>
                  </div>

                  <RadioGroup
                    value={resolutions[conflict.id]}
                    onValueChange={(value) => setResolution(conflict.id, value as 'local' | 'server')}
                    className="space-y-3"
                  >
                    {/* خيار البيانات المحلية */}
                    <Label
                      htmlFor={`local-${conflict.id}`}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        resolutions[conflict.id] === 'local'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <RadioGroupItem value="local" id={`local-${conflict.id}`} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Smartphone className="h-4 w-4 text-info" />
                          <span className="font-medium text-sm">البيانات المحلية</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(conflict.localUpdatedAt), 'dd MMM، HH:mm', { locale: ar })}
                          </span>
                        </div>
                        <div className="text-sm bg-muted p-2 rounded font-mono overflow-auto max-h-20">
                          {formatValue(conflict.localValue)}
                        </div>
                      </div>
                    </Label>

                    {/* خيار بيانات الخادم */}
                    <Label
                      htmlFor={`server-${conflict.id}`}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        resolutions[conflict.id] === 'server'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <RadioGroupItem value="server" id={`server-${conflict.id}`} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Cloud className="h-4 w-4 text-success" />
                          <span className="font-medium text-sm">بيانات الخادم</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(conflict.serverUpdatedAt), 'dd MMM، HH:mm', { locale: ar })}
                          </span>
                        </div>
                        <div className="text-sm bg-muted p-2 rounded font-mono overflow-auto max-h-20">
                          {formatValue(conflict.serverValue)}
                        </div>
                      </div>
                    </Label>
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          <div className="flex gap-2 flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolveAll('local')}
              disabled={isResolving}
              className="gap-1"
            >
              <Smartphone className="h-3.5 w-3.5" />
              استخدام المحلي للكل
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolveAll('server')}
              disabled={isResolving}
              className="gap-1"
            >
              <Cloud className="h-3.5 w-3.5" />
              استخدام الخادم للكل
            </Button>
          </div>
          
          <Button
            onClick={handleResolve}
            disabled={!allResolved || isResolving}
            className="gap-2"
          >
            {isResolving ? (
              'جاري الحل...'
            ) : (
              <>
                <Check className="h-4 w-4" />
                تأكيد الاختيارات
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default memo(ConflictResolver);
