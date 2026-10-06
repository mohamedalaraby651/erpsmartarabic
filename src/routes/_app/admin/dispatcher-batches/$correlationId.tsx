import { createFileRoute } from "@tanstack/react-router";
import DispatcherBatchDetailPage from "@/pages/admin/DispatcherBatchDetailPage";

export const Route = createFileRoute("/_app/admin/dispatcher-batches/$correlationId")({
  component: DispatcherBatchDetailPage,
});
