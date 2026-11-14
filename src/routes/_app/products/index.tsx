import { createFileRoute } from "@tanstack/react-router";
import ProductsPage from "@/pages/products/ProductsPage";

export const Route = createFileRoute("/_app/products/")({
  head: () => ({ meta: [
    { title: 'الأصناف | نظرة' },
    { name: 'description', content: 'إدارة الأصناف والأسعار وكميات المخزون.' },
    { property: 'og:title', content: 'الأصناف | نظرة' },
    { property: 'og:description', content: 'إدارة الأصناف والأسعار وكميات المخزون.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: ProductsPage,
});
