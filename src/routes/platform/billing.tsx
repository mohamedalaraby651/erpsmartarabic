import { createFileRoute } from "@tanstack/react-router";
import PlatformBillingPage from "@/pages/platform/PlatformBillingPage";

export const Route = createFileRoute("/platform/billing")({
  component: PlatformBillingPage,
});
