import { createFileRoute } from "@tanstack/react-router";
import KnowledgeDetailPage from "@/pages/admin/knowledge/KnowledgeDetailPage";

export const Route = createFileRoute("/_app/admin/knowledge/doc/$")({
  component: KnowledgeDocRoute,
});

function KnowledgeDocRoute() {
  const { _splat } = Route.useParams();
  return <KnowledgeDetailPage path={decodeURIComponent(_splat ?? "")} />;
}
