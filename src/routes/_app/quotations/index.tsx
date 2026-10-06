import { createFileRoute } from "@tanstack/react-router";
import QuotationsPage from "@/pages/quotations/QuotationsPage";

export const Route = createFileRoute("/_app/quotations/")({
  component: QuotationsPage,
});
