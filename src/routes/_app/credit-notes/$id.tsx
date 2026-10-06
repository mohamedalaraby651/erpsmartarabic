import { createFileRoute } from "@tanstack/react-router";
import CreditNoteDetailsPage from "@/pages/credit-notes/CreditNoteDetailsPage";

export const Route = createFileRoute("/_app/credit-notes/$id")({
  component: CreditNoteDetailsPage,
});
