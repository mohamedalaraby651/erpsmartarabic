import { createFileRoute } from "@tanstack/react-router";
import UsersPage from "@/pages/admin/UsersPage";

export const Route = createFileRoute("/_app/admin/users")({
  component: UsersPage,
});
