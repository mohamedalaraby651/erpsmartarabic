import { createFileRoute } from "@tanstack/react-router";
import JournalEntriesPage from "@/pages/accounting/JournalEntriesPage";

export const Route = createFileRoute("/_app/accounting/journals")({
  component: JournalEntriesPage,
});
