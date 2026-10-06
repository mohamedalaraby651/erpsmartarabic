import { createFileRoute } from "@tanstack/react-router";
import DeliveryNotesPage from "@/pages/delivery-notes/DeliveryNotesPage";

export const Route = createFileRoute("/_app/delivery-notes/")({
  component: DeliveryNotesPage,
});
