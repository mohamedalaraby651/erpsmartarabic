import React, { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowRight, ArrowLeft, Edit, Phone, Mail, MessageSquare, FileText, Printer,
  ExternalLink, User, Crown, CreditCard, Target, Percent, TrendingUp,
  Wallet, Clock, Tag, MoreVertical, ShoppingCart, Globe, Receipt,
  UserCheck, UserX, ChevronDown, Download,
} from "lucide-react";
import CustomerAvatar from "@/components/customers/CustomerAvatar";
import CustomerQuickHistory from "@/components/customers/CustomerQuickHistory";
import ImageUpload from "@/components/shared/ImageUpload";
import { vipColors, vipLabels, vipOptions } from "@/lib/customerConstants";
import type { Customer } from "@/lib/customerConstants";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

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
  // Navigation
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  // Embedded stats
  currentBalance?: number;
  balanceIsDebit?: boolean;
  creditLimit?: number;
  creditUsagePercent?: number;
  totalPurchases?: number;
  totalOutstanding?: number;
  paymentRatio?: number;
  invoiceCount?: number;
  dso?: number | null;
  // Quick actions
  onNewPayment?: () => void;
  onNewQuotation?: () => void;
  onNewOrder?: () => void;
  onNewCreditNote?: () => void;
  onToggleActive?: () => void;
  onChangeVip?: (level: string) => void;
}

export const CustomerHeroHeader = memo(function CustomerHeroHeader({
  customer, customerId, invoices, payments,
  onBack, onEdit, onNewInvoice, onStatement, onWhatsApp, onImageUpdate,
  onPrev, onNext, hasPrev, hasNext,
  currentBalance = 0, balanceIsDebit = false, creditLimit = 0, creditUsagePercent = 0,
  totalPurchases = 0, totalOutstanding = 0, paymentRatio = 0, invoiceCount = 0, dso,
  onNewPayment, onNewQuotation, onNewOrder, onNewCreditNote, onToggleActive, onChangeVip,
}: CustomerHeroHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" onClick={onBack} className="hidden md:inline-flex">
          <ArrowRight className="h-4 w-4 ml-2" />العودة للعملاء
        </Button>
        {/* Prev / Next navigation */}
        <div className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="icon" disabled={!hasPrev} onClick={onPrev} className="h-8 w-8">
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled={!hasNext} onClick={onNext} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

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

              {/* Embedded Stats Row */}
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-4 p-3 rounded-lg bg-muted/30 border">
                <StatMini icon={CreditCard} label="الرصيد" value={`${currentBalance.toLocaleString()}`} color={balanceIsDebit ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'} extra={creditLimit > 0 ? <Progress value={creditUsagePercent} className="h-1 mt-1" /> : undefined} />
                <StatMini icon={Target} label="المستحق" value={`${totalOutstanding.toLocaleString()}`} color={totalOutstanding > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'} />
                <StatMini icon={Percent} label="نسبة السداد" value={`${paymentRatio.toFixed(0)}%`} color={paymentRatio >= 80 ? 'text-emerald-600 dark:text-emerald-400' : paymentRatio >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'} />
                <StatMini icon={TrendingUp} label="المشتريات" value={`${totalPurchases.toLocaleString()}`} color="text-primary" />
                <StatMini icon={FileText} label="الفواتير" value={`${invoiceCount}`} color="text-info" />
                <StatMini icon={Clock} label="متوسط السداد" value={dso !== null && dso !== undefined ? `${dso} يوم` : '-'} color="text-muted-foreground" />
              </div>

              <CustomerQuickHistory invoices={invoices} payments={payments} />
            </div>

            {/* Actions Column */}
            <div className="flex flex-wrap gap-2 lg:self-start lg:flex-col">
              <Button size="sm" onClick={onNewInvoice}>
                <FileText className="h-4 w-4 ml-2" />فاتورة جديدة
              </Button>
              <Button variant="outline" size="sm" onClick={onStatement}>
                <Printer className="h-4 w-4 ml-2" />كشف حساب
              </Button>
              {onNewPayment && (
                <Button variant="outline" size="sm" onClick={onNewPayment}>
                  <Wallet className="h-4 w-4 ml-2" />تسجيل دفعة
                </Button>
              )}
              
              {/* More actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4 ml-2" />المزيد
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 ml-2" />تعديل البيانات
                  </DropdownMenuItem>
                  {onNewQuotation && (
                    <DropdownMenuItem onClick={onNewQuotation}>
                      <Globe className="h-4 w-4 ml-2" />عرض سعر جديد
                    </DropdownMenuItem>
                  )}
                  {onNewOrder && (
                    <DropdownMenuItem onClick={onNewOrder}>
                      <ShoppingCart className="h-4 w-4 ml-2" />أمر بيع جديد
                    </DropdownMenuItem>
                  )}
                  {onNewCreditNote && (
                    <DropdownMenuItem onClick={onNewCreditNote}>
                      <Receipt className="h-4 w-4 ml-2" />إشعار دائن
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
});

function StatMini({ icon: Icon, label, value, color, extra }: {
  icon: React.ElementType; label: string; value: string; color: string; extra?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
        <span className="text-[10px] text-muted-foreground truncate">{label}</span>
      </div>
      <p className={`text-sm font-bold leading-tight ${color}`}>{value}</p>
      {extra}
    </div>
  );
}
