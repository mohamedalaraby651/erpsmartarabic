/**
 * Admin hooks — read-side wrappers around adminMetricsRepository.
 */
import { useQuery } from "@tanstack/react-query";
import {
  adminMetricsRepository,
  type AuditTrailFilters,
  type ActivityLogFilters,
} from "@/lib/repositories/adminMetricsRepository";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { queryPresets } from "@/lib/queryConfig";

export function useAuditTrail(filters: AuditTrailFilters = {}) {
  return useQuery({
    queryKey: ["audit-trail", filters],
    queryFn: () => adminMetricsRepository.getAuditTrail(filters),
    ...queryPresets.operational,
  });
}

export function useActivityLog(filters: ActivityLogFilters = {}) {
  return useQuery({
    queryKey: ["activity-logs", filters],
    queryFn: () => adminMetricsRepository.getActivityLog(filters),
    ...queryPresets.realtime,
  });
}

export function useSystemMetrics(enabled = true) {
  return useQuery({
    queryKey: ["system-metrics"],
    queryFn: () => adminMetricsRepository.getSystemMetrics(),
    enabled,
    ...queryPresets.report,
  });
}

export function useAdminDashboardCounters() {
  return useQuery({
    queryKey: ["admin-dashboard-counters"],
    queryFn: () => adminMetricsRepository.getDashboardCounters(),
    ...queryPresets.standard,
  });
}

export function useRolePermissions(roleId?: string) {
  return useQuery({
    queryKey: ["role-permissions", roleId],
    queryFn: () => adminRepository.listRolePermissions(roleId as string),
    enabled: !!roleId,
    ...queryPresets.standard,
  });
}
