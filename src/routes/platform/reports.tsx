import { createFileRoute } from "@tanstack/react-router";
import PlatformReportsPage from "@/pages/platform/PlatformReportsPage";

export const Route = createFileRoute("/platform/reports")({
  component: PlatformReportsPage,
});
