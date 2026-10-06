import { createFileRoute } from "@tanstack/react-router";
import UserManagementPage from "@/pages/admin/UserManagementPage";

export const Route = createFileRoute("/_app/admin/user-management")({
  component: UserManagementPage,
});
