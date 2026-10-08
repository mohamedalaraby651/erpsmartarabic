import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppLayout";

export const Route = createFileRoute("/_app")({
  // Session lives in browser storage, so this subtree renders client-side only
  // (matches the Classic SPA behaviour; avoids SSR auth flashes/redirect loops).
  ssr: false,
  component: AppLayout,
});
