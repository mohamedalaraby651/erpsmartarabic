import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  Building2,
  CreditCard,
  FileText,
  User,
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

interface SupplierInfoTabProps {
  supplier: Supplier;
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

const SupplierInfoTab = ({ supplier }: SupplierInfoTabProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            بيانات الاتصال
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {supplier.contact_person && (
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">جهة الاتصال</p>
                <p className="font-medium">{supplier.contact_person}</p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {supplier.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">الهاتف الأساسي</p>
                  <a href={`tel:${supplier.phone}`} className="font-medium hover:text-primary">
                    {supplier.phone}
                  </a>
                </div>
              </div>
            )}
            
            {supplier.phone2 && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">هاتف إضافي</p>
                  <a href={`tel:${supplier.phone2}`} className="font-medium hover:text-primary">
                    {supplier.phone2}
                  </a>
                </div>
              </div>
            )}
          </div>
          
          {supplier.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                <a href={`mailto:${supplier.email}`} className="font-medium hover:text-primary">
                  {supplier.email}
                </a>
              </div>
            </div>
          )}
          
          {supplier.website && (
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">الموقع الإلكتروني</p>
                <a 
                  href={supplier.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium hover:text-primary"
                >
                  {supplier.website}
                </a>
              </div>
            </div>
          )}
          
          {supplier.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-xs text-muted-foreground">العنوان</p>
                <p className="font-medium">{supplier.address}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            معلومات العمل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {supplier.supplier_type && (
              <div>
                <p className="text-xs text-muted-foreground">نوع المورد</p>
                <Badge variant="outline" className="mt-1">
                  {supplierTypeLabels[supplier.supplier_type] || supplier.supplier_type}
                </Badge>
              </div>
            )}
            
            {supplier.category && (
              <div>
                <p className="text-xs text-muted-foreground">التصنيف</p>
                <Badge variant="secondary" className="mt-1">
                  {categoryLabels[supplier.category] || supplier.category}
                </Badge>
              </div>
            )}
          </div>
          
          {supplier.tax_number && (
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">الرقم الضريبي</p>
                <p className="font-mono font-medium">{supplier.tax_number}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            البيانات البنكية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {supplier.bank_name ? (
            <>
              <div>
                <p className="text-xs text-muted-foreground">اسم البنك</p>
                <p className="font-medium">{supplier.bank_name}</p>
              </div>
              
              {supplier.bank_account && (
                <div>
                  <p className="text-xs text-muted-foreground">رقم الحساب</p>
                  <p className="font-mono font-medium">{supplier.bank_account}</p>
                </div>
              )}
              
              {supplier.iban && (
                <div>
                  <p className="text-xs text-muted-foreground">IBAN</p>
                  <p className="font-mono font-medium text-sm">{supplier.iban}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">لا توجد بيانات بنكية مسجلة</p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            ملاحظات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {supplier.notes ? (
            <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
          ) : (
            <p className="text-muted-foreground text-sm">لا توجد ملاحظات</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierInfoTab;
