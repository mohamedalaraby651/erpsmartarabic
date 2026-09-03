/**
 * AuditTimelinePanel — Wave A / Item 3.
 *
 * يعرض تاريخ التغييرات على DocumentRenderProfile بشكل خط زمني عمودي
 * RTL، ويوفر إجراء "استعادة هذه النسخة" لإرجاع الإعدادات.
 *
 * المصدر: `tenant_pdf_profile_audit` (مفلتر تلقائياً بـ RLS عبر tenant_id).
 * التنسيق: { versionFrom, versionTo, changes: [{ path, before, after }] }
 *  — راجع `src/domain/pdf/services/ProfileDiff.ts`.
 */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { History, RotateCcw, User, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { usePdfProfile, PDF_PROFILE_QUERY_KEY } from '@/hooks/usePdfProfile';
import { useTenant } from '@/hooks/useTenant';
import { pdfProfilesRepository } from '@/application/queries/pdf-profiles';
import { labelForPath, type ProfileDiff } from '@/domain/pdf/services/ProfileDiff';
import { nextVersion } from '@/domain/pdf/value-objects/ProfileVersion';
import type { DocumentRenderProfile } from '@/domain/pdf/entities/DocumentRenderProfile';

const AUDIT_QUERY_KEY = 'pdf-profile-audit';
const PAGE_SIZE = 20;

interface AuditRow {
  id: string;
  action: string;
  diff: Partial<ProfileDiff> & Record<string, unknown>;
  performed_by: string | null;
  performed_at: string;
}

function formatArabicDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'medium', timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'مُفعّل' : 'مُعطّل';
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

function actionLabel(action: string): string {
  switch (action) {
    case 'create': return 'إنشاء';
    case 'update': return 'تعديل';
    case 'restore': return 'استعادة';
    case 'delete': return 'حذف';
    default: return action;
  }
}

/** يطبّق قيم `before` من سجل تدقيق على نسخة من البروفايل الحالي. */
function buildRestoredProfile(
  current: DocumentRenderProfile,
  diff: Partial<ProfileDiff>,
): DocumentRenderProfile {
  const clone: DocumentRenderProfile = JSON.parse(JSON.stringify(current));
  const changes = Array.isArray(diff?.changes) ? diff!.changes! : [];
  for (const c of changes) {
    if (!c?.path) continue;
    const parts = c.path.split('.');
    let target: Record<string, unknown> = clone as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (typeof target[k] !== 'object' || target[k] === null) target[k] = {};
      target = target[k] as Record<string, unknown>;
    }
    target[parts[parts.length - 1]] = c.before;
  }
  return clone;
}

export function AuditTimelinePanel() {
  const { tenantId } = useTenant();
  const { profile, save, isSaving } = usePdfProfile('global');
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const enabled = !!tenantId && !!profile.id;
  const query = useQuery({
    queryKey: [AUDIT_QUERY_KEY, tenantId, profile.id, page],
    queryFn: async () => {
      if (!profile.id) return [] as AuditRow[];
      const rows = await pdfProfilesRepository.listAuditLog(
        profile.id,
        PAGE_SIZE * (page + 1),
      );
      return rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) as AuditRow[];
    },
    enabled,
    staleTime: 30_000,
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  const toggle = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const handleRestore = async (row: AuditRow) => {
    if (!profile.id || isSaving) return;
    try {
      setRestoringId(row.id);
      const restored = buildRestoredProfile(profile, row.diff);
      restored.version = nextVersion(profile.version);
      await save(restored);
      qc.invalidateQueries({ queryKey: [AUDIT_QUERY_KEY, tenantId, profile.id] });
      qc.invalidateQueries({ queryKey: [PDF_PROFILE_QUERY_KEY, tenantId] });
      toast.success('تمت استعادة هذه النسخة بنجاح');
    } catch (err) {
      toast.error((err as Error)?.message || 'تعذّر استعادة النسخة');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          سجل تعديلات هوية المستندات
        </CardTitle>
        <CardDescription>
          تتبّع كل تعديل على إعدادات تصيير PDF مع إمكانية استعادة أي نسخة سابقة.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!enabled ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            لا يوجد ملف تصيير محفوظ بعد. احفظ تعديلاً أولاً لظهور السجل هنا.
          </p>
        ) : query.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            لا توجد سجلات تدقيق بعد.
          </p>
        ) : (
          <>
            <ol className="relative border-r-2 border-border pr-6 space-y-5">
              {rows.map((row) => {
                const changes = Array.isArray(row.diff?.changes) ? row.diff.changes! : [];
                const isOpen = !!expanded[row.id];
                const isRestoring = restoringId === row.id;

                return (
                  <li key={row.id} className="relative">
                    {/* dot */}
                    <span className="absolute -right-[34px] top-2 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />

                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{actionLabel(row.action)}</Badge>
                            {typeof row.diff?.versionFrom === 'number' &&
                              typeof row.diff?.versionTo === 'number' && (
                                <Badge variant="secondary" className="font-mono text-xs">
                                  v{row.diff.versionFrom} ← v{row.diff.versionTo}
                                </Badge>
                              )}
                            <span className="text-xs text-muted-foreground">
                              {changes.length} حقل
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span dir="ltr">{formatArabicDate(row.performed_at)}</span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {row.performed_by
                                ? row.performed_by.slice(0, 8)
                                : 'النظام'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {changes.length > 0 && (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => toggle(row.id)}
                              className="gap-1"
                            >
                              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              {isOpen ? 'إخفاء' : 'عرض التفاصيل'}
                            </Button>
                          )}

                          {changes.length > 0 && row.action !== 'create' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline" size="sm" className="gap-1"
                                  disabled={isSaving || isRestoring}
                                >
                                  {isRestoring
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <RotateCcw className="h-4 w-4" />}
                                  استعادة هذه النسخة
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent dir="rtl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>استعادة النسخة السابقة؟</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    سيتم إعادة قيم {changes.length} حقل إلى ما كانت
                                    عليه قبل هذا التعديل. سيُسجَّل ذلك كتعديل جديد
                                    وتُحدَّث المعاينة في جميع التبويبات فوراً.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRestore(row)}>
                                    تأكيد الاستعادة
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>

                      {isOpen && changes.length > 0 && (
                        <div className="mt-3 border-t pt-3 space-y-2">
                          {changes.map((c, idx) => (
                            <div
                              key={`${row.id}-${idx}`}
                              className="flex flex-wrap items-center gap-2 text-sm"
                            >
                              <span className="font-medium text-foreground min-w-[140px]">
                                {labelForPath(c.path)}
                              </span>
                              <Badge
                                variant="outline"
                                className="line-through bg-destructive/10 text-destructive border-destructive/30"
                              >
                                {formatValue(c.before)}
                              </Badge>
                              <span className="text-muted-foreground">←</span>
                              <Badge
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                              >
                                {formatValue(c.after)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline" size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                السابق
              </Button>
              <span className="text-xs text-muted-foreground">
                صفحة {page + 1}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={rows.length < PAGE_SIZE}
                onClick={() => setPage((p) => p + 1)}
              >
                التالي
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AuditTimelinePanel;
