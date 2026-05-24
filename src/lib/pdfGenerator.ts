import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { loadArabicFont, ARABIC_FONT_NAME, reshapeArabicText, toVisualOrder, sanitizeBidiText, loadImageAsBase64 } from './arabicFont';
import type { PdfFontKey } from './arabicFont';

interface CompanySettings {
  company_name: string;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
  tax_number?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  currency: string;
  pdf_font?: string | null;
}

interface ExportOptions {
  title: string;
  data: any[];
  columns: { key: string; label: string }[];
  includeLogo?: boolean;
  includeCompanyInfo?: boolean;
  orientation?: 'portrait' | 'landscape';
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error fetching company settings:', error);
    return null;
  }
  
  return data as unknown as CompanySettings;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 37, g: 99, b: 235 };
}

// ============================================================
// CRITICAL FIX: Disable jsPDF's internal Arabic reshaping + Bidi
// jsPDF registers two event handlers that conflict with our manual
// processing (reshapeArabicText + toVisualOrder):
//   1. preProcessText → processArabic (reshapes Arabic again)
//   2. postProcessText → bidiEngineFunction (reorders visually)
// We remove BOTH so our manual pipeline is the single Bidi authority.
// ============================================================
let _jspdfPatched = false;

function disableJsPdfInternalArabicProcessing(): void {
  if (_jspdfPatched) return;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (jsPDF as any).API;
  if (!api || !Array.isArray(api.events)) {
    console.warn('[PDF] Could not access jsPDF.API.events to patch');
    return;
  }

  // Remove preProcessText (processArabic) and postProcessText (bidiEngine)
  // Keep utf8EscapeFunction (postProcessText) which handles encoding
  const originalLength = api.events.length;
  
  // Filter: remove processArabic (preProcessText) entirely
  // For postProcessText, remove only the bidi engine (which references doBidiReorder)
  api.events = api.events.filter((entry: any[]) => {
    const [eventName, handler] = entry;
    
    // Remove ALL preProcessText handlers (processArabic)
    if (eventName === 'preProcessText') {
      return false;
    }
    
    // Remove bidiEngine postProcessText handler
    // The bidi handler references __bidiEngine__ or doBidiReorder
    // The utf8Escape handler references "codePoint" or "toHex"
    if (eventName === 'postProcessText' && handler) {
      const fnStr = handler.toString();
      if (fnStr.includes('bidiEngine') || fnStr.includes('doBidiReorder') || fnStr.includes('isInputVisual')) {
        return false;
      }
    }
    
    return true;
  });

  // Also neutralize processArabic on the API itself so getStringUnitWidth doesn't call it
  if (api.processArabic) {
    api.processArabic = function () {
      if (typeof arguments[0] === 'string') return arguments[0];
      return arguments[0];
    };
  }
  if (api.__arabicParser__) {
    api.__arabicParser__.processArabic = api.processArabic;
  }

  _jspdfPatched = true;
  console.log(`[PDF] ✅ Disabled jsPDF internal Arabic/Bidi processing (removed ${originalLength - api.events.length} handlers)`);
}

// Call this at module load time
disableJsPdfInternalArabicProcessing();

// Cache for loaded font
let cachedFont: string | null = null;
let cachedFontKey: PdfFontKey | null = null;

async function setupArabicFont(doc: jsPDF, fontKey: PdfFontKey = 'cairo'): Promise<boolean> {
  try {
    // Clear cache if font changed
    if (cachedFontKey !== fontKey) {
      cachedFont = null;
      cachedFontKey = null;
    }

    if (!cachedFont) {
      console.log(`[PDF] Setting up font: "${fontKey}"`);
      cachedFont = await loadArabicFont(fontKey);
      if (cachedFont) cachedFontKey = fontKey;
    }
    
    if (cachedFont) {
      const vfsName = `${ARABIC_FONT_NAME}-Regular.ttf`;
      
      doc.addFileToVFS(vfsName, cachedFont);
      // Register for all styles so autoTable never falls back to helvetica
      doc.addFont(vfsName, ARABIC_FONT_NAME, 'normal');
      doc.addFont(vfsName, ARABIC_FONT_NAME, 'bold');
      doc.addFont(vfsName, ARABIC_FONT_NAME, 'italic');
      doc.addFont(vfsName, ARABIC_FONT_NAME, 'bolditalic');
      doc.setFont(ARABIC_FONT_NAME);
      console.log(`[PDF] ✅ Font "${ARABIC_FONT_NAME}" registered for all styles`);
      return true;
    }
    console.error('[PDF] ❌ Font loading returned null');
    throw new Error('FONT_LOAD_FAILED');
  } catch (error) {
    console.error('[PDF] ❌ Could not load Arabic font:', error);
    throw new Error('FONT_LOAD_FAILED');
  }
}

// Process text for PDF - reshape Arabic then convert to visual order
function processText(text: string, hasArabicFont: boolean): string {
  if (!text) return '';
  // Always sanitize hidden Bidi control chars, even without Arabic font
  const clean = sanitizeBidiText(String(text));
  if (!hasArabicFont) return clean;
  // Reshape Arabic contextual forms, then convert to visual LTR order for jsPDF
  return toVisualOrder(reshapeArabicText(clean));
}

export async function generatePDF(options: ExportOptions): Promise<void> {
  const {
    title,
    data,
    columns,
    includeLogo = true,
    includeCompanyInfo = true,
    orientation = 'landscape',
  } = options;

  const company = includeCompanyInfo ? await getCompanySettings() : null;
  const primaryColor = company?.primary_color ? hexToRgb(company.primary_color) : { r: 37, g: 99, b: 235 };
  const fontKey = (company?.pdf_font as PdfFontKey) || 'amiri';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const hasArabicFont = await setupArabicFont(doc, fontKey);

  let startY = 15;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;

  // Logo
  if (includeLogo && company?.logo_url) {
    try {
      const logoBase64 = await loadImageAsBase64(company.logo_url);
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', pageWidth - margin - 25, startY - 5, 25, 25);
      }
    } catch { /* skip logo */ }
  }

  // Header with company info
  if (includeCompanyInfo && company) {
    const textX = includeLogo && company.logo_url ? pageWidth - margin - 30 : pageWidth - margin;
    
    doc.setFontSize(18);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(processText(company.company_name, hasArabicFont), textX, startY, { align: 'right' });
    startY += 8;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    if (company.address) {
      doc.text(processText(company.address, hasArabicFont), textX, startY, { align: 'right' });
      startY += 5;
    }
    
    const contactInfo = [company.phone, company.email].filter(Boolean).join(' | ');
    if (contactInfo) {
      doc.text(processText(contactInfo, hasArabicFont), textX, startY, { align: 'right' });
      startY += 5;
    }

    if (company.tax_number) {
      doc.text(processText('الرقم الضريبي: ' + company.tax_number, hasArabicFont), textX, startY, { align: 'right' });
      startY += 5;
    }

    // Divider
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    doc.line(margin, startY + 2, pageWidth - margin, startY + 2);
    startY += 10;
  }

  // Report title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(processText(title, hasArabicFont), pageWidth - margin, startY, { align: 'right' });
  startY += 5;

  // Date
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(processText('تاريخ التصدير: ' + today, hasArabicFont), pageWidth - margin, startY, { align: 'right' });
  startY += 10;

  // Table
  const tableHeaders = columns.map(col => processText(col.label, hasArabicFont));
  const tableBody = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '-';
      if (typeof value === 'boolean') return processText(value ? 'نعم' : 'لا', hasArabicFont);
      if (typeof value === 'number') return value.toLocaleString('ar-EG');
      return processText(String(value), hasArabicFont);
    })
  );

  const fontName = hasArabicFont ? ARABIC_FONT_NAME : 'helvetica';
  autoTable(doc, {
    head: [tableHeaders],
    body: tableBody,
    startY,
    theme: 'grid',
    styles: {
      font: fontName,
      fontSize: 9,
      cellPadding: 3,
      halign: 'right',
      valign: 'middle',
    },
    headStyles: {
      font: fontName,
      fillColor: [primaryColor.r, primaryColor.g, primaryColor.b],
      textColor: [255, 255, 255],
      fontStyle: 'normal',
      halign: 'right',
    },
    bodyStyles: {
      font: fontName,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.1,
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFont(fontName);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      
      const pageText = processText(`صفحة ${data.pageNumber} من ${pageCount}`, hasArabicFont);
      doc.text(pageText, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });

      if (company) {
        doc.text(
          processText(company.company_name, hasArabicFont),
          pageWidth - margin,
          doc.internal.pageSize.height - 10,
          { align: 'right' }
        );
      }

      doc.text(processText(today, hasArabicFont), margin, doc.internal.pageSize.height - 10, { align: 'left' });
    },
  });

  const fileName = `${title}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export type DocumentPdfType =
  | 'invoice'
  | 'quotation'
  | 'sales_order'
  | 'purchase_order'
  | 'payment_receipt'
  | 'expense_receipt'
  | 'credit_note';

export async function generateDocumentPDF(
  type: DocumentPdfType,
  data: any
): Promise<void> {
  const company = await getCompanySettings();
  const primaryColor = company?.primary_color ? hexToRgb(company.primary_color) : { r: 37, g: 99, b: 235 };
  const fontKey = (company?.pdf_font as PdfFontKey) || 'amiri';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const hasArabicFont = await setupArabicFont(doc, fontKey);

  let startY = 15;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;

  const titles: Record<DocumentPdfType, string> = {
    invoice: 'فاتورة مبيعات',
    quotation: 'عرض سعر',
    sales_order: 'أمر بيع',
    purchase_order: 'أمر شراء',
    payment_receipt: 'إيصال دفع',
    expense_receipt: 'إيصال مصروف',
    credit_note: 'إشعار دائن',
  };

  const p = (text: string) => processText(text, hasArabicFont);

  // Logo
  if (company?.logo_url) {
    try {
      const logoBase64 = await loadImageAsBase64(company.logo_url);
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', pageWidth - margin - 25, startY - 5, 25, 25);
      }
    } catch { /* skip logo */ }
  }

  // Company Header
  if (company) {
    const textX = company.logo_url ? pageWidth - margin - 30 : pageWidth - margin;
    
    doc.setFontSize(20);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(p(company.company_name), textX, startY, { align: 'right' });
    startY += 8;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    if (company.address) {
      doc.text(p(company.address), textX, startY, { align: 'right' });
      startY += 5;
    }
    
    if (company.phone) {
      doc.text(p('هاتف: ' + company.phone), textX, startY, { align: 'right' });
      startY += 5;
    }
    
    if (company.tax_number) {
      doc.text(p('الرقم الضريبي: ' + company.tax_number), textX, startY, { align: 'right' });
      startY += 5;
    }
  }

  // Divider
  doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setLineWidth(1);
  doc.line(margin, startY + 3, pageWidth - margin, startY + 3);
  startY += 15;

  // Document Title
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(p(titles[type]), pageWidth / 2, startY, { align: 'center' });
  startY += 10;

  // Document number and date — formatted to match PrintTemplate (ar-EG, 2 decimals, long date)
  doc.setFontSize(11);
  const docNumber = data.invoice_number || data.quotation_number || data.order_number || '';
  const currency = company?.currency || 'ج.م';
  const fmtMoney = (n: number | null | undefined) =>
    new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .format(Number(n || 0)) + ' ' + currency;
  const fmtDate = (d: string | null | undefined) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: '2-digit' }); }
    catch { return String(d); }
  };

  doc.text(p('رقم: ' + docNumber), pageWidth - margin, startY, { align: 'right' });
  doc.text(p('التاريخ: ' + fmtDate(data.created_at)), margin, startY, { align: 'left' });
  startY += 7;

  const dueDate = data.due_date || data.valid_until || data.delivery_date || data.expected_date;
  if (dueDate) {
    const dueLabel = data.valid_until ? 'صالح حتى' : 'تاريخ الاستحقاق';
    doc.text(p(dueLabel + ': ' + fmtDate(dueDate)), pageWidth - margin, startY, { align: 'right' });
    startY += 7;
  }
  startY += 3;

  // Customer/Supplier info box (name + phone + address) — mirrors PrintTemplate info-box
  const entity = data.customer || data.supplier || data.customers || data.suppliers || {};
  const entityName = entity.name || '-';
  const entityPhone = entity.phone || '';
  const entityAddress = entity.address || data.delivery_address || '';
  const isPurchase = type === 'purchase_order';
  const entityLabel = isPurchase ? 'بيانات المورد' : 'بيانات العميل';

  const boxHeight = 8 + (entityPhone ? 6 : 0) + (entityAddress ? 6 : 0);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, startY - 4, pageWidth - margin * 2, boxHeight, 'F');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text(p(entityLabel), pageWidth - margin - 3, startY, { align: 'right' });
  startY += 5;
  doc.setTextColor(0, 0, 0);
  doc.text(p(entityName), pageWidth - margin - 3, startY, { align: 'right' });
  startY += 5;
  if (entityPhone) {
    doc.setTextColor(100, 100, 100);
    doc.text(p('هاتف: ' + entityPhone), pageWidth - margin - 3, startY, { align: 'right' });
    startY += 5;
  }
  if (entityAddress) {
    doc.setTextColor(100, 100, 100);
    doc.text(p(entityAddress), pageWidth - margin - 3, startY, { align: 'right', maxWidth: pageWidth - margin * 2 - 6 });
    startY += 5;
  }
  startY += 5;
  doc.setTextColor(0, 0, 0);

  // Items table — index column + optional discount column to mirror PrintTemplate
  interface PDFItem {
    product?: { name: string };
    products?: { name: string };
    name?: string;
    quantity?: number;
    unit_price: number;
    total_price: number;
    discount_percentage?: number | null;
    discount?: number | null;
  }
  if (data.items && data.items.length > 0) {
    const items = data.items as PDFItem[];
    const hasDiscount = items.some((it) => Number(it.discount_percentage || it.discount || 0) > 0);

    const headers = hasDiscount
      ? [p('#'), p('المنتج'), p('الكمية'), p('سعر الوحدة'), p('الخصم %'), p('الإجمالي')]
      : [p('#'), p('المنتج'), p('الكمية'), p('سعر الوحدة'), p('الإجمالي')];

    const body = items.map((item, idx) => {
      const name = item.product?.name || item.products?.name || item.name || '-';
      const row: string[] = [
        String(idx + 1),
        p(name),
        String(item.quantity ?? 0),
        p(fmtMoney(item.unit_price)),
      ];
      if (hasDiscount) {
        row.push(String(Number(item.discount_percentage || item.discount || 0)) + '%');
      }
      row.push(p(fmtMoney(item.total_price)));
      return row;
    });

    const fontName = hasArabicFont ? ARABIC_FONT_NAME : 'helvetica';
    autoTable(doc, {
      head: [headers],
      body,
      startY,
      theme: 'grid',
      styles: { font: fontName, fontSize: 10, cellPadding: 4, halign: 'right' },
      headStyles: {
        font: fontName,
        fillColor: [primaryColor.r, primaryColor.g, primaryColor.b],
        textColor: [255, 255, 255],
        fontStyle: 'normal',
        halign: 'right',
      },
      bodyStyles: { font: fontName },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Totals (matches PrintTemplate: subtotal → discount (negative, red) → tax → total)
  doc.setFontSize(11);
  const labelX = pageWidth - margin;
  const valueX = pageWidth - margin - 60;
  const writeTotal = (label: string, value: string, opts?: { bold?: boolean; color?: [number, number, number] }) => {
    if (opts?.color) doc.setTextColor(opts.color[0], opts.color[1], opts.color[2]);
    if (opts?.bold) doc.setFontSize(12);
    doc.text(p(label + ':'), labelX, startY, { align: 'right' });
    doc.text(p(value), valueX, startY, { align: 'right' });
    if (opts?.bold) doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    startY += 7;
  };

  writeTotal('المجموع الفرعي', fmtMoney(data.subtotal));
  if (Number(data.discount_amount || 0) > 0) {
    writeTotal('الخصم', '-' + fmtMoney(data.discount_amount), { color: [220, 38, 38] });
  }
  if (Number(data.tax_amount || 0) > 0) {
    writeTotal('الضريبة', fmtMoney(data.tax_amount));
  }
  // Separator line above grand total
  doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setLineWidth(0.5);
  doc.line(valueX - 5, startY - 4, labelX, startY - 4);
  writeTotal('الإجمالي', fmtMoney(data.total_amount), { bold: true, color: [primaryColor.r, primaryColor.g, primaryColor.b] });

  // Notes
  if (data.notes) {
    startY += 6;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(p('ملاحظات:'), pageWidth - margin, startY, { align: 'right' });
    startY += 6;
    doc.text(p(data.notes), pageWidth - margin, startY, { align: 'right', maxWidth: pageWidth - margin * 2 });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    p(`تم إنشاء هذا المستند بواسطة ${company?.company_name || 'النظام'}`),
    pageWidth / 2,
    doc.internal.pageSize.height - 10,
    { align: 'center' }
  );

  const fileName = `${titles[type]}_${docNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
