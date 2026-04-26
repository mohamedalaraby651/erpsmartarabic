/**
 * Bulk Invoice PDF Generator
 * 
 * Generates a single PDF containing multiple invoices, one per page.
 * Reuses the same Arabic font pipeline + tenant-scoped data fetching as the
 * single-invoice generator (`generateDocumentPDF`) for visual consistency.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import {
  loadArabicFont,
  ARABIC_FONT_NAME,
  reshapeArabicText,
  toVisualOrder,
  sanitizeBidiText,
  loadImageAsBase64,
  type PdfFontKey,
} from './arabicFont';
import { getCompanySettings } from './pdfGenerator';

interface InvoiceFull {
  id: string;
  invoice_number: string;
  created_at: string;
  total_amount: number;
  subtotal: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  paid_amount: number | null;
  notes: string | null;
  customers: { name: string } | null;
  invoice_items: Array<{
    quantity: number;
    unit_price: number;
    total_price: number;
    products: { name: string } | null;
  }>;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
    : { r: 37, g: 99, b: 235 };
}

function processText(text: string, hasArabic: boolean): string {
  if (!text) return '';
  const clean = sanitizeBidiText(String(text));
  if (!hasArabic) return clean;
  return toVisualOrder(reshapeArabicText(clean));
}

async function setupFont(doc: jsPDF, fontKey: PdfFontKey): Promise<boolean> {
  try {
    const font = await loadArabicFont(fontKey);
    if (!font) return false;
    const vfs = `${ARABIC_FONT_NAME}-Regular.ttf`;
    doc.addFileToVFS(vfs, font);
    doc.addFont(vfs, ARABIC_FONT_NAME, 'normal');
    doc.addFont(vfs, ARABIC_FONT_NAME, 'bold');
    doc.setFont(ARABIC_FONT_NAME);
    return true;
  } catch {
    return false;
  }
}

/**
 * Render one invoice on the current page of the doc.
 * Caller is responsible for `addPage()` between invoices.
 */
function renderInvoice(
  doc: jsPDF,
  inv: InvoiceFull,
  company: Awaited<ReturnType<typeof getCompanySettings>>,
  primary: { r: number; g: number; b: number },
  hasArabic: boolean,
  logoBase64: string | null,
): void {
  const p = (t: string) => processText(t, hasArabic);
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  let y = 15;

  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', pageWidth - margin - 25, y - 5, 25, 25);
    } catch { /* skip */ }
  }

  // Company header
  if (company) {
    const tx = logoBase64 ? pageWidth - margin - 30 : pageWidth - margin;
    doc.setFontSize(18);
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text(p(company.company_name), tx, y, { align: 'right' });
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    if (company.address) { doc.text(p(company.address), tx, y, { align: 'right' }); y += 4; }
    if (company.phone) { doc.text(p('هاتف: ' + company.phone), tx, y, { align: 'right' }); y += 4; }
    if (company.tax_number) { doc.text(p('الرقم الضريبي: ' + company.tax_number), tx, y, { align: 'right' }); y += 4; }
  }

  doc.setDrawColor(primary.r, primary.g, primary.b);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 12;

  doc.setFontSize(15);
  doc.setTextColor(0, 0, 0);
  doc.text(p('فاتورة مبيعات'), pageWidth / 2, y, { align: 'center' });
  y += 9;

  doc.setFontSize(10);
  doc.text(p('رقم: ' + inv.invoice_number), pageWidth - margin, y, { align: 'right' });
  doc.text(p('التاريخ: ' + new Date(inv.created_at).toLocaleDateString('ar-EG')), margin, y, { align: 'left' });
  y += 8;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y - 4, pageWidth - margin * 2, 12, 'F');
  doc.text(p('العميل: ' + (inv.customers?.name || '-')), pageWidth - margin - 5, y + 3, { align: 'right' });
  y += 16;

  // Items
  if (inv.invoice_items && inv.invoice_items.length > 0) {
    const fontName = hasArabic ? ARABIC_FONT_NAME : 'helvetica';
    autoTable(doc, {
      head: [[p('المنتج'), p('الكمية'), p('السعر'), p('الإجمالي')]],
      body: inv.invoice_items.map((it) => [
        p(it.products?.name || '-'),
        String(it.quantity ?? 0),
        p(Number(it.unit_price).toLocaleString() + ' ' + (company?.currency || 'ج.م')),
        p(Number(it.total_price).toLocaleString() + ' ' + (company?.currency || 'ج.م')),
      ]),
      startY: y,
      theme: 'grid',
      styles: { font: fontName, fontSize: 9, cellPadding: 3, halign: 'right' },
      headStyles: { font: fontName, fillColor: [primary.r, primary.g, primary.b], textColor: [255, 255, 255], halign: 'right' },
      bodyStyles: { font: fontName },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Totals
  doc.setFontSize(10);
  const totals: Array<[string, number | null]> = [
    ['المجموع الفرعي', inv.subtotal],
    ['الضريبة', inv.tax_amount],
    ['الخصم', inv.discount_amount],
    ['المدفوع', inv.paid_amount],
  ];
  totals.forEach(([label, val]) => {
    if (val) {
      doc.text(p(label), pageWidth - margin, y, { align: 'right' });
      doc.text(p(Number(val).toLocaleString() + ' ' + (company?.currency || 'ج.م')), margin + 50, y, { align: 'left' });
      y += 6;
    }
  });

  // Grand total
  doc.setFontSize(12);
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text(p('الإجمالي'), pageWidth - margin, y + 2, { align: 'right' });
  doc.text(
    p(Number(inv.total_amount).toLocaleString() + ' ' + (company?.currency || 'ج.م')),
    margin + 50,
    y + 2,
    { align: 'left' },
  );

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    p(`تم إنشاء هذا المستند بواسطة ${company?.company_name || 'النظام'}`),
    pageWidth / 2,
    doc.internal.pageSize.height - 8,
    { align: 'center' },
  );
}

export async function generateBulkInvoicesPDF(invoiceIds: string[]): Promise<void> {
  if (!invoiceIds || invoiceIds.length === 0) {
    throw new Error('يجب تحديد فاتورة واحدة على الأقل');
  }

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, created_at, total_amount, subtotal,
      tax_amount, discount_amount, paid_amount, notes,
      customers ( name ),
      invoice_items (
        quantity, unit_price, total_price,
        products ( name )
      )
    `)
    .in('id', invoiceIds);

  if (error) throw error;
  if (!invoices || invoices.length === 0) {
    throw new Error('لم يتم العثور على فواتير');
  }

  const company = await getCompanySettings();
  const primary = company?.primary_color
    ? hexToRgb(company.primary_color)
    : { r: 37, g: 99, b: 235 };
  const fontKey = (company?.pdf_font as PdfFontKey) || 'amiri';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const hasArabic = await setupFont(doc, fontKey);

  // Pre-load logo once
  let logoBase64: string | null = null;
  if (company?.logo_url) {
    try { logoBase64 = await loadImageAsBase64(company.logo_url); } catch { /* skip */ }
  }

  // Maintain user-selected order
  const sorted = invoiceIds
    .map((id) => invoices.find((i) => i.id === id))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  sorted.forEach((inv, idx) => {
    if (idx > 0) doc.addPage();
    renderInvoice(doc, inv as unknown as InvoiceFull, company, primary, hasArabic, logoBase64);
  });

  const fileName = `فواتير_دفعية_${sorted.length}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
