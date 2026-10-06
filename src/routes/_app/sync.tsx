import { createFileRoute } from "@tanstack/react-router";
import SyncStatusPage from "@/pages/sync/SyncStatusPage";

export const Route = createFileRoute("/_app/sync")({
  component: SyncStatusPage,
});
