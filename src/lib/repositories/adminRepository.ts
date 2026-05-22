/**
 * Admin Repository — typed access for admin-only domain tables.
 * Consolidates Supabase calls previously scattered across admin UI pages.
 *
 * Tables covered:
 *  - sod_rules
 *  - tenants, user_tenants
 *  - role_section_permissions
 *  - approval_chains
 *  - export_templates
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { mapRepoError } from "./_base";

type SodRule = Database["public"]["Tables"]["sod_rules"]["Row"];
type SodRuleInsert = Database["public"]["Tables"]["sod_rules"]["Insert"];
type SodRuleUpdate = Database["public"]["Tables"]["sod_rules"]["Update"];

type Tenant = Database["public"]["Tables"]["tenants"]["Row"];
type TenantInsert = Database["public"]["Tables"]["tenants"]["Insert"];
type TenantUpdate = Database["public"]["Tables"]["tenants"]["Update"];

type RoleSectionPermission =
  Database["public"]["Tables"]["role_section_permissions"]["Row"];

type ApprovalChain = Database["public"]["Tables"]["approval_chains"]["Row"];
type ApprovalChainInsert =
  Database["public"]["Tables"]["approval_chains"]["Insert"];
type ApprovalChainUpdate =
  Database["public"]["Tables"]["approval_chains"]["Update"];

type ExportTemplate = Database["public"]["Tables"]["export_templates"]["Row"];

export const adminRepository = {
  // ---------- SoD Rules ----------
  async listSodRules(): Promise<SodRule[]> {
    const { data, error } = await supabase
      .from("sod_rules")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw mapRepoError(error, "تعذّر تحميل قواعد فصل المهام.");
    return (data ?? []) as SodRule[];
  },

  async createSodRule(payload: SodRuleInsert): Promise<void> {
    const { error } = await supabase.from("sod_rules").insert(payload);
    if (error) throw mapRepoError(error, "تعذّر إنشاء قاعدة فصل المهام.");
  },

  async updateSodRule(id: string, payload: SodRuleUpdate): Promise<void> {
    const { error } = await supabase
      .from("sod_rules")
      .update(payload)
      .eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر تحديث قاعدة فصل المهام.");
  },

  async deleteSodRule(id: string): Promise<void> {
    const { error } = await supabase.from("sod_rules").delete().eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر حذف قاعدة فصل المهام.");
  },

  // ---------- Tenants ----------
  async listTenants(): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw mapRepoError(error, "تعذّر تحميل قائمة الشركات.");
    return (data ?? []) as Tenant[];
  },

  async listUserTenantCounts(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from("user_tenants")
      .select("tenant_id");
    if (error) throw mapRepoError(error, "تعذّر تحميل أعداد المستخدمين.");
    const map: Record<string, number> = {};
    (data ?? []).forEach((row) => {
      map[row.tenant_id] = (map[row.tenant_id] || 0) + 1;
    });
    return map;
  },

  async createTenant(payload: TenantInsert): Promise<void> {
    const { error } = await supabase.from("tenants").insert(payload);
    if (error) throw mapRepoError(error, "تعذّر إنشاء الشركة.");
  },

  async updateTenant(id: string, payload: TenantUpdate): Promise<void> {
    const { error } = await supabase
      .from("tenants")
      .update(payload)
      .eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر تحديث الشركة.");
  },

  // ---------- Role Section Permissions ----------
  async listRolePermissions(
    roleId: string,
  ): Promise<RoleSectionPermission[]> {
    const { data, error } = await supabase
      .from("role_section_permissions")
      .select("*")
      .eq("role_id", roleId);
    if (error) throw mapRepoError(error, "تعذّر نسخ الصلاحيات.");
    return (data ?? []) as RoleSectionPermission[];
  },

  // ---------- Approval Chains ----------
  async createApprovalChain(payload: ApprovalChainInsert): Promise<void> {
    const { error } = await supabase.from("approval_chains").insert(payload);
    if (error) throw mapRepoError(error, "تعذّر إنشاء قاعدة الاعتماد.");
  },

  async updateApprovalChain(
    id: string,
    payload: ApprovalChainUpdate,
  ): Promise<void> {
    const { error } = await supabase
      .from("approval_chains")
      .update(payload)
      .eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر تحديث قاعدة الاعتماد.");
  },

  async deleteApprovalChain(id: string): Promise<void> {
    const { error } = await supabase
      .from("approval_chains")
      .delete()
      .eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر حذف قاعدة الاعتماد.");
  },

  // ---------- Export Templates ----------
  async listAllExportTemplates(): Promise<ExportTemplate[]> {
    const { data, error } = await supabase
      .from("export_templates")
      .select("*")
      .order("section")
      .order("is_default", { ascending: false });
    if (error) throw mapRepoError(error, "تعذّر تحميل قوالب التصدير.");
    return (data ?? []) as ExportTemplate[];
  },

  async deleteExportTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from("export_templates")
      .delete()
      .eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر حذف القالب.");
  },
};

export type {
  SodRule,
  Tenant,
  RoleSectionPermission,
  ApprovalChain,
  ExportTemplate,
};
export type { Json };
