import { createFileRoute } from "@tanstack/react-router";
import DispatcherBatchesPage from "@/pages/admin/DispatcherBatchesPage";

export const Route = createFileRoute("/_app/admin/dispatcher-batches/")({
  component: DispatcherBatchesPage,
});
