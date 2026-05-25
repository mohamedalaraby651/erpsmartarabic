/**
 * صفحة صندوق رمل PDF — DEV ONLY (Phase 1).
 *
 * مسار: `/dev/pdf-sandbox` (محمي بفحص `import.meta.env.DEV`).
 * الغرض: اختبار سلوك BiDi والتشكيل والأرقام والعملات قبل دفع تغييرات
 * على المحرّك إلى الإنتاج، مع توليد معاينة فورية في `<iframe>`.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useExportPdf, ExportPdfError } from '@/hooks/useExportPdf';
import { PdfPreflightAlert } from '@/components/print/PdfPreflightAlert';
import type { InvoiceHtmlData } from '@/lib/pdf/templates/InvoiceHtmlTemplate';
import { Loader2 } from 'lucide-react';

interface SandboxCase {
  id: string;
  label: string;
  description: string;
  data: InvoiceHtmlData;
}

const baseCompany = { name: 'شركة المثال للتقنية المحدودة', taxNumber: '300012345600003' };

const CASES: SandboxCase[] = [
  {
    id: 'arabic-tashkeel',
    label: 'عربي مع تشكيل',
    description: 'بِسْمِ اللهِ الرَّحْمنِ الرَّحِيمِ — يجب رفع ارتفاع السطر تلقائياً.',
    data: {
      invoiceNumber: 'INV-2026-001',
      issueDate: '2026-05-25',
      company: baseCompany,
      customer: { name: 'العميلُ الكريمُ المُحْتَرَمُ' },
      items: [
        { description: 'خدمةٌ استشاريّةٌ مُتقدّمةٌ في تقنية المعلومات', quantity: 2, unitPrice: 1500.5 },
      ],
      notes: 'يُرجى السدادُ خلالَ ثلاثينَ يوماً مِنْ تاريخِ الإصدارِ.',
    },
  },
  {
    id: 'mixed-en-ar',
    label: 'مختلط EN/AR',
    description: 'Invoice #INV-2026-002 — فاتورة لشركة ABC International Ltd.',
    data: {
      invoiceNumber: 'INV-2026-002',
      issueDate: '2026-05-25',
      company: baseCompany,
      customer: { name: 'ABC International Ltd. — شركة ABC الدولية المحدودة' },
      items: [
        { description: 'SaaS Subscription — اشتراك سنوي Premium', quantity: 1, unitPrice: 12000 },
        { description: 'Setup & Onboarding — تركيب وتدريب', quantity: 5, unitPrice: 800 },
      ],
    },
  },
  {
    id: 'currency-punct',
    label: 'عملات وترقيم',
    description: '١٬٥٠٠٫٥٠ ر.س — EGP 12,345.67 — -450.00 د.ك',
    data: {
      invoiceNumber: 'INV-2026-003',
      issueDate: '2026-05-25',
      currency: 'SAR',
      company: baseCompany,
      customer: { name: 'مؤسسة الأرقام التجارية' },
      items: [
        { description: 'بند 1٬500٫50 ر.س', quantity: 1, unitPrice: 1500.5 },
        { description: 'EGP 12,345.67 line', quantity: 3, unitPrice: 12345.67 },
        { description: 'قيد دائن -450.00 د.ك', quantity: 1, unitPrice: 450 },
      ],
    },
  },
  {
    id: 'long-names',
    label: 'أسماء طويلة + عناوين',
    description: 'اختبار قص ولفّ النصوص الطويلة جداً في رؤوس الأعمدة والخلايا.',
    data: {
      invoiceNumber: 'INV-2026-004',
      issueDate: '2026-05-25',
      company: {
        ...baseCompany,
        address:
          'المملكة العربية السعودية، الرياض، حي الملك عبدالله، شارع الأمير محمد بن عبدالعزيز، مبنى رقم 1234، الطابق الخامس، مكتب 502 — رمز بريدي 12345',
      },
      customer: {
        name: 'الشركة العربية المتحدة للاستثمارات الصناعية والتجارية والخدمات اللوجستية والاستيراد والتصدير المحدودة',
        address: 'دبي، الإمارات العربية المتحدة، شارع الشيخ زايد، برج الأعمال 88، الطابق 42',
      },
      items: [
        {
          description:
            'توريد وتركيب وصيانة منظومة متكاملة لإدارة المخزون والمبيعات والمشتريات والمحاسبة العامة مع التدريب والدعم الفني',
          quantity: 1,
          unitPrice: 250000,
        },
      ],
    },
  },
  {
    id: 'edge-bidi',
    label: 'حالات حدّية',
    description: 'حروف نازلة (ج/ح/ع)، لام-ألف، URL طويل، علامات BiDi خفية.',
    data: {
      invoiceNumber: 'INV-2026-005',
      issueDate: '2026-05-25',
      company: baseCompany,
      customer: { name: '\u202Bحجاج علاء\u202C' },
      items: [
        { description: 'لا حول ولا قوة إلا بالله — جحجح', quantity: 1, unitPrice: 100 },
        {
          description:
            'See https://example.com/very/long/path/to/some/resource?with=query&and=more — رابط طويل جداً',
          quantity: 1,
          unitPrice: 50,
        },
      ],
    },
  },
];

export default function PdfSandboxPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const mutation = useExportPdf({
    onSuccess: (res) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(res.blob));
    },
  });

  const isDev = useMemo(() => {
    try {
      return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
    } catch {
      return false;
    }
  }, []);

  if (!isDev) {
    return (
      <div dir="rtl" className="p-6">
        <PdfPreflightAlert title="غير متاح" message="هذه الصفحة مخصصة لبيئة التطوير فقط." />
      </div>
    );
  }

  return (
    <div dir="rtl" className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">صندوق رمل PDF — اختبار BiDi والطباعة</h1>
        <p className="text-sm text-muted-foreground">
          اختبارات إجهاد للنصوص العربية والمختلطة قبل دفع أيّ تغيير على المحرّك.
        </p>
      </div>

      {mutation.error instanceof ExportPdfError ? (
        <PdfPreflightAlert
          title={mutation.error.kind === 'preflight' ? 'فشل التحقق المسبق' : 'فشل التوليد'}
          message={mutation.error.message}
          errors={mutation.error.errors}
        />
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          {CASES.map((c) => (
            <Card key={c.id} className={activeCaseId === c.id ? 'border-primary' : undefined}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{c.label}</span>
                  <Badge variant="outline">{c.id}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-loose">{c.description}</p>
                <Button
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => {
                    setActiveCaseId(c.id);
                    mutation.mutate({ data: c.data, options: { output: 'blob' } });
                  }}
                >
                  {mutation.isPending && activeCaseId === c.id ? (
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  ) : null}
                  ولّد PDF واعرض
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="sticky top-4 h-[calc(100vh-2rem)]">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">معاينة فورية</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-2">
              {previewUrl ? (
                <iframe
                  title="PDF preview"
                  src={previewUrl}
                  className="w-full h-full border rounded"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  اختر حالة من اليمين لعرض الـ PDF هنا.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
