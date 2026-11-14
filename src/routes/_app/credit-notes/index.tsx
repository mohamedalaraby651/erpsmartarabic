import { createFileRoute } from "@tanstack/react-router";
import CreditNotesPage from "@/pages/credit-notes/CreditNotesPage";

export const Route = createFileRoute("/_app/credit-notes/")({
  head: () => ({ meta: [
    { title: 'إشعارات الإرجاع | نظرة' },
    { name: 'description', content: 'إدارة مسودات مرتجعات العملاء وإشعارات الإرجاع ومتابعة كميات الفواتير المتاحة.' },
    { property: 'og:title', content: 'إشعارات الإرجاع | نظرة' },
    { property: 'og:description', content: 'متابعة مرتجعات العملاء وإشعارات الدائن في نظرة.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: CreditNotesPage,
});
