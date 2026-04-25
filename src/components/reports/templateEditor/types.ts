/**
 * Shared types and constants for the Report Template Editor.
 */

export interface TemplateColumn {
  id: string;
  key: string;
  label: string;
  width?: number;
  visible: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: string;
  template_data: {
    header?: {
      showLogo: boolean;
      showCompanyInfo: boolean;
      title: string;
      subtitle?: string;
    };
    columns: TemplateColumn[];
    footer?: {
      showSignature: boolean;
      showDate: boolean;
      notes?: string;
    };
    styling?: {
      primaryColor?: string;
      fontFamily?: string;
      fontSize?: string;
    };
  };
  is_default: boolean;
  created_at: string;
}

export const REPORT_TYPES = [
  { value: 'invoice', label: 'فاتورة' },
  { value: 'quotation', label: 'عرض سعر' },
  { value: 'sales_order', label: 'أمر بيع' },
  { value: 'purchase_order', label: 'أمر شراء' },
  { value: 'customer_statement', label: 'كشف حساب عميل' },
  { value: 'inventory_report', label: 'تقرير المخزون' },
];

export const DEFAULT_COLUMNS: Record<string, TemplateColumn[]> = {
  invoice: [
    { id: '1', key: 'product_name', label: 'المنتج', visible: true },
    { id: '2', key: 'quantity', label: 'الكمية', visible: true },
    { id: '3', key: 'unit_price', label: 'سعر الوحدة', visible: true },
    { id: '4', key: 'discount', label: 'الخصم', visible: true },
    { id: '5', key: 'total', label: 'الإجمالي', visible: true },
  ],
  quotation: [
    { id: '1', key: 'product_name', label: 'المنتج', visible: true },
    { id: '2', key: 'description', label: 'الوصف', visible: true },
    { id: '3', key: 'quantity', label: 'الكمية', visible: true },
    { id: '4', key: 'unit_price', label: 'سعر الوحدة', visible: true },
    { id: '5', key: 'total', label: 'الإجمالي', visible: true },
  ],
  sales_order: [
    { id: '1', key: 'product_name', label: 'المنتج', visible: true },
    { id: '2', key: 'sku', label: 'الكود', visible: true },
    { id: '3', key: 'quantity', label: 'الكمية', visible: true },
    { id: '4', key: 'unit_price', label: 'سعر الوحدة', visible: true },
    { id: '5', key: 'total', label: 'الإجمالي', visible: true },
  ],
  purchase_order: [
    { id: '1', key: 'product_name', label: 'المنتج', visible: true },
    { id: '2', key: 'sku', label: 'الكود', visible: true },
    { id: '3', key: 'quantity', label: 'الكمية', visible: true },
    { id: '4', key: 'unit_price', label: 'سعر الوحدة', visible: true },
    { id: '5', key: 'total', label: 'الإجمالي', visible: true },
  ],
  customer_statement: [
    { id: '1', key: 'date', label: 'التاريخ', visible: true },
    { id: '2', key: 'reference', label: 'المرجع', visible: true },
    { id: '3', key: 'description', label: 'البيان', visible: true },
    { id: '4', key: 'debit', label: 'مدين', visible: true },
    { id: '5', key: 'credit', label: 'دائن', visible: true },
    { id: '6', key: 'balance', label: 'الرصيد', visible: true },
  ],
  inventory_report: [
    { id: '1', key: 'product_name', label: 'المنتج', visible: true },
    { id: '2', key: 'sku', label: 'الكود', visible: true },
    { id: '3', key: 'warehouse', label: 'المستودع', visible: true },
    { id: '4', key: 'quantity', label: 'الكمية', visible: true },
    { id: '5', key: 'min_stock', label: 'الحد الأدنى', visible: true },
  ],
};
