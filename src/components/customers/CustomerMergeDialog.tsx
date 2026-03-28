import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Search, Merge, Loader2 } from "lucide-react";
import { toast } from "sonner";
import CustomerAvatar from "@/components/customers/CustomerAvatar";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CustomerMergeDialog = ({ open, onOpenChange }: CustomerMergeDialogProps) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [step, setStep] = useState<'search' | 'confirm'>('search');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['merge-customers-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .order('name')
        .limit(20);
      if (error) throw error;
      return data as Customer[];
    },
    enabled: searchQuery.length >= 2,
  });

  const primaryCustomer = useMemo(() => customers.find(c => c.id === primaryId), [customers, primaryId]);
  const duplicateCustomer = useMemo(() => customers.find(c => c.id === duplicateId), [customers, duplicateId]);

  const mergeMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/merge-customers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ primaryId, duplicateId }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Merge failed');
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-count'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      toast.success(data.message);
      handleClose();
    },
    onError: (error) => {
      logErrorSafely('CustomerMergeDialog', error);
      toast.error('فشل الدمج، يرجى المحاولة لاحقاً');
    },
  });

  const handleClose = () => {
    setPrimaryId(null);
    setDuplicateId(null);
    setStep('search');
    setSearchQuery('');
    onOpenChange(false);
  };

  const handleSelectCustomer = (id: string) => {
    if (!primaryId) {
      setPrimaryId(id);
    } else if (id !== primaryId) {
      setDuplicateId(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(o); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            دمج العملاء المكررين
          </DialogTitle>
          <DialogDescription>
            {step === 'search'
              ? 'ابحث واختر العميل الأساسي ثم العميل المكرر'
              : 'تأكد من اختيارك قبل الدمج'}
          </DialogDescription>
        </DialogHeader>

        {step === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم أو الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>

            {primaryId && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                <Badge>الأساسي</Badge>
                <span className="text-sm font-medium">{primaryCustomer?.name}</span>
                <Button variant="ghost" size="sm" className="mr-auto h-6 text-xs" onClick={() => { setPrimaryId(null); setDuplicateId(null); }}>
                  تغيير
                </Button>
              </div>
            )}

            {duplicateId && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/5 border border-destructive/20">
                <Badge variant="destructive">مكرر</Badge>
                <span className="text-sm font-medium">{duplicateCustomer?.name}</span>
                <Button variant="ghost" size="sm" className="mr-auto h-6 text-xs" onClick={() => setDuplicateId(null)}>
                  تغيير
                </Button>
              </div>
            )}

            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {isLoading && <p className="text-center text-sm text-muted-foreground py-4">جاري البحث...</p>}
                {customers.filter(c => c.id !== primaryId && c.id !== duplicateId).map((customer) => (
                  <Card
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelectCustomer(customer.id)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <CustomerAvatar name={customer.name} imageUrl={customer.image_url} customerType={customer.customer_type} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.phone || 'بدون هاتف'}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{Number(customer.current_balance || 0).toLocaleString()} ج.م</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === 'confirm' && primaryCustomer && duplicateCustomer && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-warning/50 bg-warning/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">تحذير: هذا الإجراء لا يمكن التراجع عنه</p>
                  <p className="text-muted-foreground mt-1">
                    سيتم نقل جميع الفواتير والمدفوعات والعناوين من "{duplicateCustomer.name}" إلى "{primaryCustomer.name}" وحذف السجل المكرر.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="border-primary/30">
                <CardContent className="p-4 text-center">
                  <Badge className="mb-2">سيبقى</Badge>
                  <CustomerAvatar name={primaryCustomer.name} imageUrl={primaryCustomer.image_url} customerType={primaryCustomer.customer_type} size="md" className="mx-auto mb-2" />
                  <p className="font-medium text-sm">{primaryCustomer.name}</p>
                  <p className="text-xs text-muted-foreground">{primaryCustomer.phone}</p>
                </CardContent>
              </Card>
              <Card className="border-destructive/30">
                <CardContent className="p-4 text-center">
                  <Badge variant="destructive" className="mb-2">سيُحذف</Badge>
                  <CustomerAvatar name={duplicateCustomer.name} imageUrl={duplicateCustomer.image_url} customerType={duplicateCustomer.customer_type} size="md" className="mx-auto mb-2" />
                  <p className="font-medium text-sm">{duplicateCustomer.name}</p>
                  <p className="text-xs text-muted-foreground">{duplicateCustomer.phone}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>إلغاء</Button>
          {step === 'search' ? (
            <Button
              onClick={() => setStep('confirm')}
              disabled={!primaryId || !duplicateId}
            >
              متابعة
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => mergeMutation.mutate()}
              disabled={mergeMutation.isPending}
            >
              {mergeMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin ml-2" /> جاري الدمج...</> : 'تأكيد الدمج'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerMergeDialog;
