import { createFileRoute } from "@tanstack/react-router";
import KnowledgeMatrixPage from "@/pages/admin/knowledge/KnowledgeMatrixPage";

export const Route = createFileRoute("/_app/admin/knowledge/matrix")({
  head: () => ({
    meta: [
      { title: "مصفوفة الحالات — المعرفة الهندسية | نظرة" },
      { name: "description", content: "حالة التنفيذ والتحقق والاعتماد لكل سجل معرفة كما وردت في المصدر." },
    ],
  }),
  component: KnowledgeMatrixPage,
});
