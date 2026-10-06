import { createFileRoute } from "@tanstack/react-router";
import LogisticsDocumentDetailsPage from "@/pages/logistics/LogisticsDocumentDetailsPage";

export const Route = createFileRoute("/_app/delivery-notes/$id")({
  component: LogisticsDocumentDetailsPage,
});
