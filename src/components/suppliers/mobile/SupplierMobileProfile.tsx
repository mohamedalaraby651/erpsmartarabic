import { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Phone, MessageSquare, MapPin, MoreHorizontal,
  Edit, Wallet, ShoppingCart, Printer, UserCheck, UserX,
  TrendingUp, CreditCard as CreditCardIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

interface SupplierMobileProfileProps {
  supplier: Supplier;
  onEdit: () => void;
  onCreatePurchaseOrder: () => void;
  onRecordPayment: () => void;
  onPrintStatement: () => void;
  totalPurchases: number;
  totalPayments: number;
  totalOutstanding: number;
  orderCount: number;
}

export const SupplierMobileProfile = memo(function SupplierMobileProfile({
  supplier, onEdit, onCreatePurchaseOrder, onRecordPayment, onPrintStatement,
  totalPurchases, totalPayments, totalOutstanding, orderCount,
}: SupplierMobileProfileProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const initials = supplier.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const isActive = supplier.is_active !== false;

  const kpis = [
    { label: 'المشتريات', value: totalPurchases.toLocaleString(), icon: TrendingUp, color: 'text-primary' },
    { label: 'المدفوعات', value: totalPayments.toLocaleString(), icon: CreditCardIcon, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'المستحق', value: totalOutstanding.toLocaleString(), icon: Wallet, color: totalOutstanding > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400' },
    { label: 'الطلبات', value: orderCount.toString(), icon: ShoppingCart, color: 'text-blue-600 dark:text-blue-400' },
  ];

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-b from-primary/5 via-background to-background overflow-hidden">
      <CardContent className="p-5">
        {/* Avatar centered */}
        <div className="flex flex-col items-center text-center gap-3 mb-4">
          <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
            <AvatarImage src={supplier.image_url || ''} alt={supplier.name} />
            <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{supplier.name}</h1>
            {supplier.contact_person && <p className="text-sm text-muted-foreground">{supplier.contact_person}</p>}
            <Badge variant={isActive ? "default" : "secondary"} className="mt-1 text-[10px]">
              {isActive ? <><UserCheck className="h-2.5 w-2.5 ml-0.5" />نشط</> : <><UserX className="h-2.5 w-2.5 ml-0.5" />غير نشط</>}
            </Badge>
          </div>
          {(supplier.governorate || supplier.city) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />{[supplier.governorate, supplier.city].filter(Boolean).join(' - ')}
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {kpis.map((kpi, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-1.5">
                <kpi.icon className={cn("h-3.5 w-3.5", kpi.color)} />
                <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={cn("text-sm font-bold mt-0.5 tabular-nums", kpi.color)}>{kpi.value} <span className="text-[10px] text-muted-foreground">ج.م</span></p>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="flex gap-2 mb-4">
          {supplier.phone ? (
            <Button variant="outline" size="sm" className="flex-1 min-h-11 text-xs" asChild>
              <a href={`tel:${supplier.phone}`}><Phone className="h-3.5 w-3.5 ml-1 text-emerald-600 dark:text-emerald-400" />اتصال</a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="flex-1 min-h-11 text-xs" onClick={onEdit}>
              <Phone className="h-3.5 w-3.5 ml-1 text-muted-foreground" />إضافة رقم هاتف
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 min-h-11" onClick={onCreatePurchaseOrder}>
            <ShoppingCart className="h-4 w-4 ml-1.5" />أمر شراء
          </Button>
          <Button variant="outline" size="sm" className="flex-1 min-h-11" onClick={onPrintStatement}>
            <Printer className="h-4 w-4 ml-1.5" />كشف حساب
          </Button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="min-h-11 min-w-11 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader><SheetTitle>إجراءات سريعة</SheetTitle></SheetHeader>
              <div className="grid grid-cols-2 gap-3 mt-4 pb-4">
                <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => { setSheetOpen(false); onEdit(); }}>
                  <Edit className="h-5 w-5" /><span className="text-xs">تعديل البيانات</span>
                </Button>
                <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => { setSheetOpen(false); onRecordPayment(); }}>
                  <Wallet className="h-5 w-5" /><span className="text-xs">تسجيل دفعة</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardContent>
    </Card>
  );
});
