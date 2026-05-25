/**
 * RenderProfileSection — قسم تخصيص تصيير المستندات داخل ExportCenter.
 *
 * المسؤولية:
 *  - تحرير DocumentRenderProfile (Layout + Typography + Branding + Watermark + Footer).
 *  - معاينة فورية على الجانب الأيمن (desktop) أو في تبويب (mobile).
 *  - حفظ في tenant_pdf_profiles عبر usePdfProfile.
 */
import { useState, useEffect } from 'react';
import { Save, RotateCcw, Eye, Sliders } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { usePdfProfile } from '@/hooks/usePdfProfile';
import { LivePreviewPanel } from './LivePreviewPanel';
import { validateProfile, createDefaultProfile } from '@/domain/pdf/entities/DocumentRenderProfile';
import type { DocumentRenderProfile } from '@/domain/pdf/entities/DocumentRenderProfile';
import type { PaperSize, PageOrientation } from '@/domain/pdf/value-objects/PdfLayout';
import type { PdfFontKey } from '@/domain/pdf/value-objects/PdfTypography';

const PAPER_SIZES: PaperSize[] = ['A4', 'A5', 'A3', 'Letter', 'Legal'];
const FONTS: { key: PdfFontKey; label: string }[] = [
  { key: 'cairo', label: 'Cairo' },
  { key: 'tajawal', label: 'Tajawal' },
  { key: 'amiri', label: 'Amiri' },
  { key: 'noto-naskh', label: 'Noto Naskh' },
];

export function RenderProfileSection() {
  const { profile, isLoading, save, isSaving } = usePdfProfile('global');
  const [draft, setDraft] = useState<DocumentRenderProfile>(profile);
  const [dirty, setDirty] = useState(false);

  // Sync draft when remote profile changes (initial load, refetch)
  useEffect(() => {
    if (!isLoading) {
      setDraft(profile);
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, profile.updatedAt, isLoading]);

  const update = (patch: Partial<DocumentRenderProfile>) => {
    setDraft((p) => ({ ...p, ...patch }));
    setDirty(true);
  };

  const validation = validateProfile(draft);

  const handleSave = async () => {
    if (!validation.valid) return;
    await save(draft);
    setDirty(false);
  };

  const handleReset = () => {
    if (!window.confirm('سيتم إعادة إعدادات تصيير المستندات إلى الافتراضي. متابعة؟')) return;
    const def = { ...createDefaultProfile('global'), id: draft.id, tenantId: draft.tenantId };
    setDraft(def);
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6" dir="rtl">
      {/* Editor */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                ملف تصيير المستندات
              </CardTitle>
              <CardDescription>تنسيق موحَّد لكل ملفات PDF المُصدَّرة في النظام.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {dirty && <Badge variant="outline" className="text-amber-700 border-amber-500/40">تغييرات غير محفوظة</Badge>}
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 ml-1" /> افتراضي
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!dirty || isSaving || !validation.valid}>
                <Save className="h-4 w-4 ml-1" /> {isSaving ? 'جارٍ الحفظ…' : 'حفظ'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="layout">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="layout">التخطيط</TabsTrigger>
                <TabsTrigger value="typography">الخطوط</TabsTrigger>
                <TabsTrigger value="branding">الهوية</TabsTrigger>
                <TabsTrigger value="watermark">العلامة المائية</TabsTrigger>
              </TabsList>

              {/* Layout */}
              <TabsContent value="layout" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>حجم الصفحة</Label>
                    <Select
                      value={draft.layout.pageSize}
                      onValueChange={(v) => update({ layout: { ...draft.layout, pageSize: v as PaperSize } })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAPER_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>الاتجاه</Label>
                    <Select
                      value={draft.layout.orientation}
                      onValueChange={(v) => update({ layout: { ...draft.layout, orientation: v as PageOrientation } })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">طولي</SelectItem>
                        <SelectItem value="landscape">عرضي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                    <div key={side}>
                      <Label className="flex justify-between">
                        <span>هامش {side === 'top' ? 'علوي' : side === 'right' ? 'أيمن' : side === 'bottom' ? 'سفلي' : 'أيسر'}</span>
                        <span className="text-xs text-muted-foreground">{draft.layout.margins[side]}mm</span>
                      </Label>
                      <Slider
                        min={0} max={50} step={1}
                        value={[draft.layout.margins[side]]}
                        onValueChange={([v]) => update({ layout: { ...draft.layout, margins: { ...draft.layout.margins, [side]: v } } })}
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Typography */}
              <TabsContent value="typography" className="space-y-4 pt-4">
                <div>
                  <Label>الخط الأساسي</Label>
                  <Select
                    value={draft.typography.fontKey}
                    onValueChange={(v) => update({ typography: { ...draft.typography, fontKey: v as PdfFontKey } })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONTS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="flex justify-between">
                    <span>حجم الخط</span>
                    <span className="text-xs text-muted-foreground">{draft.typography.baseFontSizePx}px</span>
                  </Label>
                  <Slider
                    min={8} max={24} step={1}
                    value={[draft.typography.baseFontSizePx]}
                    onValueChange={([v]) => update({ typography: { ...draft.typography, baseFontSizePx: v } })}
                  />
                </div>
                <div>
                  <Label className="flex justify-between">
                    <span>ارتفاع السطر</span>
                    <span className="text-xs text-muted-foreground">{draft.typography.lineHeight}</span>
                  </Label>
                  <Slider
                    min={1} max={3} step={0.1}
                    value={[draft.typography.lineHeight]}
                    onValueChange={([v]) => update({ typography: { ...draft.typography, lineHeight: v } })}
                  />
                </div>
              </TabsContent>

              {/* Branding */}
              <TabsContent value="branding" className="space-y-4 pt-4">
                <div>
                  <Label>اسم الشركة</Label>
                  <Input
                    value={draft.branding.companyName ?? ''}
                    onChange={(e) => update({ branding: { ...draft.branding, companyName: e.target.value } })}
                    placeholder="اسم الشركة كما يظهر في رأس المستند"
                  />
                </div>
                <div>
                  <Label>الرقم الضريبي</Label>
                  <Input
                    value={draft.branding.taxNumber ?? ''}
                    onChange={(e) => update({ branding: { ...draft.branding, taxNumber: e.target.value } })}
                    placeholder="100000000000003"
                    dir="ltr"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>اللون الأساسي</Label>
                    <Input
                      type="color"
                      value={draft.branding.primaryColor}
                      onChange={(e) => update({ branding: { ...draft.branding, primaryColor: e.target.value } })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div>
                    <Label>اللون الثانوي</Label>
                    <Input
                      type="color"
                      value={draft.branding.secondaryColor}
                      onChange={(e) => update({ branding: { ...draft.branding, secondaryColor: e.target.value } })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div>
                    <Label>لون النص</Label>
                    <Input
                      type="color"
                      value={draft.branding.textColor}
                      onChange={(e) => update({ branding: { ...draft.branding, textColor: e.target.value } })}
                      className="h-10 p-1"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Watermark + Footer */}
              <TabsContent value="watermark" className="space-y-4 pt-4">
                <div className="flex items-center justify-between border rounded p-3">
                  <div>
                    <Label className="text-base">تفعيل العلامة المائية</Label>
                    <p className="text-xs text-muted-foreground">تظهر خلف محتوى الصفحة.</p>
                  </div>
                  <Switch
                    checked={draft.watermark.enabled}
                    onCheckedChange={(c) => update({ watermark: { ...draft.watermark, enabled: c } })}
                  />
                </div>
                {draft.watermark.enabled && (
                  <>
                    <div>
                      <Label>نص العلامة</Label>
                      <Input
                        value={draft.watermark.text ?? ''}
                        onChange={(e) => update({ watermark: { ...draft.watermark, text: e.target.value } })}
                        placeholder="مسودة / سري / DRAFT"
                      />
                    </div>
                    <div>
                      <Label className="flex justify-between">
                        <span>الشفافية</span>
                        <span className="text-xs text-muted-foreground">{Math.round(draft.watermark.opacity * 100)}%</span>
                      </Label>
                      <Slider
                        min={5} max={50} step={5}
                        value={[draft.watermark.opacity * 100]}
                        onValueChange={([v]) => update({ watermark: { ...draft.watermark, opacity: v / 100 } })}
                      />
                    </div>
                    <div>
                      <Label className="flex justify-between">
                        <span>الدوران</span>
                        <span className="text-xs text-muted-foreground">{draft.watermark.rotation}°</span>
                      </Label>
                      <Slider
                        min={-90} max={90} step={5}
                        value={[draft.watermark.rotation]}
                        onValueChange={([v]) => update({ watermark: { ...draft.watermark, rotation: v } })}
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between border rounded p-3 mt-6">
                  <div>
                    <Label className="text-base">تذييل + أرقام صفحات</Label>
                    <p className="text-xs text-muted-foreground">يظهر في أسفل كل صفحة.</p>
                  </div>
                  <Switch
                    checked={draft.footer.enabled}
                    onCheckedChange={(c) => update({ footer: { ...draft.footer, enabled: c } })}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Validation feedback */}
            {validation.errors.length > 0 && (
              <div className="mt-4 p-3 rounded border border-destructive/40 bg-destructive/10 text-sm text-destructive">
                <p className="font-medium mb-1">أخطاء يجب إصلاحها قبل الحفظ:</p>
                <ul className="list-disc pr-5 space-y-0.5">
                  {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className="mt-3 p-3 rounded border border-amber-500/40 bg-amber-500/10 text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">تنبيهات:</p>
                <ul className="list-disc pr-5 space-y-0.5">
                  {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <div className="lg:sticky lg:top-4 self-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-primary" /> معاينة فورية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LivePreviewPanel profile={draft} height={560} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default RenderProfileSection;
