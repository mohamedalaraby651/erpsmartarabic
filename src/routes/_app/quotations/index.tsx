import { createFileRoute } from "@tanstack/react-router";
import QuotationsPage from "@/pages/quotations/QuotationsPage";

export const Route = createFileRoute("/_app/quotations/")({
  head: () => ({ meta: [
    { title: 'عروض الأسعار | نظرة' },
    { name: 'description', content: 'إدارة عروض الأسعار وبنودها وحفظها وطباعتها في نظرة.' },
    { property: 'og:title', content: 'عروض الأسعار | نظرة' },
    { property: 'og:description', content: 'متابعة عروض أسعار العملاء وحفظها ومعاينتها للطباعة.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: QuotationsPage,
});
