import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Edit, Phone, Mail, MessageSquare, FileText, Printer,
  ExternalLink, User, Crown,
} from "lucide-react";
import CustomerAvatar from "@/components/customers/CustomerAvatar";
import CustomerQuickHistory from "@/components/customers/CustomerQuickHistory";
import ImageUpload from "@/components/shared/ImageUpload";
import { vipColors, vipLabels } from "@/lib/customerConstants";
import type { Customer } from "@/lib/customerConstants";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

interface CustomerHeroHeaderProps {
  customer: Customer;
  customerId: string;
  invoices: Invoice[];
  payments: Payment[];
  onBack: () => void;
  onEdit: () => void;
  onNewInvoice: () => void;
  onStatement: () => void;
  onWhatsApp: () => void;
  onImageUpdate: (url: string | null) => void;
}

export const CustomerHeroHeader = memo(function CustomerHeroHeader({
  customer, customerId, invoices, payments,
  onBack, onEdit, onNewInvoice, onStatement, onWhatsApp, onImageUpdate,
}: CustomerHeroHeaderProps) {
  return (
    <>
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowRight className="h-4 w-4 ml-2" />العودة للعملاء
      </Button>

      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <CustomerAvatar name={customer.name} imageUrl={customer.image_url} customerType={customer.customer_type} size="xl" />
                <div className="absolute -bottom-1 -left-1">
                  <ImageUpload
                    currentImageUrl={customer.image_url}
                    onImageUploaded={(url) => onImageUpdate(url)}
                    onImageRemoved={() => onImageUpdate(null)}
                    bucket="customer-images"
                    folder={customerId}
                    showAvatar={false}
                  />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold">{customer.name}</h1>
                <Badge className={vipColors[customer.vip_level] || vipColors.regular}>
                  <Crown className="h-3 w-3 ml-1" />
                  {vipLabels[customer.vip_level] || vipLabels.regular}
                </Badge>
                <Badge variant={customer.is_active ? "default" : "secondary"}>
                  {customer.is_active ? "نشط" : "غير نشط"}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-3">
                {customer.customer_type === 'company' ? 'شركة' : customer.customer_type === 'farm' ? 'مزرعة' : 'فرد'}
                {customer.governorate && ` • ${customer.governorate}`}
                {customer.city && ` - ${customer.city}`}
              </p>

              {/* Contact Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {customer.phone && (
                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <a href={`tel:${customer.phone}`}>
                      <Phone className="h-3.5 w-3.5 ml-1.5 text-emerald-600 dark:text-emerald-400" />{customer.phone}
                    </a>
                  </Button>
                )}
                {customer.phone && (
                  <Button variant="outline" size="sm" className="h-8 text-xs border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950" onClick={onWhatsApp}>
                    <MessageSquare className="h-3.5 w-3.5 ml-1.5 text-emerald-600 dark:text-emerald-400" />واتساب
                  </Button>
                )}
                {customer.email && (
                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <a href={`mailto:${customer.email}`}>
                      <Mail className="h-3.5 w-3.5 ml-1.5 text-info" />{customer.email}
                    </a>
                  </Button>
                )}
                {customer.facebook_url && (
                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <a href={customer.facebook_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 ml-1.5" />فيسبوك
                    </a>
                  </Button>
                )}
                {customer.contact_person && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 bg-muted rounded-md">
                    <User className="h-3.5 w-3.5" />
                    {customer.contact_person}
                    {customer.contact_person_role && ` (${customer.contact_person_role})`}
                  </span>
                )}
              </div>

              <CustomerQuickHistory invoices={invoices} payments={payments} />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 lg:self-start lg:flex-col">
              <Button size="sm" onClick={onNewInvoice}>
                <FileText className="h-4 w-4 ml-2" />فاتورة جديدة
              </Button>
              <Button variant="outline" size="sm" onClick={onStatement}>
                <Printer className="h-4 w-4 ml-2" />كشف حساب
              </Button>
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 ml-2" />تعديل
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
});
