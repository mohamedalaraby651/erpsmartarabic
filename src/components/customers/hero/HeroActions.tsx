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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => {
            import('@/lib/exports/customerExcelExport').then(m => {
              m.exportCustomerToExcel({ customer, invoices, payments, creditNotes: [] });
            });
          }}>
            <Download className="h-4 w-4 ml-2" />تصدير Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
