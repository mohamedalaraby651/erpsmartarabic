import { createFileRoute } from "@tanstack/react-router";
import KnowledgeIntegrityPage from "@/pages/admin/knowledge/KnowledgeIntegrityPage";

export const Route = createFileRoute("/_app/admin/knowledge/integrity")({
  head: () => ({
    meta: [
      { title: "سلامة الروابط — المعرفة الهندسية | نظرة" },
      { name: "description", content: "كشف الروابط المكسورة والمعرّفات المكررة والتنبيهات في مستندات المعرفة دون إصلاح تلقائي." },
    ],
  }),
  component: KnowledgeIntegrityPage,
});
