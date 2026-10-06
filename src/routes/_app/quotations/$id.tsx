import { createFileRoute } from "@tanstack/react-router";
import QuotationDetailsPage from "@/pages/quotations/QuotationDetailsPage";

export const Route = createFileRoute("/_app/quotations/$id")({
  component: QuotationDetailsPage,
});
