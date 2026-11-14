import { createFileRoute } from "@tanstack/react-router";
import PaymentsPage from "@/pages/payments/PaymentsPage";

export const Route = createFileRoute("/_app/payments")({
  head: () => ({ meta: [
    { title: 'التحصيل | نظرة' },
    { name: 'description', content: 'متابعة مدفوعات العملاء وسندات التحصيل.' },
    { property: 'og:title', content: 'التحصيل | نظرة' },
    { property: 'og:description', content: 'متابعة مدفوعات العملاء وسندات التحصيل.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: PaymentsPage,
});
