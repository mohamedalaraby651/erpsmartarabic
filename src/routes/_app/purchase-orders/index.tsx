import { createFileRoute } from "@tanstack/react-router";
import PurchaseOrdersPage from "@/pages/purchase-orders/PurchaseOrdersPage";

export const Route = createFileRoute("/_app/purchase-orders/")({
  head: () => ({ meta: [
    { title: 'أوامر الشراء | نظرة' },
    { name: 'description', content: 'متابعة أوامر الشراء والموردين ومواعيد التوريد في نظرة.' },
    { property: 'og:title', content: 'أوامر الشراء | نظرة' },
    { property: 'og:description', content: 'متابعة أوامر الشراء والموردين ومواعيد التوريد في نظرة.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: PurchaseOrdersPage,
});
