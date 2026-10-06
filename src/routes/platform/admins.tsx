import { createFileRoute } from "@tanstack/react-router";
import PlatformAdminsPage from "@/pages/platform/PlatformAdminsPage";

export const Route = createFileRoute("/platform/admins")({
  component: PlatformAdminsPage,
});
