import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  ShoppingCart,
  CreditCard,
  Printer,
  Edit,
  Building2,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'] & {
  supplier_type?: string | null;
  category?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  iban?: string | null;
  rating?: number | null;
  website?: string | null;
};

interface SupplierProfileHeaderProps {
  supplier: Supplier;
  onEdit: () => void;
  onCreatePurchaseOrder: () => void;
  onRecordPayment: () => void;
  onPrintStatement: () => void;
  isPrintingStatement?: boolean;
}

const supplierTypeLabels: Record<string, string> = {
  local: 'محلي',
  international: 'دولي',
};

const categoryLabels: Record<string, string> = {
  raw_materials: 'مواد خام',
  spare_parts: 'قطع غيار',
  services: 'خدمات',
  equipment: 'معدات',
  packaging: 'تغليف',
  logistics: 'خدمات لوجستية',
  other: 'أخرى',
};

const SupplierProfileHeader = ({
  supplier,
  onEdit,
  onCreatePurchaseOrder,
  onRecordPayment,
  onPrintStatement,
  isPrintingStatement = false,
}: SupplierProfileHeaderProps) => {
  const initials = supplier.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-background rounded-xl border p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Avatar and Basic Info */}
        <div className="flex items-start gap-4">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            <AvatarImage src={supplier.image_url || ''} alt={supplier.name} />
            <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{supplier.name}</h1>
              {supplier.is_active ? (
                <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle className="h-3 w-3 ml-1" />
                  نشط
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">
                  <XCircle className="h-3 w-3 ml-1" />
                  غير نشط
                </Badge>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {supplier.supplier_type && (
                <Badge variant="outline" className="bg-background">
                  <Building2 className="h-3 w-3 ml-1" />
                  {supplierTypeLabels[supplier.supplier_type] || supplier.supplier_type}
                </Badge>
              )}
              {supplier.category && (
                <Badge variant="secondary">
                  {categoryLabels[supplier.category] || supplier.category}
                </Badge>
              )}
              {supplier.rating && supplier.rating > 0 && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  {'★'.repeat(supplier.rating)}{'☆'.repeat(5 - supplier.rating)}
                </Badge>
              )}
            </div>

            {/* Contact Info */}
            <div className="flex items-center gap-4 mt-3 flex-wrap text-sm text-muted-foreground">
              {supplier.phone && (
                <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Phone className="h-4 w-4" />
                  {supplier.phone}
                </a>
              )}
              {supplier.email && (
                <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Mail className="h-4 w-4" />
                  {supplier.email}
                </a>
              )}
              {supplier.website && (
                <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Globe className="h-4 w-4" />
                  الموقع الإلكتروني
                </a>
              )}
              {supplier.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {supplier.address.slice(0, 30)}...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 lg:mr-auto lg:self-start">
          <Button onClick={onCreatePurchaseOrder} size="sm" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            أمر شراء
          </Button>
          <Button onClick={onRecordPayment} variant="outline" size="sm" className="gap-2">
            <CreditCard className="h-4 w-4" />
            تسجيل دفعة
          </Button>
          <Button onClick={onPrintStatement} variant="outline" size="sm" className="gap-2" disabled={isPrintingStatement}>
            {isPrintingStatement ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            كشف حساب
          </Button>
          <Button onClick={onEdit} variant="ghost" size="sm" className="gap-2">
            <Edit className="h-4 w-4" />
            تعديل
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupplierProfileHeader;
