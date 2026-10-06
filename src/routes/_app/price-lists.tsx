import { createFileRoute } from "@tanstack/react-router";
import PriceListsPage from "@/pages/pricing/PriceListsPage";

export const Route = createFileRoute("/_app/price-lists")({
  component: PriceListsPage,
});
