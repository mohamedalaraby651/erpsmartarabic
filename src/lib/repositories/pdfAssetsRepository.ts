/**
 * pdfAssetsRepository — CRUD لجدول tenant_pdf_assets.
 * يحفظ سجل metadata بعد رفع الملف الفعلي إلى bucket `pdf-branding`.
 */
import { supabase } from '@/integrations/supabase/client';
import type { AssetKind } from '@/domain/pdf/entities/PdfAsset';
import { mapRepoError } from './_base';

const TABLE = 'tenant_pdf_assets';

export interface PdfAssetRow {
  id: string;
  tenant_id: string;
  kind: AssetKind;
  file_path: string;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  ref_count: number;
  created_at: string;
  updated_at: string;
}

export interface InsertPdfAssetInput {
  tenantId: string;
  kind: AssetKind;
  filePath: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  checksum?: string;
}

export const pdfAssetsRepository = {
  async insert(input: InsertPdfAssetInput): Promise<PdfAssetRow> {
    const payload = {
      tenant_id: input.tenantId,
      kind: input.kind,
      file_path: input.filePath,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      width: input.width ?? null,
      height: input.height ?? null,
      checksum: input.checksum ?? null,
      ref_count: 1,
    };
    const { data, error } = await supabase
      .from(TABLE as never)
      .insert(payload as never)
      .select('*')
      .single();
    if (error) throw mapRepoError(error, 'تعذّر حفظ بيانات الأصل');
    return data as unknown as PdfAssetRow;
  },

  async findById(id: string): Promise<PdfAssetRow | null> {
    const { data, error } = await supabase
      .from(TABLE as never)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw mapRepoError(error, 'تعذّر تحميل الأصل');
    return (data as unknown as PdfAssetRow) ?? null;
  },

  async incrementRef(id: string, delta: number = 1): Promise<void> {
    // Best-effort: read-modify-write. لا حاجة لاتساق صارم — المهم منع 0 منفي.
    const row = await this.findById(id);
    if (!row) return;
    const next = Math.max(0, row.ref_count + delta);
    const { error } = await supabase
      .from(TABLE as never)
      .update({ ref_count: next } as never)
      .eq('id', id);
    if (error) throw mapRepoError(error, 'تعذّر تحديث عدّاد الاستخدام');
  },
};
