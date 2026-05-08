import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { customerRepository } from "@/lib/repositories/customerRepository";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { egyptGovernorates } from "@/lib/egyptLocations";

interface CustomerQuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAdvanced?: () => void;
}

export function CustomerQuickAddDialog({ open, onOpenChange, onOpenAdvanced }: CustomerQuickAddDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerType, setCustomerType] = useState<string>("individual");
  const [governorate, setGovernorate] = useState<string>("");

  const mutation = useMutation({
    mutationFn: async () => {
      return customerRepository.create({
        name: name.trim(),
        phone: phone.trim() || null,
        customer_type: customerType as 'individual' | 'company' | 'farm',
        governorate: governorate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      toast.success(`تم إضافة "${name}" بنجاح`);
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء الإضافة");
    },
  });

  const resetForm = useCallback(() => {
    setName("");
    setPhone("");
    setCustomerType("individual");
    setGovernorate("");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("اسم العميل مطلوب");
      return;
    }
    mutation.mutate();
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>إضافة عميل سريع</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-name">اسم العميل *</Label>
            <Input
              id="quick-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسم العميل"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-phone">الهاتف</Label>
            <Input
              id="quick-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="رقم الهاتف"
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>النوع</Label>
              <Select value={customerType} onValueChange={setCustomerType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">فرد</SelectItem>
                  <SelectItem value="company">شركة</SelectItem>
                  <SelectItem value="farm">مزرعة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المحافظة</Label>
              <Select value={governorate} onValueChange={setGovernorate}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>
                  {egyptGovernorates.map((gov) => (
                    <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ResponsiveDialogFooter className="flex-col sm:flex-row gap-2">
            {onOpenAdvanced && (
              <Button
                type="button"
                variant="link"
                className="text-xs text-muted-foreground"
                onClick={() => { onOpenChange(false); onOpenAdvanced(); }}
              >
                إضافة متقدمة
                <ArrowLeft className="h-3 w-3 mr-1" />
              </Button>
            )}
            <div className="flex gap-2 flex-1 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                إضافة
              </Button>
            </div>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
