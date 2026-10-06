import { createFileRoute } from "@tanstack/react-router";
import PurchaseInvoicesPage from "@/pages/purchase-invoices/PurchaseInvoicesPage";

export const Route = createFileRoute("/_app/purchase-invoices")({
  component: PurchaseInvoicesPage,
});
