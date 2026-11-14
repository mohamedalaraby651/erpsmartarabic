import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/pages/Dashboard";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [
    { title: 'لوحة الإدارة | نظرة' },
    { name: 'description', content: 'لوحة نظرة لمتابعة المبيعات والتحصيل والمخزون والحسابات.' },
    { property: 'og:title', content: 'لوحة الإدارة | نظرة' },
    { property: 'og:description', content: 'متابعة مؤشرات الشركة والعمليات اليومية في نظرة.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Dashboard,
});
