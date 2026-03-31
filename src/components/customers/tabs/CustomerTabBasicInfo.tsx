import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageSquare, ExternalLink, User, MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Customer, CustomerAddress } from "@/lib/customerConstants";

interface CustomerTabBasicInfoProps {
  customer: Customer;
  addresses: CustomerAddress[];
  recentCommunications?: Array<{ id: string; type: string; note: string; communication_date: string }>;
  onAddAddress: () => void;
  onEditAddress: (address: CustomerAddress) => void;
  onDeleteAddress: (id: string) => void;
  onWhatsApp: () => void;
}

const commTypeLabels: Record<string, string> = {
  call: 'اتصال',
  visit: 'زيارة',
  whatsapp: 'واتساب',
  email: 'بريد',
  sms: 'رسالة',
  other: 'أخرى',
};

export const CustomerTabBasicInfo = memo(function CustomerTabBasicInfo({
  customer, addresses, recentCommunications = [], onAddAddress, onEditAddress, onDeleteAddress, onWhatsApp,
}: CustomerTabBasicInfoProps) {
  return (
    <div className="space-y-4">
      {/* Quick Contact Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">بطاقة التواصل</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customer.phone && (
              <Button variant="outline" className="justify-start h-auto py-3" asChild>
                <a href={`tel:${customer.phone}`}>
                  <Phone className="h-4 w-4 ml-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">الهاتف الأساسي</p>
                    <p className="font-medium text-sm">{customer.phone}</p>
                  </div>
                </a>
              </Button>
            )}
            {customer.phone2 && (
              <Button variant="outline" className="justify-start h-auto py-3" asChild>
                <a href={`tel:${customer.phone2}`}>
                  <Phone className="h-4 w-4 ml-3 text-muted-foreground shrink-0" />
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">هاتف ثاني</p>
                    <p className="font-medium text-sm">{customer.phone2}</p>
                  </div>
                </a>
              </Button>
            )}
            {customer.phone && (
              <Button variant="outline" className="justify-start h-auto py-3 border-emerald-200 dark:border-emerald-800" onClick={onWhatsApp}>
                <MessageSquare className="h-4 w-4 ml-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">واتساب</p>
                  <p className="font-medium text-sm">إرسال رسالة</p>
                </div>
              </Button>
            )}
            {customer.email && (
              <Button variant="outline" className="justify-start h-auto py-3" asChild>
                <a href={`mailto:${customer.email}`}>
                  <Mail className="h-4 w-4 ml-3 text-info shrink-0" />
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                    <p className="font-medium text-sm truncate">{customer.email}</p>
                  </div>
                </a>
              </Button>
            )}
            {customer.facebook_url && (
              <Button variant="outline" className="justify-start h-auto py-3" asChild>
                <a href={customer.facebook_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 ml-3 shrink-0" />
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">فيسبوك</p>
                    <p className="font-medium text-sm">زيارة الصفحة</p>
                  </div>
                </a>
              </Button>
            )}
            {customer.contact_person && (
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">شخص التواصل</p>
                  <p className="font-medium text-sm">
                    {customer.contact_person}
                    {customer.contact_person_role && <span className="text-muted-foreground"> ({customer.contact_person_role})</span>}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Communications */}
      {recentCommunications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">آخر التواصلات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCommunications.slice(0, 5).map((comm) => (
                <div key={comm.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className="text-[10px]">
                        {commTypeLabels[comm.type] || comm.type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(comm.communication_date).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{comm.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Addresses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">العناوين</CardTitle>
          <Button size="sm" variant="outline" onClick={onAddAddress}>
            <Plus className="h-4 w-4 ml-1" />إضافة عنوان
          </Button>
        </CardHeader>
        <CardContent>
          {addresses.length === 0 ? (
            <div className="text-center py-6">
              <MapPin className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">لا توجد عناوين مسجلة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div key={addr.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{addr.label}</Badge>
                      {addr.is_default && (
                        <Badge className="bg-primary/10 text-primary text-[10px]">
                          <Star className="h-2.5 w-2.5 ml-0.5" />افتراضي
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditAddress(addr)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeleteAddress(addr.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm">{addr.address}</p>
                  {(addr.governorate || addr.city) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {addr.governorate}{addr.city && ` - ${addr.city}`}
                    </p>
                  )}
                  {addr.notes && <p className="text-xs text-muted-foreground mt-1 italic">{addr.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
