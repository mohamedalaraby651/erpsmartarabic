/**
 * Statement of Account PDF Generator
 * مولد PDF احترافي لكشف حساب العملاء/الموردين
 * يشمل: ترويسة الشركة، بيانات الطرف، فترة الكشف، رصيد افتتاحي/ختامي،
 * جدول الحركات بالرصيد المتدرج، وملخص في القدم.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

export interface StatementEntry {
  entry_date: string;
  entry_type: string;
  reference: string;
  debit: number;
  credit: number;
  running_balance: number;
  status?: string;
}

export interface StatementPdfOptions {
  partyType: 'customer' | 'supplier';
  partyName: string;
  partyPhone?: string | null;
  partyTaxNumber?: string | null;
  partyAddress?: string | null;
  dateFrom?: string;
  dateTo?: string;
  openingBalance?: number;
  entries: StatementEntry[];
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 37, g: 99, b: 235 };
}

let cachedFont: string | null = null;
let cachedFontKey: PdfFontKey | null = null;

async function setupFont(doc: jsPDF, fontKey: PdfFontKey): Promise<boolean> {
  try {
    if (cachedFontKey !== fontKey) {
      cachedFont = null;
      cachedFontKey = null;
    }
    if (!cachedFont) {
      cachedFont = await loadArabicFont(fontKey);
      if (cachedFont) cachedFontKey = fontKey;
    }
    if (!cachedFont) return false;
    const vfsName = `${ARABIC_FONT_NAME}-Regular.ttf`;
    doc.addFileToVFS(vfsName, cachedFont);
    doc.addFont(vfsName, ARABIC_FONT_NAME, 'normal');
    doc.addFont(vfsName, ARABIC_FONT_NAME, 'bold');
    doc.setFont(ARABIC_FONT_NAME);
    return true;
  } catch {
    return false;
  }
}

function p(text: string, hasFont: boolean): string {
  if (!text) return '';
  const clean = sanitizeBidiText(String(text));
  if (!hasFont) return clean;
  return toVisualOrder(reshapeArabicText(clean));
}

function fmtNumber(n: number): string {
  return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDateAr(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export async function generateStatementPdf(options: StatementPdfOptions): Promise<void> {
  const {
    partyType, partyName, partyPhone, partyTaxNumber, partyAddress,
    dateFrom, dateTo, openingBalance = 0, entries,
  } = options;

  const company = await getCompanySettings();
  const primary = company?.primary_color ? hexToRgb(company.primary_color) : { r: 37, g: 99, b: 235 };
  const fontKey = (company?.pdf_font as PdfFontKey) || 'amiri';
  const currency = company?.currency || 'ج.م';

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const hasFont = await setupFont(doc, fontKey);
  const fontName = hasFont ? ARABIC_FONT_NAME : 'helvetica';
  const tx = (s: string) => p(s, hasFont);

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 12;
  let y = 12;

  // ===== Logo =====
  if (company?.logo_url) {
    try {
      const logoBase64 = await loadImageAsBase64(company.logo_url);
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, y, 22, 22);
      }
    } catch { /* skip */ }
  }

  // ===== Company Header (right side) =====
  if (company) {
    const textX = pageWidth - margin;
    doc.setFontSize(16);
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text(tx(company.company_name), textX, y + 5, { align: 'right' });

    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    let lineY = y + 10;
    if (company.address) {
      doc.text(tx(company.address), textX, lineY, { align: 'right' });
      lineY += 4;
    }
    const contact = [company.phone, company.email].filter(Boolean).join(' | ');
    if (contact) {
      doc.text(tx(contact), textX, lineY, { align: 'right' });
      lineY += 4;
    }
    if (company.tax_number) {
      doc.text(tx('الرقم الضريبي: ' + company.tax_number), textX, lineY, { align: 'right' });
    }
  }

  y = 36;
  // Divider
  doc.setDrawColor(primary.r, primary.g, primary.b);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ===== Title =====
  doc.setFontSize(18);
  doc.setTextColor(primary.r, primary.g, primary.b);
  const title = partyType === 'customer' ? 'كشف حساب عميل' : 'كشف حساب مورد';
  doc.text(tx(title), pageWidth / 2, y + 2, { align: 'center' });
  y += 10;

  // ===== Party + Period info box =====
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(220, 225, 230);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  const partyLabel = partyType === 'customer' ? 'العميل' : 'المورد';
  doc.text(tx(`${partyLabel}: ${partyName}`), pageWidth - margin - 4, y + 6, { align: 'right' });
  if (partyPhone) {
    doc.text(tx(`هاتف: ${partyPhone}`), pageWidth - margin - 4, y + 11, { align: 'right' });
  }
  if (partyAddress) {
    doc.text(tx(`العنوان: ${partyAddress}`), pageWidth - margin - 4, y + 16, { align: 'right' });
  }
  if (partyTaxNumber) {
    doc.text(tx(`الرقم الضريبي: ${partyTaxNumber}`), pageWidth / 2, y + 6, { align: 'center' });
  }

  // Period (left side)
  const periodText = dateFrom && dateTo
    ? `الفترة: من ${fmtDateAr(dateFrom)} إلى ${fmtDateAr(dateTo)}`
    : dateFrom
    ? `من ${fmtDateAr(dateFrom)}`
    : dateTo
    ? `حتى ${fmtDateAr(dateTo)}`
    : 'كل الفترات';
  doc.text(tx(periodText), margin + 4, y + 6, { align: 'left' });
  doc.text(
    tx(`تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}`),
    margin + 4, y + 11, { align: 'left' }
  );

  y += 27;

  // ===== Opening balance row + table =====
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const closingBalance = openingBalance + totalDebit - totalCredit;

  const tableHead = [[
    tx('التاريخ'),
    tx('النوع'),
    tx('المرجع'),
    tx('مدين'),
    tx('دائن'),
    tx('الرصيد'),
  ]];

  const tableBody: string[][] = [];

  // Opening balance row
  tableBody.push([
    tx(dateFrom ? fmtDateAr(dateFrom) : '—'),
    tx('رصيد افتتاحي'),
    '—',
    openingBalance > 0 ? fmtNumber(openingBalance) : '—',
    openingBalance < 0 ? fmtNumber(openingBalance) : '—',
    fmtNumber(openingBalance),
  ]);

  // Entries
  entries.forEach((e) => {
    tableBody.push([
      tx(fmtDateAr(e.entry_date)),
      tx(e.entry_type),
      tx(e.reference || '—'),
      e.debit > 0 ? fmtNumber(e.debit) : '—',
      e.credit > 0 ? fmtNumber(e.credit) : '—',
      fmtNumber(e.running_balance),
    ]);
  });

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: y,
    theme: 'grid',
    styles: {
      font: fontName,
      fontSize: 8.5,
      cellPadding: 2.5,
      halign: 'right',
      valign: 'middle',
      lineColor: [220, 225, 230],
      lineWidth: 0.1,
    },
    headStyles: {
      font: fontName,
      fillColor: [primary.r, primary.g, primary.b],
      textColor: [255, 255, 255],
      fontStyle: 'normal',
      halign: 'center',
      fontSize: 9,
    },
    bodyStyles: { font: fontName },
    alternateRowStyles: { fillColor: [250, 251, 253] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 28 },
      1: { halign: 'center', cellWidth: 35 },
      2: { halign: 'center' },
      3: { halign: 'center', cellWidth: 30 },
      4: { halign: 'center', cellWidth: 30 },
      5: { halign: 'center', cellWidth: 35, fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.getNumberOfPages();
      doc.setFont(fontName);
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(
        tx(`صفحة ${data.pageNumber} من ${pageCount}`),
        pageWidth / 2, pageHeight - 6, { align: 'center' }
      );
      if (company) {
        doc.text(tx(company.company_name), pageWidth - margin, pageHeight - 6, { align: 'right' });
      }
      doc.text(
        tx(new Date().toLocaleDateString('ar-EG')),
        margin, pageHeight - 6, { align: 'left' }
      );
    },
    margin: { left: margin, right: margin, bottom: 22 },
  });

  // ===== Summary box =====
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let sy = finalY + 6;

  if (sy > pageHeight - 40) {
    doc.addPage();
    sy = 20;
  }

  // Summary card
  const boxX = pageWidth - margin - 100;
  const boxW = 100;
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(primary.r, primary.g, primary.b);
  doc.setLineWidth(0.4);
  doc.roundedRect(boxX, sy, boxW, 30, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(tx('الرصيد الافتتاحي:'), boxX + boxW - 4, sy + 6, { align: 'right' });
  doc.text(`${fmtNumber(openingBalance)} ${tx(currency)}`, boxX + 4, sy + 6, { align: 'left' });

  doc.text(tx('إجمالي مدين:'), boxX + boxW - 4, sy + 12, { align: 'right' });
  doc.setTextColor(200, 50, 50);
  doc.text(`${fmtNumber(totalDebit)} ${tx(currency)}`, boxX + 4, sy + 12, { align: 'left' });

  doc.setTextColor(80, 80, 80);
  doc.text(tx('إجمالي دائن:'), boxX + boxW - 4, sy + 18, { align: 'right' });
  doc.setTextColor(40, 150, 80);
  doc.text(`${fmtNumber(totalCredit)} ${tx(currency)}`, boxX + 4, sy + 18, { align: 'left' });

  // Closing balance — bold + colored
  doc.setDrawColor(220, 225, 230);
  doc.line(boxX + 2, sy + 21, boxX + boxW - 2, sy + 21);

  doc.setFontSize(11);
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text(tx('الرصيد الختامي:'), boxX + boxW - 4, sy + 27, { align: 'right' });
  const closingColor = closingBalance > 0 ? { r: 200, g: 50, b: 50 } : { r: 40, g: 150, b: 80 };
  doc.setTextColor(closingColor.r, closingColor.g, closingColor.b);
  doc.text(`${fmtNumber(closingBalance)} ${tx(currency)}`, boxX + 4, sy + 27, { align: 'left' });

  // Signature line
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, sy + 22, margin + 60, sy + 22);
  doc.text(tx('التوقيع والختم'), margin + 30, sy + 27, { align: 'center' });

  // Save
  const safeName = partyName.replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, '_').slice(0, 40);
  const fileName = `كشف_حساب_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
