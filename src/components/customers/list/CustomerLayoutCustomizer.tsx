import { memo } from "react";
import { Eye, RotateCcw, Focus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import type { UseCustomerLayoutPrefs } from "@/hooks/customers/useCustomerLayoutPrefs";
import { tooltips } from "@/lib/uiCopy";

interface Props {
  layout: UseCustomerLayoutPrefs;
  isMobile: boolean;
  /** Optional custom trigger (icon button) — defaults to a small outlined button. */
  trigger?: React.ReactNode;
}

const Row = ({
  label, hint, checked, onChange, disabled,
}: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <label className="flex items-start justify-between gap-3 py-2.5 cursor-pointer select-none">
    <div className="min-w-0">
      <div className="text-sm font-medium leading-tight">{label}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{hint}</div>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} />
  </label>
);

const Body = ({ layout, isMobile }: { layout: UseCustomerLayoutPrefs; isMobile: boolean }) => {
  const { prefs, setMobileSection, setDesktopSection, setCompact, reset } = layout;
  const compact = prefs.compact;

  return (
    <div className="space-y-1">
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        تحكّم في ظهور الأقسام أعلى قائمة العملاء. يُحفظ تفضيلك تلقائيًا ولن يُعاد إظهار ما أخفيته إلا بقرارك.
      </p>

      <div className="rounded-lg border border-border bg-muted/30 p-3 mt-2 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold flex items-center gap-1.5">
              <Focus className="h-3.5 w-3.5" /> وضع التركيز الكامل
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">يُخفي كل شيء فوق القائمة عدا شريط البحث.</div>
          </div>
          <Switch checked={compact} onCheckedChange={setCompact} aria-label="وضع التركيز الكامل" />
        </div>
      </div>

      <Separator className="my-2" />

      <div className={compact ? "opacity-50 pointer-events-none" : ""} aria-disabled={compact}>
        {isMobile ? (
          <>
            <Row
              label="الإحصائيات السريعة" hint="إجمالي العملاء، النشط، المدين…"
              checked={prefs.mobile.stats}
              onChange={(v) => setMobileSection("stats", v)}
            />
            <Row
              label="الفلاتر" hint="نوع العميل، VIP، الحالة، المحافظة…"
              checked={prefs.mobile.filters}
              onChange={(v) => setMobileSection("filters", v)}
            />
            <Row
              label="الملخص الذكي" hint="إجمالي المستحق وفئات سريعة."
              checked={prefs.mobile.summary}
              onChange={(v) => setMobileSection("summary", v)}
            />
            <Row
              label="الترتيب السريع" hint="الأحدث، آخر نشاط، الأعلى مديونية، VIP."
              checked={prefs.mobile.sort}
              onChange={(v) => setMobileSection("sort", v)}
            />
          </>
        ) : (
          <>
            <Row
              label="الإحصائيات" hint="بطاقات الأعداد والمبالغ في الأعلى."
              checked={prefs.desktop.stats}
              onChange={(v) => setDesktopSection("stats", v)}
            />
            <Row
              label="بانر التنبيهات" hint="تنبيهات العملاء (متأخرات، تجاوز سقف…)."
              checked={prefs.desktop.alerts}
              onChange={(v) => setDesktopSection("alerts", v)}
            />
            <Row
              label="شريط الفلاتر" hint="بحث وفلاتر العملاء."
              checked={prefs.desktop.filters}
              onChange={(v) => setDesktopSection("filters", v)}
            />
          </>
        )}
      </div>

      <Separator className="my-2" />

      <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={reset}>
        <RotateCcw className="h-3.5 w-3.5" />
        إعادة الافتراضي (إظهار الكل)
      </Button>
    </div>
  );
};

export const CustomerLayoutCustomizer = memo(function CustomerLayoutCustomizer({
  layout, isMobile, trigger,
}: Props) {
  const triggerEl = trigger ?? (
    <Button variant="outline" size="sm" aria-label="تخصيص العرض">
      <Eye className="h-4 w-4 ml-2" />
      تخصيص العرض
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{triggerEl}</SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader className="text-right">
            <SheetTitle>تخصيص ما يظهر فوق القائمة</SheetTitle>
          </SheetHeader>
          <div className="mt-2">
            <Body layout={layout} isMobile />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{triggerEl}</PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="text-sm font-semibold mb-1">تخصيص ما يظهر فوق القائمة</div>
        <Body layout={layout} isMobile={false} />
      </PopoverContent>
    </Popover>
  );
});
