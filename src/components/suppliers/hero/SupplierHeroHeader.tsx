import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone, Mail, Globe, MapPin, ShoppingCart, CreditCard, Printer,
  Edit, Building2, CheckCircle, XCircle, Loader2, TrendingUp,
  Wallet, Calculator, ChevronLeft, ChevronRight,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

const categoryLabels: Record<string, string> = {
  raw_materials: 'مواد خام', spare_parts: 'قطع غيار', services: 'خدمات',
  equipment: 'معدات', packaging: 'تغليف', logistics: 'خدمات لوجستية', other: 'أخرى',
};

interface SupplierHeroHeaderProps {
  supplier: Supplier;
  onEdit: () => void;
  onCreatePurchaseOrder: () => void;
  onRecordPayment: () => void;
  onPrintStatement: () => void;
  isPrintingStatement?: boolean;
  // KPI data from RPC
  totalPurchases: number;
  totalPayments: number;
  totalOutstanding: number;
  orderCount: number;
  // Navigation
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

const SupplierHeroHeader = ({
  supplier, onEdit, onCreatePurchaseOrder, onRecordPayment,
  onPrintStatement, isPrintingStatement = false,
  totalPurchases, totalPayments, totalOutstanding, orderCount,
  onPrev, onNext, hasPrev, hasNext,
}: SupplierHeroHeaderProps) => {
  const initials = supplier.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const currentBalance = Number(supplier.current_balance || 0);
  const hasHighBalance = currentBalance > 50000;

  const kpis = [
    { label: 'المشتريات', value: `${totalPurchases.toLocaleString()}`, icon: TrendingUp, color: 'text-primary' },
    { label: 'المدفوعات', value: `${totalPayments.toLocaleString()}`, icon: CreditCard, color: 'text-success' },
    { label: 'المستحق', value: `${totalOutstanding.toLocaleString()}`, icon: Wallet, color: totalOutstanding > 0 ? 'text-destructive' : 'text-success' },
    { label: 'الطلبات', value: orderCount.toString(), icon: ShoppingCart, color: 'text-info' },
  ];

  return (
    <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-background rounded-xl border p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Identity */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <Avatar className="h-20 w-20 border-4 border-background shadow-lg shrink-0">
            <AvatarImage src={supplier.image_url || ''} alt={supplier.name} />
            <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground truncate">{supplier.name}</h1>
              <Badge variant={supplier.is_active ? "default" : "secondary"} className={supplier.is_active ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
                {supplier.is_active ? <><CheckCircle className="h-3 w-3 ml-1" />نشط</> : <><XCircle className="h-3 w-3 ml-1" />غير نشط</>}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {(supplier as any).category && <Badge variant="secondary">{categoryLabels[(supplier as any).category] || (supplier as any).category}</Badge>}
              {(supplier as any).rating > 0 && <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">{'★'.repeat((supplier as any).rating)}{'☆'.repeat(5 - (supplier as any).rating)}</Badge>}
            </div>

            <div className="flex items-center gap-4 mt-3 flex-wrap text-sm text-muted-foreground">
              {supplier.contact_person && <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{supplier.contact_person}</span>}
              {supplier.phone && <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors"><Phone className="h-4 w-4" />{supplier.phone}</a>}
              {supplier.email && <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 hover:text-primary transition-colors"><Mail className="h-4 w-4" />{supplier.email}</a>}
              {(supplier as any).website && <a href={(supplier as any).website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors"><Globe className="h-4 w-4" />الموقع</a>}
              {(supplier.governorate || supplier.city) && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[supplier.governorate, supplier.city].filter(Boolean).join(' - ')}</span>}
            </div>
          </div>
        </div>

        {/* Actions + Nav */}
        <div className="flex flex-col gap-3 lg:self-start shrink-0">
          <div className="flex flex-wrap gap-2">
            <Button onClick={onCreatePurchaseOrder} size="sm" className="gap-2"><ShoppingCart className="h-4 w-4" />أمر شراء</Button>
            <Button onClick={onRecordPayment} variant="outline" size="sm" className="gap-2"><CreditCard className="h-4 w-4" />دفعة</Button>
            <Button onClick={onPrintStatement} variant="outline" size="sm" className="gap-2" disabled={isPrintingStatement}>
              {isPrintingStatement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}كشف حساب
            </Button>
            <Button onClick={onEdit} variant="ghost" size="sm" className="gap-2"><Edit className="h-4 w-4" />تعديل</Button>
          </div>
          {(hasPrev || hasNext) && (
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={!hasPrev} onClick={onPrev}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={!hasNext} onClick={onNext}><ChevronLeft className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        {kpis.map((kpi, i) => (
          <Card key={i} className="bg-background/60 backdrop-blur-sm border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/50"><kpi.icon className={`h-4 w-4 ${kpi.color}`} /></div>
              <div>
                <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SupplierHeroHeader;
