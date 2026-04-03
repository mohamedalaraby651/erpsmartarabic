import { z } from "zod";

// Common validation helpers
const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
const optionalString = z.string().max(500).optional().or(z.literal(''));
const optionalEmail = z.string().email('البريد الإلكتروني غير صالح').max(255).optional().or(z.literal(''));
const optionalPhone = z.string().regex(phoneRegex, 'رقم الهاتف غير صالح').max(20).optional().or(z.literal(''));

// Customer validation schema
export const customerSchema = z.object({
  name: z.string().trim().min(1, 'اسم العميل مطلوب').max(200, 'اسم العميل طويل جداً'),
  customer_type: z.enum(['individual', 'company', 'farm']),
  vip_level: z.enum(['regular', 'silver', 'gold', 'platinum']),
  phone: optionalPhone,
  phone2: optionalPhone,
  email: optionalEmail,
  tax_number: z.string().max(50).optional().or(z.literal('')),
  credit_limit: z.number().min(0, 'سقف الائتمان يجب أن يكون 0 أو أكثر').max(1000000000, 'سقف الائتمان كبير جداً').optional().default(0),
  category_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().max(2000, 'الملاحظات طويلة جداً').optional().or(z.literal('')),
  is_active: z.boolean().optional().default(true),
  governorate: optionalString,
  city: optionalString,
  discount_percentage: z.number().min(0, 'نسبة الخصم يجب أن تكون 0 أو أكثر').max(100, 'نسبة الخصم لا تتجاوز 100%').optional().default(0),
  contact_person: optionalString,
  contact_person_role: optionalString,
  payment_terms_days: z.number().int().min(0).max(365).optional().default(0),
  preferred_payment_method: z.string().optional().or(z.literal('')),
  facebook_url: z.string().max(500).optional().or(z.literal('')),
  website_url: z.string().max(500).optional().or(z.literal('')),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

/**
 * Write-side schema for Repository layer validation.
 * Strips UI-only defaults and validates data before DB insert/update.
 */
export const customerWriteSchema = z.object({
  name: z.string().trim().min(1, 'اسم العميل مطلوب').max(200),
  customer_type: z.enum(['individual', 'company', 'farm']).optional(),
  vip_level: z.enum(['regular', 'silver', 'gold', 'platinum']).optional(),
  phone: z.string().regex(phoneRegex).max(20).optional().or(z.literal('')).or(z.literal(null)),
  phone2: z.string().regex(phoneRegex).max(20).optional().or(z.literal('')).or(z.literal(null)),
  email: z.string().email().max(255).optional().or(z.literal('')).or(z.literal(null)),
  tax_number: z.string().max(50).optional().or(z.literal('')).or(z.literal(null)),
  credit_limit: z.number().min(0).max(1000000000).optional().nullable(),
  category_id: z.string().uuid().optional().or(z.literal('')).or(z.literal(null)),
  notes: z.string().max(2000).optional().or(z.literal('')).or(z.literal(null)),
  is_active: z.boolean().optional(),
  governorate: z.string().max(500).optional().or(z.literal('')).or(z.literal(null)),
  city: z.string().max(500).optional().or(z.literal('')).or(z.literal(null)),
  discount_percentage: z.number().min(0).max(100).optional().nullable(),
  contact_person: z.string().max(500).optional().or(z.literal('')).or(z.literal(null)),
  contact_person_role: z.string().max(500).optional().or(z.literal('')).or(z.literal(null)),
  payment_terms_days: z.number().int().min(0).max(365).optional().nullable(),
  preferred_payment_method: z.string().optional().or(z.literal('')).or(z.literal(null)),
  facebook_url: z.string().max(500).optional().or(z.literal('')).or(z.literal(null)),
  website_url: z.string().max(500).optional().or(z.literal('')).or(z.literal(null)),
}).passthrough(); // Allow tenant_id, image_url, etc.

// Product validation schema
export const productSchema = z.object({
  name: z.string().trim().min(1, 'اسم المنتج مطلوب').max(200, 'اسم المنتج طويل جداً'),
  sku: z.string().max(50).optional().or(z.literal('')),
  description: z.string().max(2000).optional().or(z.literal('')),
  category_id: z.string().uuid().optional().or(z.literal('')),
  cost_price: z.number().min(0, 'سعر التكلفة يجب أن يكون 0 أو أكثر').max(1000000000).optional().default(0),
  selling_price: z.number().min(0, 'سعر البيع يجب أن يكون 0 أو أكثر').max(1000000000).optional().default(0),
  min_stock: z.number().int().min(0).max(1000000).optional().default(0),
  image_url: z.string().url('رابط الصورة غير صالح').max(500).optional().or(z.literal('')),
  weight_kg: z.number().min(0).max(100000).optional(),
  length_cm: z.number().min(0).max(100000).optional(),
  width_cm: z.number().min(0).max(100000).optional(),
  height_cm: z.number().min(0).max(100000).optional(),
  is_active: z.boolean().optional().default(true),
});

export type ProductFormData = z.infer<typeof productSchema>;

// Invoice validation schema
export const invoiceFormSchema = z.object({
  customer_id: z.string().uuid('يجب اختيار العميل'),
  payment_method: z.enum(['cash', 'bank_transfer', 'credit', 'advance_payment', 'installment']),
  due_date: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  internal_notes: z.string().max(2000).optional().or(z.literal('')),
  discount_amount: z.number().min(0, 'الخصم يجب أن يكون 0 أو أكثر').max(1000000000).optional().default(0),
  tax_amount: z.number().min(0, 'الضريبة يجب أن تكون 0 أو أكثر').max(1000000000).optional().default(0),
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

// Invoice item validation
export const invoiceItemSchema = z.object({
  product_id: z.string().uuid('يجب اختيار المنتج'),
  quantity: z.number().int().min(1, 'الكمية يجب أن تكون 1 أو أكثر').max(1000000),
  unit_price: z.number().min(0).max(1000000000),
  discount_percentage: z.number().min(0).max(100, 'نسبة الخصم يجب أن تكون بين 0 و 100'),
});

export type InvoiceItemData = z.infer<typeof invoiceItemSchema>;

// Document item validation (for quotations, sales orders, purchase orders)
export const documentItemSchema = z.object({
  product_id: z.string().min(1, 'يجب اختيار منتج'),
  quantity: z.number()
    .min(1, 'الكمية يجب أن تكون 1 على الأقل')
    .max(100000, 'الكمية كبيرة جداً'),
  unit_price: z.number()
    .min(0, 'السعر لا يمكن أن يكون سالباً')
    .max(10000000, 'السعر كبير جداً'),
  discount_percentage: z.number()
    .min(0, 'الخصم لا يمكن أن يكون سالباً')
    .max(100, 'الخصم لا يمكن أن يتجاوز 100%')
    .optional()
    .default(0),
});

export type DocumentItemData = z.infer<typeof documentItemSchema>;

// Item validation error interface
export interface ItemValidationError {
  index: number;
  field: string;
  message: string;
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: ItemValidationError[];
}

/**
 * Validate document items (quotations, sales orders, purchase orders)
 * Returns validation result with detailed error information
 */
export function validateDocumentItems(items: unknown[]): ValidationResult {
  const errors: ItemValidationError[] = [];
  
  if (!Array.isArray(items) || items.length === 0) {
    errors.push({
      index: -1,
      field: 'items',
      message: 'يجب إضافة منتج واحد على الأقل',
    });
    return { valid: false, errors };
  }
  
  items.forEach((item, index) => {
    const result = documentItemSchema.safeParse(item);
    if (!result.success) {
      const issue = result.error.issues[0];
      errors.push({
        index,
        field: issue.path[0] as string || 'unknown',
        message: issue.message,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get user-friendly error message for document items validation
 */
export function getItemsValidationMessage(result: ValidationResult): string {
  if (result.valid) return '';
  
  const firstError = result.errors[0];
  if (firstError.index === -1) {
    return firstError.message;
  }
  
  return `خطأ في الصف ${firstError.index + 1}: ${firstError.message}`;
}

// Payment validation schema
export const paymentSchema = z.object({
  customer_id: z.string().uuid('يجب اختيار العميل'),
  invoice_id: z.string().uuid().optional().or(z.literal('')),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر').max(1000000000, 'المبلغ كبير جداً'),
  payment_method: z.enum(['cash', 'bank_transfer', 'credit', 'advance_payment', 'installment']),
  payment_date: z.string().min(1, 'تاريخ الدفع مطلوب'),
  reference_number: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

/**
 * Write-side schema for Supplier Repository layer validation.
 */
export const supplierWriteSchema = z.object({
  name: z.string().trim().min(1, 'اسم المورد مطلوب').max(200),
  contact_person: z.string().max(100).optional().or(z.literal('')).or(z.literal(null)),
  phone: z.string().regex(phoneRegex).max(20).optional().or(z.literal('')).or(z.literal(null)),
  phone2: z.string().regex(phoneRegex).max(20).optional().or(z.literal('')).or(z.literal(null)),
  email: z.string().email().max(255).optional().or(z.literal('')).or(z.literal(null)),
  address: z.string().max(500).optional().or(z.literal('')).or(z.literal(null)),
  tax_number: z.string().max(50).optional().or(z.literal('')).or(z.literal(null)),
  notes: z.string().max(2000).optional().or(z.literal('')).or(z.literal(null)),
  is_active: z.boolean().optional(),
  credit_limit: z.number().min(0).max(1000000000).optional().nullable(),
  discount_percentage: z.number().min(0).max(100).optional().nullable(),
  payment_terms_days: z.number().int().min(0).max(365).optional().nullable(),
  governorate: z.string().max(500).optional().or(z.literal('')).or(z.literal(null)),
  category: z.string().max(200).optional().or(z.literal('')).or(z.literal(null)),
}).passthrough();

/**
 * Import-side schema for supplier import validation.
 */
export const supplierImportSchema = z.object({
  name: z.string().trim().min(1, 'اسم المورد مطلوب').max(200),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('بريد إلكتروني غير صالح').max(255).optional().or(z.literal('')),
  contact_person: z.string().max(100).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  tax_number: z.string().max(50).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

// Supplier validation schema
export const supplierSchema = z.object({
  name: z.string().trim().min(1, 'اسم المورد مطلوب').max(200, 'اسم المورد طويل جداً'),
  contact_person: z.string().max(100).optional().or(z.literal('')),
  phone: optionalPhone,
  phone2: optionalPhone,
  email: optionalEmail,
  address: z.string().max(500).optional().or(z.literal('')),
  tax_number: z.string().max(50).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  is_active: z.boolean().optional().default(true),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

// Warehouse validation schema
export const warehouseSchema = z.object({
  name: z.string().trim().min(1, 'اسم المستودع مطلوب').max(100, 'اسم المستودع طويل جداً'),
  location: z.string().max(200).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  is_active: z.boolean().optional().default(true),
});

export type WarehouseFormData = z.infer<typeof warehouseSchema>;

// Category validation schema
export const categorySchema = z.object({
  name: z.string().trim().min(1, 'اسم التصنيف مطلوب').max(100, 'اسم التصنيف طويل جداً'),
  description: z.string().max(500).optional().or(z.literal('')),
  parent_id: z.string().uuid().optional().or(z.literal('')),
  sort_order: z.number().int().min(0).max(10000).optional(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
