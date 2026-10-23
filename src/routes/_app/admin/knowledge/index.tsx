import { createFileRoute } from "@tanstack/react-router";
import KnowledgeHomePage from "@/pages/admin/knowledge/KnowledgeHomePage";

export const Route = createFileRoute("/_app/admin/knowledge/")({
  head: () => ({
    meta: [
      { title: "المعرفة الهندسية | نظرة" },
      { name: "description", content: "ملخص القرارات المعمارية والحوكمة والمخاطر والعقود من مستندات المشروع، للقراءة فقط." },
    ],
  }),
  component: KnowledgeHomePage,
});
