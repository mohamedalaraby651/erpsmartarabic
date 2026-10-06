import { createFileRoute } from "@tanstack/react-router";
import PurchaseInvoiceApprovalsPage from "@/pages/purchase-invoices/PurchaseInvoiceApprovalsPage";

export const Route = createFileRoute("/_app/purchase-invoices/approvals")({
  component: PurchaseInvoiceApprovalsPage,
});
