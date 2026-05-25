/**
 * pdfProfilesRepository — طبقة الوصول لجدول tenant_pdf_profiles.
 * يربط بين Domain (DocumentRenderProfile) و قاعدة البيانات.
 *
 * ملاحظة: tenant_id يُحقن من useTenant، وكل الكتابات محمية بـ RLS (admin فقط).
 */
import { supabase } from '@/integrations/supabase/client';
import type { DocumentRenderProfile, ProfileScope } from '@/domain/pdf/entities/DocumentRenderProfile';
import { createDefaultProfile } from '@/domain/pdf/entities/DocumentRenderProfile';
import { mapRepoError } from './_base';

const TABLE = 'tenant_pdf_profiles';

type DbRow = {
  id: string;
  tenant_id: string;
  scope_type: ProfileScope;
  scope_id: string | null;
  version: number;
  is_active: boolean;
  layout: unknown;
  typography: unknown;
  branding: unknown;
  watermark: unknown;
  header: unknown;
  footer: unknown;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

function rowToProfile(row: DbRow): DocumentRenderProfile {
  const def = createDefaultProfile(row.scope_type);
  return {
    id: row.id,
    tenantId: row.tenant_id,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    version: row.version,
    isActive: row.is_active,
    layout: { ...def.layout, ...(row.layout as object) },
    typography: { ...def.typography, ...(row.typography as object) },
    branding: { ...def.branding, ...(row.branding as object) },
    watermark: { ...def.watermark, ...(row.watermark as object) },
    header: { ...def.header, ...(row.header as object) },
    footer: { ...def.footer, ...(row.footer as object) },
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const pdfProfilesRepository = {
  /**
   * يجلب الملف النشط لمؤسسة محددة ضمن نطاق معيّن (افتراضياً global).
   */
  async findActive(
    tenantId: string,
    scopeType: ProfileScope = 'global',
    scopeId: string | null = null,
  ): Promise<DocumentRenderProfile | null> {
    const query = supabase
      .from(TABLE as never)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('scope_type', scopeType)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1);

    const { data, error } = scopeId
      ? await query.eq('scope_id', scopeId)
      : await query.is('scope_id', null);

    if (error) throw mapRepoError(error, 'تعذّر تحميل ملف تصيير المستندات');
    const rows = (data as unknown as DbRow[]) ?? [];
    return rows[0] ? rowToProfile(rows[0]) : null;
  },

  /**
   * Upsert: إذا وُجد ملف فعّال للنطاق، يُحدَّث؛ وإلا يُنشأ.
   * لا ينشئ نسخة جديدة (versioning) — هذا يُترك لخدمة منفصلة لاحقاً.
   */
  async upsert(profile: DocumentRenderProfile): Promise<DocumentRenderProfile> {
    if (!profile.tenantId) throw new Error('tenant_id مطلوب');
    const payload = {
      tenant_id: profile.tenantId,
      scope_type: profile.scopeType,
      scope_id: profile.scopeId ?? null,
      version: profile.version,
      is_active: profile.isActive,
      layout: profile.layout,
      typography: profile.typography,
      branding: profile.branding,
      watermark: profile.watermark,
      header: profile.header,
      footer: profile.footer,
    };

    if (profile.id) {
      const { data, error } = await supabase
        .from(TABLE as never)
        .update(payload as never)
        .eq('id', profile.id)
        .select('*')
        .single();
      if (error) throw mapRepoError(error, 'تعذّر حفظ ملف التصيير');
      return rowToProfile(data as unknown as DbRow);
    }

    const { data, error } = await supabase
      .from(TABLE as never)
      .insert(payload as never)
      .select('*')
      .single();
    if (error) throw mapRepoError(error, 'تعذّر إنشاء ملف التصيير');
    return rowToProfile(data as unknown as DbRow);
  },

  async listAuditLog(profileId: string, limit = 20) {
    const { data, error } = await supabase
      .from('tenant_pdf_profile_audit' as never)
      .select('id, action, diff, performed_by, performed_at')
      .eq('profile_id', profileId)
      .order('performed_at', { ascending: false })
      .limit(limit);
    if (error) throw mapRepoError(error, 'تعذّر تحميل سجل التدقيق');
    return (data as unknown as Array<{
      id: string;
      action: string;
      diff: Record<string, unknown>;
      performed_by: string | null;
      performed_at: string;
    }>) ?? [];
  },
};
