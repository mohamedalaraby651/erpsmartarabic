import { createFileRoute } from "@tanstack/react-router";
import SuppliersPage from "@/pages/suppliers/SuppliersPage";

export const Route = createFileRoute("/_app/suppliers/")({
  head: () => ({ meta: [
    { title: 'الموردون | نظرة' },
    { name: 'description', content: 'إدارة الموردين وأرصدتهم ومتابعة المشتريات والسندات.' },
    { property: 'og:title', content: 'الموردون | نظرة' },
    { property: 'og:description', content: 'إدارة الموردين وأرصدتهم ومتابعة المشتريات والسندات.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: SuppliersPage,
});
