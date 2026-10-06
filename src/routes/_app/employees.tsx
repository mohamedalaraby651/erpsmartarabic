import { createFileRoute } from "@tanstack/react-router";
import EmployeesPage from "@/pages/employees/EmployeesPage";

export const Route = createFileRoute("/_app/employees")({
  component: EmployeesPage,
});
