import { createFileRoute } from "@tanstack/react-router";
import AttendancePage from "@/pages/attendance/AttendancePage";

export const Route = createFileRoute("/_app/attendance")({
  component: AttendancePage,
});
