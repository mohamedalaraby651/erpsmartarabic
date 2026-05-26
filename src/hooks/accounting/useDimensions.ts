/**
 * useDimensions — React Query hooks for cost centers, projects, departments.
 */
import { useQuery } from "@tanstack/react-query";
import { dimensionsRepository } from "@/lib/repositories/dimensionsRepository";
import { queryPresets } from "@/lib/queryConfig";

export function useCostCenters(activeOnly = true) {
  return useQuery({
    queryKey: ["dimensions", "cost-centers", { activeOnly }],
    queryFn: () => dimensionsRepository.listCostCenters(activeOnly),
    ...queryPresets.reference,
  });
}

export function useProjects(activeOnly = true) {
  return useQuery({
    queryKey: ["dimensions", "projects", { activeOnly }],
    queryFn: () => dimensionsRepository.listProjects(activeOnly),
    ...queryPresets.reference,
  });
}

export function useDepartments(activeOnly = true) {
  return useQuery({
    queryKey: ["dimensions", "departments", { activeOnly }],
    queryFn: () => dimensionsRepository.listDepartments(activeOnly),
    ...queryPresets.reference,
  });
}
