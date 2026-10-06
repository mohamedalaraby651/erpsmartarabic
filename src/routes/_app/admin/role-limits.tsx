import { createFileRoute } from "@tanstack/react-router";
import RoleLimitsPage from "@/pages/admin/RoleLimitsPage";

export const Route = createFileRoute("/_app/admin/role-limits")({
  component: RoleLimitsPage,
});
