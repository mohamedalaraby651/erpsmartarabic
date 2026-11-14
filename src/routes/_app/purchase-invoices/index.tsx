import { createFileRoute } from "@tanstack/react-router";
import PurchaseInvoicesPage from "@/pages/purchase-invoices/PurchaseInvoicesPage";

export const Route = createFileRoute("/_app/purchase-invoices/")({
  head: () => ({ meta: [
    { title: 'فواتير المشتريات | نظرة' },
    { name: 'description', content: 'متابعة فواتير الموردين والمطابقة والاستحقاقات.' },
    { property: 'og:title', content: 'فواتير المشتريات | نظرة' },
    { property: 'og:description', content: 'متابعة فواتير الموردين والمطابقة والاستحقاقات.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: PurchaseInvoicesPage,
});
