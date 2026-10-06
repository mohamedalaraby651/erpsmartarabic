import { createFileRoute } from "@tanstack/react-router";
import ProductDetailsPage from "@/pages/products/ProductDetailsPage";

export const Route = createFileRoute("/_app/products/$id")({
  component: ProductDetailsPage,
});
