import { createFileRoute } from "@tanstack/react-router";
import ApprovalsPage from "@/pages/approvals/ApprovalsPage";

export const Route = createFileRoute("/_app/approvals")({
  head: () => ({ meta: [
    { title: 'طلبات الموافقة | نظرة' },
    { name: 'description', content: 'متابعة طلبات الموافقة وفتح الفترات المالية المقفلة في نظرة.' },
    { property: 'og:title', content: 'طلبات الموافقة | نظرة' },
    { property: 'og:description', content: 'متابعة واعتماد طلبات فتح الفترات المالية.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: ApprovalsPage,
});
