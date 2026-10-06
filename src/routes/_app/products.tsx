import { createFileRoute } from "@tanstack/react-router";
import ProductsPage from "@/pages/products/ProductsPage";

export const Route = createFileRoute("/_app/products")({
  component: ProductsPage,
});
