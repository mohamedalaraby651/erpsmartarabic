import { createFileRoute } from "@tanstack/react-router";
import CreditNotesPage from "@/pages/credit-notes/CreditNotesPage";

export const Route = createFileRoute("/_app/credit-notes/")({
  component: CreditNotesPage,
});
