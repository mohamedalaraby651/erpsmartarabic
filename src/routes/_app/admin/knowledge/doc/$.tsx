import { createFileRoute } from "@tanstack/react-router";
import KnowledgeDetailPage from "@/pages/admin/knowledge/KnowledgeDetailPage";

export const Route = createFileRoute("/_app/admin/knowledge/doc/$")({
  head: () => ({
    meta: [
      { title: "مستند معرفة | نظرة" },
      { name: "description", content: "عرض مستند من مستندات المشروع مع الإشارات والأدلة المذكورة وتحليل الأثر." },
    ],
  }),
  component: KnowledgeDocRoute,
});

function KnowledgeDocRoute() {
  const { _splat } = Route.useParams();
  return <KnowledgeDetailPage path={decodeURIComponent(_splat ?? "")} />;
}
