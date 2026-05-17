import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Edit, FileText, Printer, Wallet, MoreVertical, Globe, ShoppingCart, Receipt, Download,
} from "lucide-react";
import type { Customer } from "@/lib/customerConstants";
import type { Database } from "@/integrations/supabase/types";
import { tooltips } from "@/lib/uiCopy";

type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

interface HeroActionsProps {
  customer: Customer;
  invoices: Invoice[];
  payments: Payment[];
  onEdit: () => void;
  onNewInvoice: () => void;
  onStatement: () => void;
  onNewPayment?: () => void;
  onNewQuotation?: () => void;
  onNewOrder?: () => void;
  onNewCreditNote?: () => void;
}

export const HeroActions = memo(function HeroActions({
  customer, invoices, payments,
  onEdit, onNewInvoice, onStatement,
  onNewPayment, onNewQuotation, onNewOrder, onNewCreditNote,
}: HeroActionsProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap gap-2 lg:self-start lg:flex-col">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" onClick={onNewInvoice} aria-label={tooltips.newInvoice}>
              <FileText className="h-4 w-4 ml-2" />فاتورة جديدة
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{tooltips.newInvoice}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onStatement} aria-label={tooltips.printCustomerStatement}>
              <Printer className="h-4 w-4 ml-2" />كشف حساب
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{tooltips.printCustomerStatement}</TooltipContent>
        </Tooltip>
        {onNewPayment && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onNewPayment} aria-label={tooltips.newPayment}>
                <Wallet className="h-4 w-4 ml-2" />تسجيل دفعة
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{tooltips.newPayment}</TooltipContent>
          </Tooltip>
        )}
        
        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label={tooltips.moreActions}>
              <MoreVertical className="h-4 w-4 ml-2" />المزيد
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onEdit} aria-label={tooltips.editCustomer}>
              <Edit className="h-4 w-4 ml-2" />تعديل البيانات
            </DropdownMenuItem>
            {onNewQuotation && (
              <DropdownMenuItem onClick={onNewQuotation} aria-label={tooltips.newQuotation}>
                <Globe className="h-4 w-4 ml-2" />عرض سعر جديد
              </DropdownMenuItem>
            )}
            {onNewOrder && (
              <DropdownMenuItem onClick={onNewOrder} aria-label={tooltips.newSalesOrder}>
                <ShoppingCart className="h-4 w-4 ml-2" />أمر بيع جديد
              </DropdownMenuItem>
            )}
            {onNewCreditNote && (
              <DropdownMenuItem onClick={onNewCreditNote} aria-label={tooltips.newCreditNote}>
                <Receipt className="h-4 w-4 ml-2" />إشعار دائن
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              import('@/lib/exports/customerExcelExport').then(m => {
                m.exportCustomerToExcel({ customer, invoices, payments, creditNotes: [] });
              });
            }} aria-label={tooltips.exportCustomerExcel}>
              <Download className="h-4 w-4 ml-2" />تصدير Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
});
