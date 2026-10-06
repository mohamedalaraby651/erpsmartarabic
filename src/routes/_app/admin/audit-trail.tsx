import { createFileRoute } from "@tanstack/react-router";
import AuditTrailPage from "@/pages/admin/AuditTrailPage";

export const Route = createFileRoute("/_app/admin/audit-trail")({
  component: AuditTrailPage,
});
