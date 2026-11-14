import { createFileRoute } from "@tanstack/react-router";
import SalesOrdersPage from "@/pages/sales-orders/SalesOrdersPage";

export const Route = createFileRoute("/_app/sales-orders/")({
  head: () => ({ meta: [
    { title: 'أوامر البيع | نظرة' },
    { name: 'description', content: 'إدارة أوامر البيع والمنتجات والتسليم.' },
    { property: 'og:title', content: 'أوامر البيع | نظرة' },
    { property: 'og:description', content: 'إدارة أوامر البيع والمنتجات والتسليم.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: SalesOrdersPage,
});
