import { createFileRoute } from "@tanstack/react-router";
import PlatformDashboard from "@/pages/platform/PlatformDashboard";

export const Route = createFileRoute("/platform/")({
  component: PlatformDashboard,
});
