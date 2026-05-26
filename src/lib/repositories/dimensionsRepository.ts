/**
 * Dimensions Repository — Phase 4 multi-dimensional analytics.
 *
 * Read/write access for cost centers, projects, and departments.
 * Tenant isolation + accounting permission gating enforced at RLS layer
 * (see 20260526 phase-4 migration).
 */
import { supabase } from "@/integrations/supabase/client";
import { mapRepoError, unwrap } from "./_base";

export interface CostCenterRow {
  id: string;
  tenant_id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  parent_id: string | null;
  is_active: boolean;
}

export interface ProjectRow {
  id: string;
  tenant_id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  is_active: boolean;
}

export interface DepartmentRow {
  id: string;
  tenant_id: string;
  code: string;
  name_ar: string;
  is_active: boolean;
}

export const dimensionsRepository = {
  async listCostCenters(activeOnly = true): Promise<CostCenterRow[]> {
    let q = supabase
      .from("tenant_cost_centers" as never)
      .select("*")
      .order("code");
    if (activeOnly) q = (q as never as { eq: (c: string, v: boolean) => typeof q }).eq("is_active", true);
    const data = await unwrap(q as never, "تعذّر تحميل مراكز التكلفة.");
    return (data ?? []) as CostCenterRow[];
  },

  async listProjects(activeOnly = true): Promise<ProjectRow[]> {
    let q = supabase
      .from("tenant_projects" as never)
      .select("*")
      .order("code");
    if (activeOnly) q = (q as never as { eq: (c: string, v: string) => typeof q }).eq("status", "active");
    const data = await unwrap(q as never, "تعذّر تحميل المشاريع.");
    return (data ?? []) as ProjectRow[];
  },

  async listDepartments(activeOnly = true): Promise<DepartmentRow[]> {
    let q = supabase
      .from("tenant_departments" as never)
      .select("*")
      .order("code");
    if (activeOnly) q = (q as never as { eq: (c: string, v: boolean) => typeof q }).eq("is_active", true);
    const data = await unwrap(q as never, "تعذّر تحميل الأقسام.");
    return (data ?? []) as DepartmentRow[];
  },

  async createCostCenter(input: Partial<CostCenterRow>): Promise<CostCenterRow> {
    const { data, error } = await (supabase.from("tenant_cost_centers" as never) as never as {
      insert: (v: unknown) => { select: () => { single: () => Promise<{ data: unknown; error: unknown }> } };
    })
      .insert(input)
      .select()
      .single();
    if (error) throw mapRepoError(error as Error, "تعذّر إنشاء مركز التكلفة.");
    return data as CostCenterRow;
  },

  async createProject(input: Partial<ProjectRow>): Promise<ProjectRow> {
    const { data, error } = await (supabase.from("tenant_projects" as never) as never as {
      insert: (v: unknown) => { select: () => { single: () => Promise<{ data: unknown; error: unknown }> } };
    })
      .insert(input)
      .select()
      .single();
    if (error) throw mapRepoError(error as Error, "تعذّر إنشاء المشروع.");
    return data as ProjectRow;
  },

  async createDepartment(input: Partial<DepartmentRow>): Promise<DepartmentRow> {
    const { data, error } = await (supabase.from("tenant_departments" as never) as never as {
      insert: (v: unknown) => { select: () => { single: () => Promise<{ data: unknown; error: unknown }> } };
    })
      .insert(input)
      .select()
      .single();
    if (error) throw mapRepoError(error as Error, "تعذّر إنشاء القسم.");
    return data as DepartmentRow;
  },
};

export type DimensionsRepository = typeof dimensionsRepository;
