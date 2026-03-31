import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { HeroNavigation } from "./hero/HeroNavigation";
import { HeroIdentity } from "./hero/HeroIdentity";
import { HeroActions } from "./hero/HeroActions";
import { CustomerKPICards } from "./CustomerKPICards";
import CustomerQuickHistory from "./CustomerQuickHistory";
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
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentBalance?: number;
  balanceIsDebit?: boolean;
  creditLimit?: number;
  creditUsagePercent?: number;
  totalPurchases?: number;
  totalOutstanding?: number;
  paymentRatio?: number;
  invoiceCount?: number;
  dso?: number | null;
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
  currentBalance = 0, balanceIsDebit = false,
  totalPurchases = 0, totalOutstanding = 0,
  onNewPayment, onNewQuotation, onNewOrder, onNewCreditNote, onToggleActive, onChangeVip,
}: CustomerHeroHeaderProps) {
  return (
    <>
      <HeroNavigation
        onBack={onBack}
        onPrev={onPrev}
        onNext={onNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />

      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <HeroIdentity
              customer={customer}
              customerId={customerId}
              onImageUpdate={onImageUpdate}
              onWhatsApp={onWhatsApp}
              onToggleActive={onToggleActive}
              onChangeVip={onChangeVip}
            />

            <HeroActions
              customer={customer}
              invoices={invoices}
              payments={payments}
              onEdit={onEdit}
              onNewInvoice={onNewInvoice}
              onStatement={onStatement}
              onNewPayment={onNewPayment}
              onNewQuotation={onNewQuotation}
              onNewOrder={onNewOrder}
              onNewCreditNote={onNewCreditNote}
            />
          </div>

          {/* KPI Cards */}
          <div className="mt-4 mb-4">
            <CustomerKPICards
              currentBalance={currentBalance}
              balanceIsDebit={balanceIsDebit}
              totalOutstanding={totalOutstanding}
              totalPurchases={totalPurchases}
              invoices={invoices}
              payments={payments}
            />
          </div>

          <CustomerQuickHistory invoices={invoices} payments={payments} />
        </CardContent>
      </Card>
    </>
  );
});
