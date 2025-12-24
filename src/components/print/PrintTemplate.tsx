import { format } from "date-fns";
import { ar } from "date-fns/locale";

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
}

export function PrintTemplate({
  companyName,
  companyAddress,
  companyPhone,
  companyEmail,
  taxNumber,
  logoUrl,
  documentTitle,
  documentNumber,
  documentDate,
  dueDate,
  customerName,
  customerAddress,
  customerPhone,
  supplierName,
  supplierAddress,
  supplierPhone,
  items,
  subtotal,
  discount,
  tax,
  total,
  notes,
  paymentMethod,
  paymentStatus,
}: PrintTemplateProps) {
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
    <div className="print-template bg-white p-8 max-w-4xl mx-auto" dir="rtl">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-template, .print-template * {
              visibility: visible;
            }
            .print-template {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
            }
            @page {
              size: A4;
              margin: 15mm;
            }
          }
        `}
      </style>

      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-6">
        <div className="flex-1">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="h-16 mb-2" />
          )}
          <h1 className="text-2xl font-bold text-primary">{companyName}</h1>
          {companyAddress && <p className="text-sm text-muted-foreground">{companyAddress}</p>}
          {companyPhone && <p className="text-sm text-muted-foreground">هاتف: {companyPhone}</p>}
          {companyEmail && <p className="text-sm text-muted-foreground">بريد: {companyEmail}</p>}
          {taxNumber && <p className="text-sm text-muted-foreground">الرقم الضريبي: {taxNumber}</p>}
        </div>
        <div className="text-left">
          <h2 className="text-3xl font-bold text-primary">{documentTitle}</h2>
          <p className="text-lg font-semibold mt-2">رقم: {documentNumber}</p>
          <p className="text-sm text-muted-foreground">التاريخ: {formatDate(documentDate)}</p>
          {dueDate && (
            <p className="text-sm text-muted-foreground">تاريخ الاستحقاق: {formatDate(dueDate)}</p>
          )}
        </div>
      </div>

      {/* Customer/Supplier Info */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {customerName && (
          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="font-semibold text-primary mb-2">بيانات العميل</h3>
            <p className="font-medium">{customerName}</p>
            {customerAddress && <p className="text-sm text-muted-foreground">{customerAddress}</p>}
            {customerPhone && <p className="text-sm text-muted-foreground">هاتف: {customerPhone}</p>}
          </div>
        )}
        {supplierName && (
          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="font-semibold text-primary mb-2">بيانات المورد</h3>
            <p className="font-medium">{supplierName}</p>
            {supplierAddress && <p className="text-sm text-muted-foreground">{supplierAddress}</p>}
            {supplierPhone && <p className="text-sm text-muted-foreground">هاتف: {supplierPhone}</p>}
          </div>
        )}
        {(paymentMethod || paymentStatus) && (
          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="font-semibold text-primary mb-2">معلومات الدفع</h3>
            {paymentMethod && <p className="text-sm">طريقة الدفع: {paymentMethod}</p>}
            {paymentStatus && <p className="text-sm">حالة الدفع: {paymentStatus}</p>}
          </div>
        )}
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-primary text-primary-foreground">
            <th className="border border-border p-2 text-right">#</th>
            <th className="border border-border p-2 text-right">المنتج</th>
            <th className="border border-border p-2 text-center">الكمية</th>
            <th className="border border-border p-2 text-left">سعر الوحدة</th>
            {items.some(i => i.discount && i.discount > 0) && (
              <th className="border border-border p-2 text-center">الخصم %</th>
            )}
            <th className="border border-border p-2 text-left">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className={index % 2 === 0 ? "bg-muted/20" : ""}>
              <td className="border border-border p-2 text-right">{index + 1}</td>
              <td className="border border-border p-2 text-right">{item.name}</td>
              <td className="border border-border p-2 text-center">{item.quantity}</td>
              <td className="border border-border p-2 text-left">{formatCurrency(item.unitPrice)}</td>
              {items.some(i => i.discount && i.discount > 0) && (
                <td className="border border-border p-2 text-center">{item.discount || 0}%</td>
              )}
              <td className="border border-border p-2 text-left font-medium">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-2">
          <div className="flex justify-between">
            <span>المجموع الفرعي:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount && discount > 0 && (
            <div className="flex justify-between text-destructive">
              <span>الخصم:</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          {tax && tax > 0 && (
            <div className="flex justify-between">
              <span>الضريبة:</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t-2 border-primary pt-2">
            <span>الإجمالي:</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="bg-muted/30 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-2">ملاحظات</h3>
          <p className="text-sm whitespace-pre-wrap">{notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t pt-4 text-center text-sm text-muted-foreground">
        <p>شكراً لتعاملكم معنا</p>
        <p className="mt-1">{companyName} - {companyPhone}</p>
      </div>
    </div>
  );
}
