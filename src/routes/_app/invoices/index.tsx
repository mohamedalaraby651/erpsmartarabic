import { createFileRoute } from "@tanstack/react-router";
import InvoicesPage from "@/pages/invoices/InvoicesPage";

export const Route = createFileRoute("/_app/invoices/")({
  component: InvoicesPage,
});
