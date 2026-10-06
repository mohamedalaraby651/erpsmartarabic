import { createFileRoute } from "@tanstack/react-router";
import EmployeeDetailsPage from "@/pages/employees/EmployeeDetailsPage";

export const Route = createFileRoute("/_app/employees/$id")({
  component: EmployeeDetailsPage,
});
