/**
 * Report Template Repository — CRUD for `report_templates`.
 * Used by the template editor to keep direct supabase.from() calls out of UI.
 */

import { supabase } from "@/integrations/supabase/client";
import { mapRepoError } from "./_base";

export interface ReportTemplateRow {
  id: string;
  name: string;
  type: string;
  template_data: any;
  is_default: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ReportTemplateCreate {
  name: string;
  type: string;
  template_data: any;
  is_default?: boolean;
  created_by?: string | null;
}

export interface ReportTemplateUpdate {
  id: string;
  name: string;
  template_data: any;
  is_default?: boolean;
}

export const reportTemplateRepository = {
  async listByType(type: string): Promise<ReportTemplateRow[]> {
    const { data, error } = await supabase
      .from("report_templates")
      .select("*")
      .eq("type", type)
      .order("created_at", { ascending: false });
    if (error) throw mapRepoError(error, "تعذّر تحميل قوالب التقارير.");
    return (data ?? []) as unknown as ReportTemplateRow[];
  },

  async create(input: ReportTemplateCreate): Promise<void> {
    const { error } = await supabase.from("report_templates").insert([
      {
        name: input.name,
        type: input.type,
        template_data: JSON.parse(JSON.stringify(input.template_data)),
        is_default: input.is_default ?? false,
        created_by: input.created_by ?? null,
      },
    ]);
    if (error) throw mapRepoError(error, "تعذّر إنشاء القالب.");
  },

  async update(input: ReportTemplateUpdate): Promise<void> {
    const { error } = await supabase
      .from("report_templates")
      .update({
        name: input.name,
        template_data: JSON.parse(JSON.stringify(input.template_data)),
        is_default: input.is_default,
      })
      .eq("id", input.id);
    if (error) throw mapRepoError(error, "تعذّر تحديث القالب.");
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("report_templates").delete().eq("id", id);
    if (error) throw mapRepoError(error, "تعذّر حذف القالب.");
  },
};
