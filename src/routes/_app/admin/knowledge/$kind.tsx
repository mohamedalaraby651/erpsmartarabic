import { createFileRoute } from "@tanstack/react-router";
import KnowledgeListPage from "@/pages/admin/knowledge/KnowledgeListPage";
import { KIND_LABELS, isKnowledgeKind } from "@/domain/knowledge/labels";
import { KnowledgeShell } from "@/components/knowledge/KnowledgeShell";

export const Route = createFileRoute("/_app/admin/knowledge/$kind")({
  head: ({ params }) => ({
    meta: [
      { title: `${isKnowledgeKind(params.kind) ? KIND_LABELS[params.kind] : "قسم غير موجود"} — المعرفة الهندسية | نظرة` },
      { name: "description", content: "قائمة سجلات قسم من أقسام المعرفة الهندسية مع البحث والتصفية حسب الحالة." },
    ],
  }),
  component: KnowledgeListRoute,
});

function KnowledgeListRoute() {
  const { kind } = Route.useParams();
  if (!isKnowledgeKind(kind)) {
    return (
      <KnowledgeShell title="قسم غير موجود">
        <p className="text-sm text-muted-foreground">لا يوجد قسم معرفة بهذا الاسم.</p>
      </KnowledgeShell>
    );
  }
  return <KnowledgeListPage kind={kind} />;
}
