import { createFileRoute } from "@tanstack/react-router";
import LogisticsDocumentDetailsPage from "@/pages/logistics/LogisticsDocumentDetailsPage";

export const Route = createFileRoute("/_app/goods-receipts/$id")({
  component: LogisticsDocumentDetailsPage,
});
