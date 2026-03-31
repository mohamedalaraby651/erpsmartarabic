import React, { memo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Crown, ChevronDown, UserCheck, UserX, Tag, Phone, Mail, MessageSquare, ExternalLink, User } from "lucide-react";
import CustomerAvatar from "@/components/customers/CustomerAvatar";
import ImageUpload from "@/components/shared/ImageUpload";
import { vipColors, vipLabels, vipOptions } from "@/lib/customerConstants";
import type { Customer } from "@/lib/customerConstants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CustomerHealthBadge } from "@/components/customers/CustomerHealthBadge";

interface HeroIdentityProps {
  customer: Customer;
  customerId: string;
  onImageUpdate: (url: string | null) => void;
  onWhatsApp: () => void;
  onToggleActive?: () => void;
  onChangeVip?: (level: string) => void;
}

export const HeroIdentity = memo(function HeroIdentity({
  customer, customerId, onImageUpdate, onWhatsApp, onToggleActive, onChangeVip,
}: HeroIdentityProps) {
  return (
    <>
      {/* Avatar */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <CustomerAvatar name={customer.name} imageUrl={customer.image_url} customerType={customer.customer_type} size="xl" shape="rounded-square" vipBorder={customer.vip_level} />
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
          <CustomerHealthBadge customerId={customerId} compact />
          
          {/* Inline VIP dropdown */}
          {onChangeVip ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity", vipColors[customer.vip_level] || vipColors.regular)}>
                  <Crown className="h-3 w-3" />
                  {vipLabels[customer.vip_level] || vipLabels.regular}
                  <ChevronDown className="h-2.5 w-2.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {vipOptions.map(opt => (
                  <DropdownMenuItem key={opt.value} onClick={() => onChangeVip(opt.value)}>
                    <Crown className={cn("h-3 w-3 ml-2", vipColors[opt.value]?.split(' ')[1])} />
                    {opt.label}
                    {customer.vip_level === opt.value && <span className="mr-auto text-primary">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Badge className={vipColors[customer.vip_level] || vipColors.regular}>
              <Crown className="h-3 w-3 ml-1" />
              {vipLabels[customer.vip_level] || vipLabels.regular}
            </Badge>
          )}

          {/* Inline status toggle */}
          {onToggleActive ? (
            <button
              onClick={onToggleActive}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity border",
                customer.is_active
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {customer.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
              {customer.is_active ? "نشط" : "غير نشط"}
            </button>
          ) : (
            <Badge variant={customer.is_active ? "default" : "secondary"}>
              {customer.is_active ? "نشط" : "غير نشط"}
            </Badge>
          )}

          {customer.price_list_id && (
            <Badge variant="outline" className="border-primary/30 text-primary">
              <Tag className="h-3 w-3 ml-1" />قائمة أسعار مخصصة
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mb-1">
          {customer.customer_type === 'company' ? 'شركة' : customer.customer_type === 'farm' ? 'مزرعة' : 'فرد'}
          {customer.governorate && ` • ${customer.governorate}`}
          {customer.city && ` - ${customer.city}`}
        </p>
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          {customer.payment_terms_days != null && Number(customer.payment_terms_days) > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">شروط الدفع: {customer.payment_terms_days} يوم</span>
          )}
          {customer.discount_percentage != null && Number(customer.discount_percentage) > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">خصم: {customer.discount_percentage}%</span>
          )}
          {customer.tax_number && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">ض.ر: {customer.tax_number}</span>
          )}
          {customer.preferred_payment_method && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {customer.preferred_payment_method === 'cash' ? 'نقدي' : customer.preferred_payment_method === 'bank_transfer' ? 'تحويل بنكي' : customer.preferred_payment_method === 'credit' ? 'آجل' : customer.preferred_payment_method}
            </span>
          )}
        </div>

        {/* Contact Buttons */}
        <div className="flex flex-wrap gap-2">
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
      </div>
    </>
  );
});
