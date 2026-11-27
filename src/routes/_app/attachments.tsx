import { createFileRoute } from "@tanstack/react-router";
import AttachmentsPage from "@/pages/attachments/AttachmentsPage";

export const Route = createFileRoute("/_app/attachments")({
  head: () => ({ meta: [
    { title: "إدارة المرفقات | نظرة" },
    { name: "description", content: "إدارة مستندات الشركة ومعاينة المرفقات وتنزيلها بأمان في نظرة." },
    { property: "og:title", content: "إدارة المرفقات | نظرة" },
    { property: "og:description", content: "مستندات الشركة ومرفقات العملاء والمنتجات والفواتير في نظرة." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AttachmentsPage,
});
