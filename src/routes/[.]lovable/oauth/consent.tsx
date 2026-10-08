import { createFileRoute } from "@tanstack/react-router";
import OAuthConsent from "@/pages/OAuthConsent";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Session lives in browser storage, so this subtree renders client-side only
  // (matches the Classic SPA behaviour; avoids SSR auth flashes/redirect loops).
  ssr: false,
  component: OAuthConsent,
});
