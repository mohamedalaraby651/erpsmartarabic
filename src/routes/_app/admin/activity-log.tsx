import { createFileRoute } from "@tanstack/react-router";
import ActivityLogPage from "@/pages/admin/ActivityLogPage";

export const Route = createFileRoute("/_app/admin/activity-log")({
  component: ActivityLogPage,
});
