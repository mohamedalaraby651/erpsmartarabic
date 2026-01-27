/**
 * Financial Calculations Integration Tests
 * اختبارات تكامل الحسابات المالية
 * 
 * @module tests/integration/financial-calculations
 */

import { describe, it, expect } from 'vitest';

describe('Invoice Calculations / حسابات الفواتير', () => {
  describe('Subtotal Calculation / حساب المجموع الفرعي', () => {
    it('should calculate subtotal correctly', () => {
      const items = [
        { quantity: 2, unit_price: 100 },
        { quantity: 3, unit_price: 50 },
        { quantity: 1, unit_price: 200 },
      ];
      
      const subtotal = items.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price), 0
      );
      
      expect(subtotal).toBe(550); // 200 + 150 + 200
    });

    it('should handle empty items', () => {
      const items: any[] = [];
      
      const subtotal = items.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price), 0
      );
      
      expect(subtotal).toBe(0);
    });

    it('should handle single item', () => {
      const items = [{ quantity: 5, unit_price: 100 }];
      
      const subtotal = items.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price), 0
      );
      
      expect(subtotal).toBe(500);
    });
  });

  describe('Discount Calculation / حساب الخصم', () => {
    it('should apply percentage discount', () => {
      const subtotal = 1000;
      const discountPercentage = 10;
      
      const discount = subtotal * (discountPercentage / 100);
      
      expect(discount).toBe(100);
    });

    it('should apply fixed discount', () => {
      const subtotal = 1000;
      const fixedDiscount = 150;
      
      const afterDiscount = subtotal - fixedDiscount;
      
      expect(afterDiscount).toBe(850);
    });

    it('should handle zero discount', () => {
      const subtotal = 1000;
      const discountPercentage = 0;
      
      const discount = subtotal * (discountPercentage / 100);
      
      expect(discount).toBe(0);
    });

    it('should not exceed subtotal', () => {
      const subtotal = 100;
      const discountPercentage = 150; // 150% - invalid
      
      const discount = Math.min(subtotal * (discountPercentage / 100), subtotal);
      
      expect(discount).toBe(100);
    });

    it('should apply item-level discount', () => {
      const item = { quantity: 2, unit_price: 100, discount_percentage: 10 };
      
      const itemTotal = item.quantity * item.unit_price;
      const discount = itemTotal * (item.discount_percentage / 100);
      const finalPrice = itemTotal - discount;
      
      expect(finalPrice).toBe(180);
    });
  });

  describe('Tax Calculation / حساب الضريبة', () => {
    it('should calculate VAT at 14%', () => {
      const subtotal = 1000;
      const vatRate = 14;
      
      const vat = subtotal * (vatRate / 100);
      
      expect(vat).toBe(140);
    });

    it('should calculate tax after discount', () => {
      const subtotal = 1000;
      const discount = 100;
      const vatRate = 14;
      
      const taxableAmount = subtotal - discount;
      const vat = taxableAmount * (vatRate / 100);
      
      expect(vat).toBe(126);
    });

    it('should handle tax-exempt', () => {
      const subtotal = 1000;
      const vatRate = 0;
      
      const vat = subtotal * (vatRate / 100);
      
      expect(vat).toBe(0);
    });
  });

  describe('Total Calculation / حساب الإجمالي', () => {
    it('should calculate total correctly', () => {
      const subtotal = 1000;
      const discount = 100;
      const tax = 126;
      
      const total = subtotal - discount + tax;
      
      expect(total).toBe(1026);
    });

    it('should handle full discount scenario', () => {
      const subtotal = 100;
      const discount = 100;
      const tax = 0;
      
      const total = subtotal - discount + tax;
      
      expect(total).toBe(0);
    });
  });

  describe('Decimal Precision / دقة الأرقام العشرية', () => {
    it('should handle floating point precision', () => {
      // Famous JS floating point issue: 0.1 + 0.2
      const a = 0.1;
      const b = 0.2;
      
      // Use toFixed for currency
      const result = Number((a + b).toFixed(2));
      
      expect(result).toBe(0.30);
    });

    it('should round to 2 decimal places', () => {
      const value = 123.456789;
      
      const rounded = Math.round(value * 100) / 100;
      
      expect(rounded).toBe(123.46);
    });

    it('should handle large numbers', () => {
      const subtotal = 9999999.99;
      const tax = subtotal * 0.14;
      
      const total = Number((subtotal + tax).toFixed(2));
      
      expect(total).toBe(11399999.99);
    });
  });
});

describe('Payment Calculations / حسابات المدفوعات', () => {
  describe('Remaining Balance / الرصيد المتبقي', () => {
    it('should calculate remaining balance', () => {
      const invoiceTotal = 1000;
      const paidAmount = 600;
      
      const remaining = invoiceTotal - paidAmount;
      
      expect(remaining).toBe(400);
    });

    it('should handle overpayment', () => {
      const invoiceTotal = 1000;
      const paidAmount = 1200;
      
      const remaining = invoiceTotal - paidAmount;
      
      expect(remaining).toBe(-200); // Credit
    });

    it('should handle full payment', () => {
      const invoiceTotal = 1000;
      const paidAmount = 1000;
      
      const remaining = invoiceTotal - paidAmount;
      
      expect(remaining).toBe(0);
    });
  });

  describe('Payment Status / حالة الدفع', () => {
    const getPaymentStatus = (total: number, paid: number) => {
      if (paid === 0) return 'pending';
      if (paid >= total) return 'paid';
      return 'partial';
    };

    it('should return pending for no payment', () => {
      expect(getPaymentStatus(1000, 0)).toBe('pending');
    });

    it('should return partial for partial payment', () => {
      expect(getPaymentStatus(1000, 500)).toBe('partial');
    });

    it('should return paid for full payment', () => {
      expect(getPaymentStatus(1000, 1000)).toBe('paid');
    });

    it('should return paid for overpayment', () => {
      expect(getPaymentStatus(1000, 1500)).toBe('paid');
    });
  });

  describe('Multiple Payments / مدفوعات متعددة', () => {
    it('should sum multiple payments', () => {
      const payments = [
        { amount: 300 },
        { amount: 200 },
        { amount: 100 },
      ];
      
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      
      expect(totalPaid).toBe(600);
    });

    it('should calculate remaining after multiple payments', () => {
      const invoiceTotal = 1000;
      const payments = [{ amount: 300 }, { amount: 200 }];
      
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = invoiceTotal - totalPaid;
      
      expect(remaining).toBe(500);
    });
  });
});

describe('Customer Balance / رصيد العميل', () => {
  describe('Balance Updates / تحديثات الرصيد', () => {
    it('should increase balance with invoice', () => {
      let customerBalance = 0;
      const invoiceTotal = 1000;
      
      customerBalance += invoiceTotal;
      
      expect(customerBalance).toBe(1000);
    });

    it('should decrease balance with payment', () => {
      let customerBalance = 1000;
      const paymentAmount = 400;
      
      customerBalance -= paymentAmount;
      
      expect(customerBalance).toBe(600);
    });

    it('should handle credit balance', () => {
      let customerBalance = 500;
      const paymentAmount = 700;
      
      customerBalance -= paymentAmount;
      
      expect(customerBalance).toBe(-200); // Customer has credit
    });
  });

  describe('Credit Limit / حد الائتمان', () => {
    it('should check credit limit', () => {
      const creditLimit = 5000;
      const currentBalance = 3000;
      const newInvoice = 2500;
      
      const withinLimit = (currentBalance + newInvoice) <= creditLimit;
      
      expect(withinLimit).toBe(false);
    });

    it('should allow transaction within limit', () => {
      const creditLimit = 5000;
      const currentBalance = 3000;
      const newInvoice = 1500;
      
      const withinLimit = (currentBalance + newInvoice) <= creditLimit;
      
      expect(withinLimit).toBe(true);
    });

    it('should calculate available credit', () => {
      const creditLimit = 5000;
      const currentBalance = 3000;
      
      const availableCredit = creditLimit - currentBalance;
      
      expect(availableCredit).toBe(2000);
    });
  });
});

describe('Supplier Balance / رصيد المورد', () => {
  describe('Balance Tracking / تتبع الرصيد', () => {
    it('should track purchase order balance', () => {
      let supplierBalance = 0;
      const purchaseTotal = 5000;
      
      supplierBalance += purchaseTotal;
      
      expect(supplierBalance).toBe(5000);
    });

    it('should reduce balance with payment', () => {
      let supplierBalance = 5000;
      const paymentToSupplier = 2000;
      
      supplierBalance -= paymentToSupplier;
      
      expect(supplierBalance).toBe(3000);
    });
  });
});

describe('Profit Margin / هامش الربح', () => {
  describe('Margin Calculation / حساب الهامش', () => {
    it('should calculate profit margin percentage', () => {
      const costPrice = 60;
      const sellingPrice = 100;
      
      const margin = ((sellingPrice - costPrice) / sellingPrice) * 100;
      
      expect(margin).toBe(40);
    });

    it('should calculate markup percentage', () => {
      const costPrice = 60;
      const sellingPrice = 100;
      
      const markup = ((sellingPrice - costPrice) / costPrice) * 100;
      
      expect(markup).toBeCloseTo(66.67, 1);
    });

    it('should handle zero cost', () => {
      const costPrice = 0;
      const sellingPrice = 100;
      
      const margin = costPrice === 0 ? 100 : ((sellingPrice - costPrice) / sellingPrice) * 100;
      
      expect(margin).toBe(100);
    });

    it('should calculate profit amount', () => {
      const costPrice = 60;
      const sellingPrice = 100;
      const quantity = 5;
      
      const profit = (sellingPrice - costPrice) * quantity;
      
      expect(profit).toBe(200);
    });
  });
});

describe('Role-Based Limits / الحدود المبنية على الأدوار', () => {
  const roleLimits = {
    sales: {
      max_discount_percentage: 15,
      max_invoice_amount: 50000,
      max_credit_limit: 10000,
    },
    admin: {
      max_discount_percentage: 100,
      max_invoice_amount: 999999999,
      max_credit_limit: 999999999,
    },
  };

  describe('Discount Limits / حدود الخصم', () => {
    it('should enforce sales discount limit', () => {
      const requestedDiscount = 20;
      const userRole = 'sales';
      const maxAllowed = roleLimits[userRole].max_discount_percentage;
      
      const canApply = requestedDiscount <= maxAllowed;
      
      expect(canApply).toBe(false);
    });

    it('should allow admin unlimited discount', () => {
      const requestedDiscount = 50;
      const userRole = 'admin';
      const maxAllowed = roleLimits[userRole].max_discount_percentage;
      
      const canApply = requestedDiscount <= maxAllowed;
      
      expect(canApply).toBe(true);
    });
  });

  describe('Invoice Amount Limits / حدود مبلغ الفاتورة', () => {
    it('should enforce invoice amount limit', () => {
      const invoiceAmount = 60000;
      const userRole = 'sales';
      const maxAllowed = roleLimits[userRole].max_invoice_amount;
      
      const canCreate = invoiceAmount <= maxAllowed;
      
      expect(canCreate).toBe(false);
    });
  });

  describe('Credit Limit Controls / التحكم في حد الائتمان', () => {
    it('should enforce credit limit setting', () => {
      const newCreditLimit = 15000;
      const userRole = 'sales';
      const maxAllowed = roleLimits[userRole].max_credit_limit;
      
      const canSet = newCreditLimit <= maxAllowed;
      
      expect(canSet).toBe(false);
    });
  });
});

describe('Aging Report Calculations / حسابات تقرير أعمار الديون', () => {
  describe('Age Buckets / فترات العمر', () => {
    const calculateAgeBucket = (dueDate: Date, today: Date) => {
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) return 'current';
      if (diffDays <= 30) return '1-30';
      if (diffDays <= 60) return '31-60';
      if (diffDays <= 90) return '61-90';
      return '90+';
    };

    it('should classify current invoice', () => {
      const dueDate = new Date('2024-02-01');
      const today = new Date('2024-01-15');
      
      expect(calculateAgeBucket(dueDate, today)).toBe('current');
    });

    it('should classify 1-30 days overdue', () => {
      const dueDate = new Date('2024-01-01');
      const today = new Date('2024-01-20');
      
      expect(calculateAgeBucket(dueDate, today)).toBe('1-30');
    });

    it('should classify 31-60 days overdue', () => {
      const dueDate = new Date('2024-01-01');
      const today = new Date('2024-02-15');
      
      expect(calculateAgeBucket(dueDate, today)).toBe('31-60');
    });

    it('should classify 90+ days overdue', () => {
      const dueDate = new Date('2024-01-01');
      const today = new Date('2024-05-01');
      
      expect(calculateAgeBucket(dueDate, today)).toBe('90+');
    });
  });
});
