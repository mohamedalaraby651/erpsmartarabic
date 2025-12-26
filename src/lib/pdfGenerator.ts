import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';

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
  
  return data;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 37, g: 99, b: 235 }; // Default blue
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

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  // Set RTL direction
  doc.setR2L(true);

  // Add Arabic font support - using built-in helvetica for now
  // For proper Arabic support, you would need to add a custom Arabic font
  
  let startY = 15;

  // Header with company info
  if (includeCompanyInfo && company) {
    // Company name
    doc.setFontSize(18);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(company.company_name || 'شركتي', doc.internal.pageSize.width - 15, startY, { align: 'right' });
    startY += 8;

    // Contact info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    if (company.address) {
      doc.text(company.address, doc.internal.pageSize.width - 15, startY, { align: 'right' });
      startY += 5;
    }
    
    const contactInfo = [company.phone, company.email].filter(Boolean).join(' | ');
    if (contactInfo) {
      doc.text(contactInfo, doc.internal.pageSize.width - 15, startY, { align: 'right' });
      startY += 5;
    }

    if (company.tax_number) {
      doc.text(`الرقم الضريبي: ${company.tax_number}`, doc.internal.pageSize.width - 15, startY, { align: 'right' });
      startY += 5;
    }

    // Divider line
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    doc.line(15, startY + 2, doc.internal.pageSize.width - 15, startY + 2);
    startY += 10;
  }

  // Report title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(title, doc.internal.pageSize.width - 15, startY, { align: 'right' });
  startY += 5;

  // Date
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const today = new Date().toLocaleDateString('ar-EG', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  doc.text(`تاريخ التصدير: ${today}`, doc.internal.pageSize.width - 15, startY, { align: 'right' });
  startY += 10;

  // Prepare table data
  const tableHeaders = columns.map(col => col.label);
  const tableBody = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '-';
      if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
      if (typeof value === 'number') return value.toLocaleString('ar-EG');
      return String(value);
    })
  );

  // Generate table
  autoTable(doc, {
    head: [tableHeaders],
    body: tableBody,
    startY,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
      halign: 'right',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [primaryColor.r, primaryColor.g, primaryColor.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'right',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.1,
    didDrawPage: (data) => {
      // Footer on each page
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      
      // Page number
      doc.text(
        `صفحة ${data.pageNumber} من ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );

      // Company name in footer
      if (company) {
        doc.text(
          company.company_name || '',
          doc.internal.pageSize.width - 15,
          doc.internal.pageSize.height - 10,
          { align: 'right' }
        );
      }

      // Date in footer
      doc.text(
        today,
        15,
        doc.internal.pageSize.height - 10,
        { align: 'left' }
      );
    },
  });

  // Save the PDF
  const fileName = `${title}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export async function generateDocumentPDF(
  type: 'invoice' | 'quotation' | 'sales_order' | 'purchase_order',
  data: any
): Promise<void> {
  const company = await getCompanySettings();
  const primaryColor = company?.primary_color ? hexToRgb(company.primary_color) : { r: 37, g: 99, b: 235 };

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setR2L(true);

  let startY = 15;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;

  // Document type titles
  const titles: Record<string, string> = {
    invoice: 'فاتورة مبيعات',
    quotation: 'عرض سعر',
    sales_order: 'أمر بيع',
    purchase_order: 'أمر شراء',
  };

  // Company Header
  if (company) {
    doc.setFontSize(20);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(company.company_name, pageWidth - margin, startY, { align: 'right' });
    startY += 8;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    if (company.address) {
      doc.text(company.address, pageWidth - margin, startY, { align: 'right' });
      startY += 5;
    }
    
    if (company.phone) {
      doc.text(`هاتف: ${company.phone}`, pageWidth - margin, startY, { align: 'right' });
      startY += 5;
    }
    
    if (company.tax_number) {
      doc.text(`الرقم الضريبي: ${company.tax_number}`, pageWidth - margin, startY, { align: 'right' });
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
  doc.text(titles[type], pageWidth / 2, startY, { align: 'center' });
  startY += 10;

  // Document number and date
  doc.setFontSize(11);
  const docNumber = data.invoice_number || data.quotation_number || data.order_number || '';
  doc.text(`رقم: ${docNumber}`, pageWidth - margin, startY, { align: 'right' });
  doc.text(`التاريخ: ${new Date(data.created_at).toLocaleDateString('ar-EG')}`, margin, startY, { align: 'left' });
  startY += 10;

  // Customer/Supplier info
  const entityName = data.customer?.name || data.supplier?.name || data.customers?.name || data.suppliers?.name || '-';
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, startY - 5, pageWidth - margin * 2, 15, 'F');
  doc.text(`${type === 'purchase_order' ? 'المورد' : 'العميل'}: ${entityName}`, pageWidth - margin - 5, startY + 3, { align: 'right' });
  startY += 20;

  // Items table
  if (data.items && data.items.length > 0) {
    const tableHeaders = ['المنتج', 'الكمية', 'السعر', 'الإجمالي'];
    const tableBody = data.items.map((item: any) => [
      item.product?.name || item.products?.name || '-',
      item.quantity?.toString() || '0',
      `${Number(item.unit_price).toLocaleString()} ${company?.currency || 'ج.م'}`,
      `${Number(item.total_price).toLocaleString()} ${company?.currency || 'ج.م'}`,
    ]);

    autoTable(doc, {
      head: [tableHeaders],
      body: tableBody,
      startY,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4,
        halign: 'right',
      },
      headStyles: {
        fillColor: [primaryColor.r, primaryColor.g, primaryColor.b],
        textColor: [255, 255, 255],
        halign: 'right',
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
      doc.text(item.label, pageWidth - margin, startY, { align: 'right' });
      doc.text(`${Number(item.value).toLocaleString()} ${company?.currency || 'ج.م'}`, margin + 50, startY, { align: 'left' });
      startY += 7;
    }
  });

  // Notes
  if (data.notes) {
    startY += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('ملاحظات:', pageWidth - margin, startY, { align: 'right' });
    startY += 6;
    doc.text(data.notes, pageWidth - margin, startY, { align: 'right', maxWidth: pageWidth - margin * 2 });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `تم إنشاء هذا المستند بواسطة ${company?.company_name || 'النظام'}`,
    pageWidth / 2,
    doc.internal.pageSize.height - 10,
    { align: 'center' }
  );

  // Save
  const fileName = `${titles[type]}_${docNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
