import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, StickyNote, Paperclip, FileText, Image as ImageIcon, Eye, Download, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { customerProfileRepository, type CustomerAttachment } from "@/lib/repositories/customerProfileRepository";
import { getAttachmentSignedUrl } from "@/lib/storage/attachmentUrl";
import { fmtDate } from "./methods";
import { TintedIcon, cardCls } from "./ui";
import { cn } from "@/lib/utils";

const CustomerTabNotes = lazy(() => import("@/components/customers/tabs/CustomerTabNotes").then((m) => ({ default: m.CustomerTabNotes })));
const CustomerTabAttachments = lazy(() => import("@/components/customers/tabs/CustomerTabAttachments").then((m) => ({ default: m.CustomerTabAttachments })));

const isImg = (a: CustomerAttachment) => (a.mime_type ?? a.file_type ?? '').startsWith('image') || /\.(png|jpe?g|webp|gif)$/i.test(a.file_name);
const size = (b: number) => b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

async function openFile(a: CustomerAttachment, download: boolean) {
  const url = await getAttachmentSignedUrl(a.file_url);
  if (!url) { toast.error('تعذر فتح الملف'); return; }
  if (!download) { window.open(url, '_blank', 'noopener'); return; }
  const link = document.createElement('a'); link.href = url; link.download = a.file_name; link.rel = 'noopener'; link.click();
}

function Header({ icon, tone, title, count, addLabel, onAdd, open, onToggle }: { icon: typeof StickyNote; tone: 'warning' | 'primary'; title: string; count: number; addLabel: string; onAdd: () => void; open: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <TintedIcon icon={icon} tone={tone} /><h3 className="text-[15px] font-bold">{title}</h3>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-bold">{count}</span>
      </div>
      <div className="flex items-center gap-3 no-print">
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-0.5 text-xs font-bold text-primary hover:underline"><Plus className="h-3 w-3" />{addLabel}</button>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${open ? 'طي' : 'فتح'} ${title}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function CustomerNotesSection({ customerId, forceOpen }: { customerId: string; forceOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const { data: notes = [] } = useQuery({ queryKey: ['customer-notes', customerId], queryFn: () => customerProfileRepository.listNotes(customerId) });
  const last = [...notes].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const show = open || !!forceOpen;
  return (
    <section className={cn(cardCls, "space-y-2 p-3")}>
      <Header icon={StickyNote} tone="warning" title="الملاحظات" count={notes.length} addLabel="إضافة ملاحظة" onAdd={() => setOpen(true)} open={show} onToggle={() => setOpen((v) => !v)} />
      {show ? <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-muted" />}><CustomerTabNotes customerId={customerId} /></Suspense> : (
        <p className="flex items-center gap-1.5 truncate rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5 shrink-0" />
          {last ? <span className="truncate">آخر ملاحظة: «{last.content}» · {fmtDate(last.created_at)}</span> : 'لا توجد ملاحظات بعد'}
        </p>
      )}
    </section>
  );
}

export function CustomerAttachmentsSection({ customerId, forceOpen }: { customerId: string; forceOpen?: boolean }) {
  const [open, setOpen] = useState(true);
  const [manage, setManage] = useState(false);
  const { data: files = [] } = useQuery({ queryKey: ['attachments', 'customer', customerId], queryFn: () => customerProfileRepository.listAttachments('customer', customerId) });
  const preview = files.find(isImg);
  const [thumb, setThumb] = useState<string>('');
  useEffect(() => { let on = true; setThumb(''); if (preview) getAttachmentSignedUrl(preview.file_url).then((u) => { if (on) setThumb(u); }); return () => { on = false; }; }, [preview?.id, preview?.file_url]);
  const show = open || !!forceOpen;
  const ico = "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted";
  const btn = "h-8 rounded-full border border-border bg-card px-4 text-xs font-bold hover:bg-muted";

  return (
    <section className={cn(cardCls, "space-y-3 p-3")}>
      <Header icon={Paperclip} tone="primary" title="المرفقات" count={files.length} addLabel="رفع مرفق" onAdd={() => { setOpen(true); setManage(true); }} open={show} onToggle={() => setOpen((v) => !v)} />
      {show && (manage ? (
        <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-muted" />}>
          <CustomerTabAttachments customerId={customerId} />
          <button type="button" onClick={() => setManage(false)} className="text-xs font-bold text-primary hover:underline no-print">عرض مختصر</button>
        </Suspense>
      ) : files.length === 0 ? <p className="rounded-lg border border-dashed border-border-strong px-3 py-2 text-xs text-muted-foreground">لا توجد مرفقات</p> : (
        <>
          <div className="grid gap-2 md:grid-cols-2">
            {files.map((a) => {
              const img = isImg(a);
              return (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-[11px] font-bold", img ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                      {img ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}{img ? 'IMG' : 'PDF'}
                    </span>
                    <div className="min-w-0"><div className="truncate text-[13px] font-bold">{a.file_name}</div><div className="text-[11px] text-muted-foreground">{size(a.file_size)} · {fmtDate(a.created_at)}</div></div>
                  </div>
                  <div className="flex shrink-0 gap-1 no-print">
                    <button type="button" className={ico} aria-label={`عرض ${a.file_name}`} onClick={() => openFile(a, false)}><Eye className="h-3.5 w-3.5" /></button>
                    <button type="button" className={ico} aria-label={`تحميل ${a.file_name}`} onClick={() => openFile(a, true)}><Download className="h-3.5 w-3.5" /></button>
                    <button type="button" className={ico} aria-label={`تعديل ${a.file_name}`} onClick={() => setManage(true)}><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" className={ico} aria-label={`حذف ${a.file_name}`} onClick={() => setManage(true)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
          {preview && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card text-xs text-muted-foreground">
                  {thumb ? <img src={thumb} alt={preview.file_name} loading="lazy" className="h-full w-full object-cover" /> : 'معاينة'}
                </div>
                <div className="min-w-0"><div className="truncate text-[13px] font-bold">معاينة سريعة · {preview.file_name}</div><div className="truncate text-[11px] text-muted-foreground">{preview.notes || preview.category || ''} {fmtDate(preview.created_at)}</div></div>
              </div>
              <div className="flex shrink-0 gap-2 no-print">
                <button type="button" className={btn} onClick={() => openFile(preview, false)}>فتح</button>
                <button type="button" className={btn} onClick={() => openFile(preview, true)}>تحميل</button>
              </div>
            </div>
          )}
        </>
      ))}
    </section>
  );
}
