import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AVAILABLE_FONTS } from "@/lib/arabicFont";
import type { PdfFontKey } from "@/lib/arabicFont";

interface PrintTemplateProps {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  taxNumber?: string;
  logoUrl?: string;
  documentTitle: string;
  documentNumber: string;
  documentDate: string;
  dueDate?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  supplierName?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    total: number;
  }[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  notes?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export function PrintTemplate(props: PrintTemplateProps) {
  const {
    companyName, companyAddress, companyPhone, companyEmail, taxNumber, logoUrl,
    documentTitle, documentNumber, documentDate, dueDate,
    customerName, customerAddress, customerPhone,
    supplierName, supplierAddress, supplierPhone,
    items, subtotal, discount, tax, total, notes, paymentMethod, paymentStatus,
    primaryColor: propPrimaryColor, secondaryColor: propSecondaryColor,
  } = props;

  // Use prop colors or fallback to default
  const brandColor = propPrimaryColor || '#1e40af';

  // Fetch the selected font from settings
  const { data: settings } = useQuery({
    queryKey: ['company-settings-font'],
    queryFn: async () => {
      const { data } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      return data as any;
    },
    staleTime: 60000,
  });

  const fontKey: PdfFontKey = (settings?.pdf_font as PdfFontKey) || 'cairo';
  const fontConfig = AVAILABLE_FONTS.find(f => f.key === fontKey) || AVAILABLE_FONTS[0];
  const fontFamily = `'${fontConfig.displayName}', 'Segoe UI', Tahoma, Arial, sans-serif`;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + " ج.م";
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMMM yyyy", { locale: ar });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="print-template" dir="rtl" style={{
      backgroundColor: '#ffffff',
      color: '#000000',
      padding: '2rem',
      maxWidth: '56rem',
      margin: '0 auto',
      fontFamily,
    }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=${fontConfig.googleFontFamily}&display=swap');
          
          @media print {
            body > * {
              display: none !important;
              visibility: hidden !important;
            }
            
            [role="dialog"],
            [data-radix-dialog-content] {
              display: block !important;
              visibility: visible !important;
            }
            
            [data-radix-dialog-overlay],
            [data-radix-dialog-close],
            .print\\:hidden,
            button[class*="absolute"][class*="right"],
            [data-radix-dialog-content] > button:first-child,
            [data-radix-dialog-content] > div:first-child:not(.print-template) {
              display: none !important;
              visibility: hidden !important;
              width: 0 !important;
              height: 0 !important;
              overflow: hidden !important;
            }
            
            .print-template {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: auto !important;
              padding: 15mm !important;
              margin: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              z-index: 999999 !important;
              display: block !important;
              visibility: visible !important;
              overflow: visible !important;
              font-family: ${fontFamily} !important;
            }
            .print-template * {
              color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              visibility: visible !important;
            }
            [data-radix-dialog-content] {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              max-height: none !important;
              height: auto !important;
              transform: none !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              background: transparent !important;
              overflow: visible !important;
            }
            @page {
              size: A4;
              margin: 10mm;
            }
            .print-template table {
              border-collapse: collapse !important;
            }
            .print-template th {
              background-color: ${brandColor} !important;
              color: #ffffff !important;
            }
            .print-template .alt-row {
              background-color: #f8fafc !important;
            }
            .print-template .info-box {
              background-color: #f1f5f9 !important;
            }
            .print-template .total-line {
              border-top: 2px solid ${brandColor} !important;
            }
            .print-template .header-border {
              border-bottom: 2px solid ${brandColor} !important;
            }
            .print-template .footer-border {
              border-top: 1px solid #e2e8f0 !important;
            }
          }
        `}
      </style>

      {/* Header */}
      <div className="header-border" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: `2px solid ${brandColor}`,
        paddingBottom: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ flex: 1 }}>
          {logoUrl && (
            <img src={logoUrl} alt="Logo" style={{ height: '4rem', marginBottom: '0.5rem' }} />
          )}
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: brandColor, margin: 0 }}>{companyName}</h1>
          {companyAddress && <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '2px 0' }}>{companyAddress}</p>}
          {companyPhone && <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '2px 0' }}>هاتف: {companyPhone}</p>}
          {companyEmail && <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '2px 0' }}>بريد: {companyEmail}</p>}
          {taxNumber && <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '2px 0' }}>الرقم الضريبي: {taxNumber}</p>}
        </div>
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: brandColor, margin: 0 }}>{documentTitle}</h2>
          <p style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: '0.5rem' }}>رقم: {documentNumber}</p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>التاريخ: {formatDate(documentDate)}</p>
          {dueDate && (
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>تاريخ الاستحقاق: {formatDate(dueDate)}</p>
          )}
        </div>
      </div>

      {/* Customer/Supplier Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {customerName && (
          <div className="info-box" style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '0.5rem' }}>
            <h3 style={{ fontWeight: 600, color: brandColor, marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>بيانات العميل</h3>
            <p style={{ fontWeight: 500, margin: '2px 0' }}>{customerName}</p>
            {customerAddress && <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '2px 0' }}>{customerAddress}</p>}
            {customerPhone && <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '2px 0' }}>هاتف: {customerPhone}</p>}
          </div>
        )}
        {supplierName && (
          <div className="info-box" style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '0.5rem' }}>
            <h3 style={{ fontWeight: 600, color: brandColor, marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>بيانات المورد</h3>
            <p style={{ fontWeight: 500, margin: '2px 0' }}>{supplierName}</p>
            {supplierAddress && <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '2px 0' }}>{supplierAddress}</p>}
            {supplierPhone && <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '2px 0' }}>هاتف: {supplierPhone}</p>}
          </div>
        )}
        {(paymentMethod || paymentStatus) && (
          <div className="info-box" style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '0.5rem' }}>
            <h3 style={{ fontWeight: 600, color: brandColor, marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>معلومات الدفع</h3>
            {paymentMethod && <p style={{ fontSize: '0.875rem', margin: '2px 0' }}>طريقة الدفع: {paymentMethod}</p>}
            {paymentStatus && <p style={{ fontSize: '0.875rem', margin: '2px 0' }}>حالة الدفع: {paymentStatus}</p>}
          </div>
        )}
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
        <thead>
          <tr>
            <th style={{ backgroundColor: brandColor, color: '#ffffff', border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'right' }}>#</th>
            <th style={{ backgroundColor: brandColor, color: '#ffffff', border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'right' }}>المنتج</th>
            <th style={{ backgroundColor: brandColor, color: '#ffffff', border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center' }}>الكمية</th>
            <th style={{ backgroundColor: brandColor, color: '#ffffff', border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'left' }}>سعر الوحدة</th>
            {items.some(i => i.discount && i.discount > 0) && (
              <th style={{ backgroundColor: brandColor, color: '#ffffff', border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center' }}>الخصم %</th>
            )}
            <th style={{ backgroundColor: brandColor, color: '#ffffff', border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'left' }}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className={index % 2 === 0 ? "alt-row" : ""} style={{ backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
              <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'right' }}>{index + 1}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'right' }}>{item.name}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'left' }}>{formatCurrency(item.unitPrice)}</td>
              {items.some(i => i.discount && i.discount > 0) && (
                <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center' }}>{item.discount || 0}%</td>
              )}
              <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'left', fontWeight: 500 }}>{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <div style={{ width: '16rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>المجموع الفرعي:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount && discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#dc2626' }}>
              <span>الخصم:</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          {tax && tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>الضريبة:</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="total-line" style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            fontSize: '1.125rem',
            borderTop: `2px solid ${brandColor}`,
            paddingTop: '0.5rem',
          }}>
            <span>الإجمالي:</span>
            <span style={{ color: brandColor }}>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="info-box" style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>ملاحظات</h3>
          <p style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', margin: 0 }}>{notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="footer-border" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
        <p style={{ margin: '2px 0' }}>شكراً لتعاملكم معنا</p>
        <p style={{ margin: '2px 0' }}>{companyName} - {companyPhone}</p>
      </div>
    </div>
  );
}
