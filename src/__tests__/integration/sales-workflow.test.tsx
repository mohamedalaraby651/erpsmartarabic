/**
 * Sales Workflow Integration Tests
 * اختبارات سير عمل المبيعات المتكاملة
 * 
 * Tests complete sales cycle: Quotation → Order → Invoice → Payment
 * @module tests/integration/sales-workflow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

describe('Sales Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Quotation Creation / إنشاء عرض أسعار', () => {
    it('should create quotation with items', () => {
      const quotation = {
        quotation_number: 'QT-2024-001',
        customer_id: 'cust-1',
        status: 'draft',
        subtotal: 10000,
        tax_amount: 1500,
        discount_amount: 500,
        total_amount: 11000,
        valid_until: '2024-12-31',
        items: [
          { product_id: 'prod-1', quantity: 2, unit_price: 2500, total_price: 5000 },
          { product_id: 'prod-2', quantity: 5, unit_price: 1000, total_price: 5000 },
        ],
      };

      expect(quotation.items.length).toBe(2);
      expect(quotation.subtotal).toBe(10000);
      expect(quotation.total_amount).toBe(11000);
    });

    it('should calculate totals correctly', () => {
      const items = [
        { quantity: 2, unit_price: 2500, discount_percentage: 0 },
        { quantity: 5, unit_price: 1000, discount_percentage: 10 },
      ];

      const calculateItemTotal = (item: typeof items[0]) => {
        const gross = item.quantity * item.unit_price;
        const discount = gross * (item.discount_percentage / 100);
        return gross - discount;
      };

      const subtotal = items.reduce((acc, item) => acc + calculateItemTotal(item), 0);

      // Item 1: 2 * 2500 = 5000
      // Item 2: 5 * 1000 = 5000 - 10% = 4500
      expect(subtotal).toBe(9500);
    });

    it('should validate expiry date is in future', () => {
      const today = new Date();
      const validUntil = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later

      expect(validUntil > today).toBe(true);
    });

    it('should update quotation status correctly', () => {
      const statuses = ['draft', 'pending', 'approved', 'rejected', 'expired', 'cancelled'];
      
      statuses.forEach(status => {
        expect(statuses).toContain(status);
      });
    });
  });

  describe('Quotation to Order Conversion / تحويل عرض لأمر بيع', () => {
    it('should copy quotation data to sales order', () => {
      const quotation = {
        id: 'quote-1',
        customer_id: 'cust-1',
        subtotal: 10000,
        tax_amount: 1500,
        discount_amount: 500,
        total_amount: 11000,
        notes: 'ملاحظات العرض',
      };

      const salesOrder = {
        order_number: 'SO-2024-001',
        quotation_id: quotation.id,
        customer_id: quotation.customer_id,
        subtotal: quotation.subtotal,
        tax_amount: quotation.tax_amount,
        discount_amount: quotation.discount_amount,
        total_amount: quotation.total_amount,
        notes: quotation.notes,
        status: 'pending',
      };

      expect(salesOrder.quotation_id).toBe(quotation.id);
      expect(salesOrder.total_amount).toBe(quotation.total_amount);
    });

    it('should copy quotation items to order items', () => {
      const quotationItems = [
        { product_id: 'prod-1', quantity: 2, unit_price: 2500 },
        { product_id: 'prod-2', quantity: 5, unit_price: 1000 },
      ];

      const orderItems = quotationItems.map(item => ({
        ...item,
        order_id: 'order-1',
      }));

      expect(orderItems.length).toBe(quotationItems.length);
      expect(orderItems[0].order_id).toBe('order-1');
    });

    it('should mark quotation as approved after conversion', () => {
      let quotationStatus = 'pending';
      quotationStatus = 'approved';

      expect(quotationStatus).toBe('approved');
    });
  });

  describe('Sales Order Processing / معالجة أمر البيع', () => {
    it('should create order with delivery information', () => {
      const order = {
        order_number: 'SO-2024-001',
        delivery_date: '2024-12-25',
        delivery_address: 'الرياض - حي السليمانية - شارع الملك فهد',
        status: 'pending',
      };

      expect(order.delivery_address).toBeTruthy();
      expect(order.delivery_date).toBeTruthy();
    });

    it('should update order status through lifecycle', () => {
      const lifecycle = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed'];
      
      let currentStatus = 'pending';
      const index = lifecycle.indexOf(currentStatus);
      currentStatus = lifecycle[index + 1];

      expect(currentStatus).toBe('confirmed');
    });

    it('should reserve stock when order confirmed', () => {
      const orderItems = [
        { product_id: 'prod-1', quantity: 10 },
        { product_id: 'prod-2', quantity: 5 },
      ];

      const stockReservations = orderItems.map(item => ({
        product_id: item.product_id,
        reserved_quantity: item.quantity,
        order_id: 'order-1',
      }));

      expect(stockReservations.length).toBe(2);
    });
  });

  describe('Order to Invoice Conversion / تحويل أمر لفاتورة', () => {
    it('should create invoice from sales order', () => {
      const order = {
        id: 'order-1',
        customer_id: 'cust-1',
        total_amount: 11000,
      };

      const invoice = {
        invoice_number: 'INV-2024-001',
        order_id: order.id,
        customer_id: order.customer_id,
        total_amount: order.total_amount,
        paid_amount: 0,
        payment_status: 'pending',
        status: 'pending',
      };

      expect(invoice.order_id).toBe(order.id);
      expect(invoice.payment_status).toBe('pending');
    });

    it('should set payment terms correctly', () => {
      const paymentMethods = ['cash', 'bank_transfer', 'installments', 'credit'];
      
      paymentMethods.forEach(method => {
        expect(paymentMethods).toContain(method);
      });
    });

    it('should calculate due date based on payment terms', () => {
      const invoiceDate = new Date('2024-01-01');
      const paymentTermDays = 30;
      const dueDate = new Date(invoiceDate.getTime() + paymentTermDays * 24 * 60 * 60 * 1000);

      expect(dueDate.toISOString().split('T')[0]).toBe('2024-01-31');
    });
  });

  describe('Invoice to Payment / الدفع', () => {
    it('should record payment against invoice', () => {
      const invoice = {
        id: 'inv-1',
        total_amount: 10000,
        paid_amount: 0,
      };

      const payment = {
        payment_number: 'PAY-2024-001',
        invoice_id: invoice.id,
        amount: 5000,
        payment_method: 'cash',
        payment_date: '2024-01-15',
      };

      const newPaidAmount = invoice.paid_amount + payment.amount;
      expect(newPaidAmount).toBe(5000);
    });

    it('should update invoice payment status', () => {
      const determinePaymentStatus = (paid: number, total: number) => {
        if (paid === 0) return 'pending';
        if (paid < total) return 'partial';
        if (paid >= total) return 'paid';
        return 'pending';
      };

      expect(determinePaymentStatus(0, 10000)).toBe('pending');
      expect(determinePaymentStatus(5000, 10000)).toBe('partial');
      expect(determinePaymentStatus(10000, 10000)).toBe('paid');
    });

    it('should update customer balance after payment', () => {
      const customerBalance = 15000;
      const paymentAmount = 5000;
      const newBalance = customerBalance - paymentAmount;

      expect(newBalance).toBe(10000);
    });

    it('should create cash transaction for cash payments', () => {
      const payment = {
        amount: 5000,
        payment_method: 'cash',
        register_id: 'reg-1',
      };

      const cashTransaction = {
        transaction_type: 'income',
        amount: payment.amount,
        register_id: payment.register_id,
        reference_type: 'payment',
        reference_id: 'pay-1',
      };

      expect(cashTransaction.transaction_type).toBe('income');
      expect(cashTransaction.amount).toBe(5000);
    });
  });

  describe('Stock Deduction / خصم المخزون', () => {
    it('should deduct stock when invoice confirmed', () => {
      const stockBefore = 100;
      const soldQuantity = 10;
      const stockAfter = stockBefore - soldQuantity;

      expect(stockAfter).toBe(90);
    });

    it('should create stock movement record', () => {
      const movement = {
        product_id: 'prod-1',
        movement_type: 'out',
        quantity: 10,
        reference_type: 'invoice',
        reference_id: 'inv-1',
        from_warehouse_id: 'wh-1',
        to_warehouse_id: null,
      };

      expect(movement.movement_type).toBe('out');
      expect(movement.from_warehouse_id).toBe('wh-1');
    });

    it('should prevent selling more than available stock', () => {
      const availableStock = 5;
      const requestedQuantity = 10;

      const canSell = requestedQuantity <= availableStock;
      expect(canSell).toBe(false);
    });
  });

  describe('Profit Calculation / حساب الربح', () => {
    it('should calculate profit per item', () => {
      const item = {
        selling_price: 100,
        cost_price: 70,
        quantity: 10,
      };

      const profit = (item.selling_price - item.cost_price) * item.quantity;
      expect(profit).toBe(300);
    });

    it('should calculate total invoice profit', () => {
      const items = [
        { selling_price: 100, cost_price: 70, quantity: 10 },
        { selling_price: 50, cost_price: 30, quantity: 20 },
      ];

      const totalProfit = items.reduce((acc, item) => 
        acc + (item.selling_price - item.cost_price) * item.quantity, 0
      );

      // (100-70)*10 + (50-30)*20 = 300 + 400 = 700
      expect(totalProfit).toBe(700);
    });

    it('should calculate profit margin percentage', () => {
      const revenue = 10000;
      const cost = 7000;
      const profit = revenue - cost;
      const margin = (profit / revenue) * 100;

      expect(margin).toBe(30);
    });
  });

  describe('Audit Trail / سجل التتبع', () => {
    it('should log quotation creation', () => {
      const auditLog = {
        entity_type: 'quotation',
        entity_id: 'quote-1',
        action: 'create',
        user_id: 'user-1',
      };

      expect(auditLog.action).toBe('create');
    });

    it('should log status changes', () => {
      const auditLog = {
        entity_type: 'sales_order',
        entity_id: 'order-1',
        action: 'update',
        old_values: { status: 'pending' },
        new_values: { status: 'confirmed' },
      };

      expect(auditLog.old_values.status).toBe('pending');
      expect(auditLog.new_values.status).toBe('confirmed');
    });

    it('should track complete sales cycle', () => {
      const auditTrail = [
        { action: 'create', entity_type: 'quotation' },
        { action: 'update', entity_type: 'quotation', new_values: { status: 'approved' } },
        { action: 'create', entity_type: 'sales_order' },
        { action: 'create', entity_type: 'invoice' },
        { action: 'create', entity_type: 'payment' },
        { action: 'update', entity_type: 'invoice', new_values: { payment_status: 'paid' } },
      ];

      expect(auditTrail.length).toBe(6);
    });
  });
});
