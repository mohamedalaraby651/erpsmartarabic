import { createFileRoute } from "@tanstack/react-router";
import InvoiceDetailsPage from "@/pages/invoices/InvoiceDetailsPage";

export const Route = createFileRoute("/_app/invoices/$id")({
  component: InvoiceDetailsPage,
});
