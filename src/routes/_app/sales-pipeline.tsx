import { createFileRoute } from "@tanstack/react-router";
import SalesPipelinePage from "@/pages/quotes/SalesPipelinePage";

export const Route = createFileRoute("/_app/sales-pipeline")({
  component: SalesPipelinePage,
});
