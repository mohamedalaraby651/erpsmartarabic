import { describe, it, expect } from 'vitest';
import { 
  customerSchema, 
  productSchema, 
  invoiceFormSchema,
  paymentSchema,
  supplierSchema,
  warehouseSchema,
  categorySchema 
} from '@/lib/validations';

describe('customerSchema', () => {
  it('should validate correct customer data', () => {
    const validCustomer = {
      name: 'عميل تجريبي',
      customer_type: 'individual',
      vip_level: 'regular',
    };
    
    const result = customerSchema.safeParse(validCustomer);
    expect(result.success).toBe(true);
  });

  it('should require customer name', () => {
    const invalidCustomer = {
      customer_type: 'individual',
      vip_level: 'regular',
    };
    
    const result = customerSchema.safeParse(invalidCustomer);
    expect(result.success).toBe(false);
  });

  it('should validate email format', () => {
    const invalidEmail = {
      name: 'عميل',
      customer_type: 'individual',
      vip_level: 'regular',
      email: 'invalid-email',
    };
    
    const result = customerSchema.safeParse(invalidEmail);
    expect(result.success).toBe(false);
  });

  it('should accept valid phone numbers', () => {
    const validPhone = {
      name: 'عميل',
      customer_type: 'individual',
      vip_level: 'regular',
      phone: '01234567890',
    };
    
    const result = customerSchema.safeParse(validPhone);
    expect(result.success).toBe(true);
  });

  it('should validate credit limit is positive', () => {
    const negativeCreditLimit = {
      name: 'عميل',
      customer_type: 'individual',
      vip_level: 'regular',
      credit_limit: -1000,
    };
    
    const result = customerSchema.safeParse(negativeCreditLimit);
    expect(result.success).toBe(false);
  });

  it('should allow optional fields to be empty', () => {
    const minimalCustomer = {
      name: 'عميل',
      customer_type: 'individual',
      vip_level: 'regular',
    };
    
    const result = customerSchema.safeParse(minimalCustomer);
    expect(result.success).toBe(true);
  });
});

describe('productSchema', () => {
  it('should validate correct product data', () => {
    const validProduct = {
      name: 'منتج تجريبي',
      sku: 'SKU001',
      cost_price: 100,
      selling_price: 150,
      min_stock: 10,
    };
    
    const result = productSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('should require product name', () => {
    const invalidProduct = {
      sku: 'SKU001',
      cost_price: 100,
      selling_price: 150,
    };
    
    const result = productSchema.safeParse(invalidProduct);
    expect(result.success).toBe(false);
  });

  it('should validate prices are non-negative', () => {
    const negativePrice = {
      name: 'منتج',
      cost_price: -50,
      selling_price: 100,
    };
    
    const result = productSchema.safeParse(negativePrice);
    expect(result.success).toBe(false);
  });

  it('should validate dimensions are positive', () => {
    const invalidDimensions = {
      name: 'منتج',
      selling_price: 100,
      weight_kg: -1,
    };
    
    const result = productSchema.safeParse(invalidDimensions);
    expect(result.success).toBe(false);
  });
});

describe('invoiceFormSchema', () => {
  it('should validate correct invoice data', () => {
    const validInvoice = {
      customer_id: '123e4567-e89b-12d3-a456-426614174000',
      payment_method: 'cash',
    };
    
    const result = invoiceFormSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
  });

  it('should require customer_id', () => {
    const invalidInvoice = {
      payment_method: 'cash',
    };
    
    const result = invoiceFormSchema.safeParse(invalidInvoice);
    expect(result.success).toBe(false);
  });

  it('should validate discount is non-negative', () => {
    const negativeDiscount = {
      customer_id: '123e4567-e89b-12d3-a456-426614174000',
      payment_method: 'cash',
      discount_amount: -100,
    };
    
    const result = invoiceFormSchema.safeParse(negativeDiscount);
    expect(result.success).toBe(false);
  });
});

describe('paymentSchema', () => {
  it('should validate correct payment data', () => {
    const validPayment = {
      customer_id: '123e4567-e89b-12d3-a456-426614174000',
      amount: 1000,
      payment_method: 'cash',
      payment_date: '2024-01-15',
    };
    
    const result = paymentSchema.safeParse(validPayment);
    expect(result.success).toBe(true);
  });

  it('should require positive amount', () => {
    const zeroAmount = {
      customer_id: '123e4567-e89b-12d3-a456-426614174000',
      amount: 0,
      payment_method: 'cash',
      payment_date: '2024-01-15',
    };
    
    const result = paymentSchema.safeParse(zeroAmount);
    expect(result.success).toBe(false);
  });
});

describe('supplierSchema', () => {
  it('should validate correct supplier data', () => {
    const validSupplier = {
      name: 'مورد تجريبي',
      phone: '01234567890',
    };
    
    const result = supplierSchema.safeParse(validSupplier);
    expect(result.success).toBe(true);
  });

  it('should require supplier name', () => {
    const invalidSupplier = {
      phone: '01234567890',
    };
    
    const result = supplierSchema.safeParse(invalidSupplier);
    expect(result.success).toBe(false);
  });
});

describe('warehouseSchema', () => {
  it('should validate correct warehouse data', () => {
    const validWarehouse = {
      name: 'مستودع رئيسي',
      location: 'القاهرة',
    };
    
    const result = warehouseSchema.safeParse(validWarehouse);
    expect(result.success).toBe(true);
  });

  it('should require warehouse name', () => {
    const invalidWarehouse = {
      location: 'القاهرة',
    };
    
    const result = warehouseSchema.safeParse(invalidWarehouse);
    expect(result.success).toBe(false);
  });
});

describe('categorySchema', () => {
  it('should validate correct category data', () => {
    const validCategory = {
      name: 'تصنيف جديد',
      description: 'وصف التصنيف',
    };
    
    const result = categorySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
  });

  it('should require category name', () => {
    const invalidCategory = {
      description: 'وصف',
    };
    
    const result = categorySchema.safeParse(invalidCategory);
    expect(result.success).toBe(false);
  });
});
