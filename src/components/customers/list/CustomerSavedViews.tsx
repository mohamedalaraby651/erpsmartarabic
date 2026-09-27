/**
 * Customer Saved Views — OPA-CUST-UI-005 v2.0 / B1.
 *
 * View identity: `activeViewId` + the view's stored snapshot + the live state.
 * When the live state no longer matches the snapshot the view is "dirty" and
 * the trigger shows «<name> • معدّل» with save-changes / save-as-new actions.
 *
 * Persists through the existing `user_saved_views` JSON column only. Legacy
 * payloads are adapted by the workspace contract — no migration.
 */
import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Bookmark, Plus, Trash2, Check, Loader2, Pencil, X, Save } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { savedViewsRepository } from "@/application/queries/saved-views";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  WORKSPACE_PRESETS,
  cleanText,
  isSameWorkspaceState,
  normalizeCustomerWorkspaceState,
  toWorkspacePayload,
  type CustomerWorkspaceStateV1,
} from "@/lib/customers/workspaceState";

export interface CustomerSavedView {
  id: string;
  name: string;
  state: CustomerWorkspaceStateV1;
}

interface CustomerSavedViewsProps {
  /** Live, query-relevant workspace state. */
  currentState: CustomerWorkspaceStateV1;
  activeViewId: string | null;
  onApplyView: (state: CustomerWorkspaceStateV1, viewId: string) => void;
  onActiveViewChange: (viewId: string | null) => void;
}

const NAME_MAX = 60;

export function CustomerSavedViews({ currentState, activeViewId, onApplyView, onActiveViewChange }: CustomerSavedViewsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const queryKey = ['customer-saved-views', user?.id];
  const { data: views = [], isLoading, isError } = useQuery({
    queryKey,
    queryFn: async (): Promise<CustomerSavedView[]> => {
      const rows = await savedViewsRepository.list<unknown>('customers');
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        state: { ...normalizeCustomerWorkspaceState(row.filters), activeViewId: row.id },
      }));
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customer-saved-views'] });
  const payloadOf = (s: CustomerWorkspaceStateV1) => {
    const p = toWorkspacePayload(s);
    delete p.activeViewId;
    return p;
  };

  const all = useMemo(
    () => [...WORKSPACE_PRESETS.map((p) => ({ id: p.id as string, name: p.name, state: p.state })), ...views],
    [views],
  );
  const activeView = all.find((v) => v.id === activeViewId) ?? null;
  const isDirty = !!activeView && !isSameWorkspaceState(activeView.state, currentState);
  const isPresetActive = !!activeView && activeView.id.startsWith('preset:');

  const nameError = (name: string, exceptId?: string): string | null => {
    const clean = cleanText(name, NAME_MAX);
    if (!clean) return name.trim().length > NAME_MAX ? `الاسم أطول من ${NAME_MAX} حرفًا` : 'اكتب اسمًا للعرض';
    if (all.some((v) => v.id !== exceptId && v.name.trim() === clean)) return 'يوجد عرض بنفس الاسم';
    return null;
  };

  const createMutation = useMutation({
    meta: { successMessage: 'تم حفظ العرض' },
    mutationFn: async (name: string) => {
      await savedViewsRepository.create({
        userId: user!.id, section: 'customers', name, filters: payloadOf(currentState),
      });
    },
    onSuccess: async () => {
      await invalidate();
      setNewName("");
      setShowSave(false);
    },
  });

  const updateMutation = useMutation({
    meta: { successMessage: 'تم تحديث العرض' },
    mutationFn: (input: { id: string; name?: string; state?: CustomerWorkspaceStateV1 }) =>
      savedViewsRepository.update(input.id, {
        name: input.name,
        filters: input.state ? payloadOf(input.state) : undefined,
      }),
    onSuccess: () => { invalidate(); setRenamingId(null); },
  });

  const deleteMutation = useMutation({
    meta: { successMessage: 'تم حذف العرض' },
    mutationFn: (id: string) => savedViewsRepository.remove(id),
    onSuccess: (_d, id) => {
      invalidate();
      if (id === activeViewId) onActiveViewChange(null);
    },
  });

  const saveError = showSave && newName ? nameError(newName) : null;
  const renameError = renamingId ? nameError(renameValue, renamingId) : null;

  const handleSave = useCallback(() => {
    if (nameError(newName)) return;
    createMutation.mutate(cleanText(newName, NAME_MAX)!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newName, createMutation]);

  const apply = (view: { id: string; state: CustomerWorkspaceStateV1 }) => {
    onApplyView(view.state, view.id);
    setOpen(false);
  };

  const triggerLabel = activeView ? activeView.name : 'العروض';

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setShowSave(false); setRenamingId(null); } }}>
      <PopoverTrigger asChild>
        <Button
          variant={activeView ? 'secondary' : 'outline'}
          size="sm"
          className="h-9 max-w-[220px] gap-1.5 text-xs"
          aria-label={activeView ? `العرض النشط: ${activeView.name}${isDirty ? '، معدّل' : ''}` : 'العروض المحفوظة'}
        >
          <Bookmark className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{triggerLabel}</span>
          {isDirty && <span className="shrink-0 text-muted-foreground">• معدّل</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          {activeView && isDirty && (
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-2">
              <p className="text-xs text-muted-foreground">
                غيّرت البحث أو الفلاتر بعد تطبيق «{activeView.name}».
              </p>
              <div className="flex flex-wrap gap-1.5">
                {!isPresetActive && (
                  <Button
                    size="sm" className="h-8 gap-1 text-xs"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: activeView.id, state: currentState })}
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden /> حفظ التعديل
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowSave(true)}>
                  حفظ كعرض جديد
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => apply(activeView)}>
                  تراجع
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">عروض جاهزة</p>
            <div className="flex flex-wrap gap-1.5">
              {WORKSPACE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => apply({ id: p.id, state: p.state })}
                  aria-pressed={activeViewId === p.id}
                  className={cn(
                    'min-h-8 rounded-full border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    activeViewId === p.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent',
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">عروضي المحفوظة</p>
            {isLoading && (
              <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="جارٍ التحميل" /></div>
            )}
            {isError && <p className="py-2 text-xs text-destructive">تعذّر تحميل العروض المحفوظة.</p>}
            {!isLoading && !isError && views.length === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">لا توجد عروض محفوظة بعد</p>
            )}
            <ul className="max-h-56 space-y-0.5 overflow-y-auto">
              {views.map((view) => (
                <li key={view.id} className="group flex items-center gap-1">
                  {renamingId === view.id ? (
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-8 text-xs"
                          autoFocus
                          aria-label="الاسم الجديد للعرض"
                          aria-invalid={!!renameError}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !renameError) updateMutation.mutate({ id: view.id, name: cleanText(renameValue, NAME_MAX)! });
                            if (e.key === 'Escape') { e.stopPropagation(); setRenamingId(null); }
                          }}
                        />
                        <Button size="icon" className="h-8 w-8 shrink-0" aria-label="حفظ الاسم"
                          disabled={!!renameError || updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ id: view.id, name: cleanText(renameValue, NAME_MAX)! })}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="إلغاء" onClick={() => setRenamingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {renameError && <p className="text-[11px] text-destructive">{renameError}</p>}
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => apply(view)}
                        aria-current={activeViewId === view.id ? 'true' : undefined}
                        className={cn(
                          'min-h-9 flex-1 truncate rounded px-2 text-start text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          activeViewId === view.id && 'font-semibold text-primary',
                        )}
                      >
                        {view.name}
                      </button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 opacity-70 group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label={`إعادة تسمية ${view.name}`}
                        onClick={() => { setRenamingId(view.id); setRenameValue(view.name); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground opacity-70 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label={`حذف ${view.name}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(view.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {showSave ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="اسم العرض"
                  className="h-8 text-xs"
                  autoFocus
                  aria-label="اسم العرض الجديد"
                  aria-invalid={!!saveError}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') { e.stopPropagation(); setShowSave(false); }
                  }}
                />
                <Button size="icon" className="h-8 w-8 shrink-0" aria-label="حفظ العرض" onClick={handleSave}
                  disabled={!!nameError(newName) || createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {saveError && <p className="text-[11px] text-destructive">{saveError}</p>}
              <p className="text-[11px] text-muted-foreground">يحفظ البحث والفلاتر وفلاتر الأعمدة والترتيب الحالية.</p>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="h-8 w-full text-xs" onClick={() => setShowSave(true)}>
              <Plus className="me-1 h-3.5 w-3.5" aria-hidden />
              حفظ الحالة الحالية كعرض
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
