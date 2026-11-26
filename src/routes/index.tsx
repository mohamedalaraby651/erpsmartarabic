import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/hooks/useAuth";
import LandingPage from "@/pages/landing/LandingPage";
import AppInitSkeleton from "@/components/shared/AppInitSkeleton";
import { decideRedirect } from "@/lib/auth/homeRedirect";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "نظرة | نظام ERP عربي للشركات المصرية" },
    { name: "description", content: "نظرة: إدارة المبيعات والمشتريات والمخزون والحسابات بالجنيه المصري في واجهة عربية واحدة." },
    { property: "og:title", content: "نظرة | نظام ERP عربي للشركات المصرية" },
    { property: "og:description", content: "إدارة المبيعات والمخزون والحسابات بالجنيه المصري في واجهة عربية." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: HomeGate,
});

function HomeGate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const decision = decideRedirect({ loading, signedIn: !!user, path: "/" });

  useEffect(() => {
    if (decision.kind === "redirect") navigate(decision.to, { replace: true });
  }, [decision.kind, decision.kind === "redirect" ? decision.to : "", navigate]);

  if (decision.kind === "landing") return <LandingPage />;
  return <AppInitSkeleton />;
}
