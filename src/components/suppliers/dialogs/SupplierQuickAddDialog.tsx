import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supplierRepository } from "@/lib/repositories/supplierRepository";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { egyptGovernorates } from "@/lib/egyptLocations";

interface SupplierQuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAdvanced?: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'raw_materials', label: 'مواد خام' },
  { value: 'services', label: 'خدمات' },
  { value: 'equipment', label: 'معدات' },
  { value: 'other', label: 'أخرى' },
];

export function SupplierQuickAddDialog({ open, onOpenChange, onOpenAdvanced }: SupplierQuickAddDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<string>("raw_materials");
  const [governorate, setGovernorate] = useState<string>("");

  const mutation = useMutation({
    mutationFn: async () => {
      return supplierRepository.create({
        name: name.trim(),
        phone: phone.trim() || null,
        category: category || null,
        governorate: governorate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
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
    setCategory("raw_materials");
    setGovernorate("");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("اسم المورد مطلوب");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة مورد سريع</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-supplier-name">اسم المورد *</Label>
            <Input
              id="quick-supplier-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسم المورد"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-supplier-phone">الهاتف</Label>
            <Input
              id="quick-supplier-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="رقم الهاتف"
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
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

          <DialogFooter className="flex-col sm:flex-row gap-2">
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
