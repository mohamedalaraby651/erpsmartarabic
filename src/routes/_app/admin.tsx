import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";

export const Route = createFileRoute("/_app/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <RoleGuard allow={['admin']}>
      <Outlet />
    </RoleGuard>
  );
}
