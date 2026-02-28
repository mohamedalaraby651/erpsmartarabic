import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { loadArabicFont, ARABIC_FONT_NAME, reshapeArabicText, loadImageAsBase64, getPdfFontConfig } from './arabicFont';
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

// Cache for loaded font - keyed by font name
let cachedFont: string | null = null;
let cachedFontKey: PdfFontKey | null = null;

async function setupArabicFont(doc: jsPDF, fontKey: PdfFontKey = 'cairo'): Promise<boolean> {
  try {
    // Resolve to actual PDF font (e.g. cairo -> amiri)
    const pdfConfig = getPdfFontConfig(fontKey);
    const actualKey = pdfConfig.key;

    // Clear cache if font changed
    if (cachedFontKey !== actualKey) {
      cachedFont = null;
      cachedFontKey = null;
    }

    if (!cachedFont) {
      console.log(`[PDF] Setting up font: requested="${fontKey}", actual PDF font="${pdfConfig.name}"`);
      cachedFont = await loadArabicFont(fontKey);
      if (cachedFont) cachedFontKey = actualKey;
    }
    
    if (cachedFont) {
      const vfsName = `${pdfConfig.name}-Regular.ttf`;
      
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
    return false;
  } catch (error) {
    console.error('[PDF] ❌ Could not load Arabic font:', error);
    return false;
  }
}

// Process text for PDF - reshape Arabic text for correct rendering
function processText(text: string, hasArabicFont: boolean): string {
  if (!text) return '';
  if (!hasArabicFont) return text;
  return reshapeArabicText(text);
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
  const fontKey = (company?.pdf_font as PdfFontKey) || 'cairo';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const hasArabicFont = await setupArabicFont(doc, fontKey);
  doc.setR2L(true);

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
      doc.text(contactInfo, textX, startY, { align: 'right' });
      startY += 5;
    }

    if (company.tax_number) {
      doc.text(`${processText('الرقم الضريبي: ', hasArabicFont)}${company.tax_number}`, textX, startY, { align: 'right' });
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
  doc.text(`${processText('تاريخ التصدير: ', hasArabicFont)}${today}`, pageWidth - margin, startY, { align: 'right' });
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

      doc.text(today, margin, doc.internal.pageSize.height - 10, { align: 'left' });
    },
  });

  const fileName = `${title}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export async function generateDocumentPDF(
  type: 'invoice' | 'quotation' | 'sales_order' | 'purchase_order',
  data: any
): Promise<void> {
  const company = await getCompanySettings();
  const primaryColor = company?.primary_color ? hexToRgb(company.primary_color) : { r: 37, g: 99, b: 235 };
  const fontKey = (company?.pdf_font as PdfFontKey) || 'cairo';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const hasArabicFont = await setupArabicFont(doc, fontKey);
  doc.setR2L(true);

  let startY = 15;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;

  const titles: Record<string, string> = {
    invoice: 'فاتورة مبيعات',
    quotation: 'عرض سعر',
    sales_order: 'أمر بيع',
    purchase_order: 'أمر شراء',
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
      doc.text(`${p('هاتف: ')}${company.phone}`, textX, startY, { align: 'right' });
      startY += 5;
    }
    
    if (company.tax_number) {
      doc.text(`${p('الرقم الضريبي: ')}${company.tax_number}`, textX, startY, { align: 'right' });
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

  // Document number and date
  doc.setFontSize(11);
  const docNumber = data.invoice_number || data.quotation_number || data.order_number || '';
  doc.text(`${p('رقم: ')}${docNumber}`, pageWidth - margin, startY, { align: 'right' });
  doc.text(`${p('التاريخ: ')}${new Date(data.created_at).toLocaleDateString('ar-EG')}`, margin, startY, { align: 'left' });
  startY += 10;

  // Customer/Supplier info
  const entityName = data.customer?.name || data.supplier?.name || data.customers?.name || data.suppliers?.name || '-';
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, startY - 5, pageWidth - margin * 2, 15, 'F');
  const entityLabel = type === 'purchase_order' ? 'المورد' : 'العميل';
  doc.text(`${p(entityLabel)}: ${p(entityName)}`, pageWidth - margin - 5, startY + 3, { align: 'right' });
  startY += 20;

  // Items table
  interface PDFItem {
    product?: { name: string };
    products?: { name: string };
    quantity?: number;
    unit_price: number;
    total_price: number;
  }
  if (data.items && data.items.length > 0) {
    const tableHeaders = [p('المنتج'), p('الكمية'), p('السعر'), p('الإجمالي')];
    const tableBody = (data.items as PDFItem[]).map((item) => [
      p(item.product?.name || item.products?.name || '-'),
      item.quantity?.toString() || '0',
      `${Number(item.unit_price).toLocaleString()} ${company?.currency || 'ج.م'}`,
      `${Number(item.total_price).toLocaleString()} ${company?.currency || 'ج.م'}`,
    ]);

    const fontName = hasArabicFont ? ARABIC_FONT_NAME : 'helvetica';
    autoTable(doc, {
      head: [tableHeaders],
      body: tableBody,
      startY,
      theme: 'grid',
      styles: {
        font: fontName,
        fontSize: 10,
        cellPadding: 4,
        halign: 'right',
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
    });

    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Totals
  const totals = [
    { label: 'المجموع الفرعي', value: data.subtotal },
    { label: 'الضريبة', value: data.tax_amount },
    { label: 'الخصم', value: data.discount_amount },
    { label: 'الإجمالي', value: data.total_amount },
  ];

  doc.setFontSize(11);
  totals.forEach((item) => {
    if (item.value) {
      doc.text(p(item.label), pageWidth - margin, startY, { align: 'right' });
      doc.text(`${Number(item.value).toLocaleString()} ${company?.currency || 'ج.م'}`, margin + 50, startY, { align: 'left' });
      startY += 7;
    }
  });

  // Notes
  if (data.notes) {
    startY += 10;
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
