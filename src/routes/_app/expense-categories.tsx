import { createFileRoute } from "@tanstack/react-router";
import ExpenseCategoriesPage from "@/pages/expenses/ExpenseCategoriesPage";

export const Route = createFileRoute("/_app/expense-categories")({
  component: ExpenseCategoriesPage,
});
