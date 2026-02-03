/**
 * Edge Function Security Tests
 * Q1 Enterprise Transformation - Foundation & Governance
 * 
 * Tests for Edge Function authentication and authorization flows
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase functions - must use inline function for hoisting
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
    },
    rpc: vi.fn().mockResolvedValue({ data: true })
  }
}));

import { supabase } from '@/integrations/supabase/client';
import { 
  validateInvoice, 
  processPayment, 
  approveExpense, 
  processStockMovement,
  getErrorMessage 
} from '@/lib/api/secureOperations';

// Get the mocked invoke function
const mockInvoke = vi.mocked(supabase.functions.invoke);

describe('Edge Function Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateInvoice', () => {
    it('should call validate-invoice edge function', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { valid: true, message: 'Validation passed' },
        error: null
      });

      const result = await validateInvoice({
        customer_id: 'customer-123',
        total_amount: 1000,
        items: [{ product_id: 'prod-1', quantity: 2, unit_price: 500 }]
      });

      expect(mockInvoke).toHaveBeenCalledWith('validate-invoice', {
        body: {
          invoice_data: {
            customer_id: 'customer-123',
            total_amount: 1000,
            items: [{ product_id: 'prod-1', quantity: 2, unit_price: 500 }]
          }
        }
      });
      expect(result.valid).toBe(true);
    });

    it('should handle permission denied error', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { valid: false, error: 'Permission denied', code: 'NO_PERMISSION' },
        error: null
      });

      const result = await validateInvoice({
        customer_id: 'customer-123',
        total_amount: 1000
      });

      expect(result.valid).toBe(false);
      expect(result.code).toBe('NO_PERMISSION');
    });

    it('should handle financial limit exceeded error', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { 
          valid: false, 
          error: 'Invoice amount exceeds limit', 
          code: 'LIMIT_EXCEEDED',
          details: { requested_amount: 100000 }
        },
        error: null
      });

      const result = await validateInvoice({
        customer_id: 'customer-123',
        total_amount: 100000
      });

      expect(result.valid).toBe(false);
      expect(result.code).toBe('LIMIT_EXCEEDED');
    });

    it('should handle network errors gracefully', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error' }
      });

      const result = await validateInvoice({
        customer_id: 'customer-123',
        total_amount: 1000
      });

      expect(result.valid).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('processPayment', () => {
    it('should call process-payment edge function', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { 
          success: true, 
          payment_id: 'pay-123',
          details: { customer_new_balance: 5000 }
        },
        error: null
      });

      const result = await processPayment({
        customer_id: 'customer-123',
        amount: 1000,
        payment_method: 'cash',
        payment_number: 'PAY-001'
      });

      expect(mockInvoke).toHaveBeenCalledWith('process-payment', {
        body: {
          payment_data: {
            customer_id: 'customer-123',
            amount: 1000,
            payment_method: 'cash',
            payment_number: 'PAY-001'
          }
        }
      });
      expect(result.success).toBe(true);
      expect(result.data?.payment_id).toBe('pay-123');
    });

    it('should handle amount exceeds invoice balance', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { 
          success: false, 
          error: 'Payment amount exceeds invoice balance',
          code: 'AMOUNT_EXCEEDS_BALANCE',
          details: { remaining: 500, requested: 1000 }
        },
        error: null
      });

      const result = await processPayment({
        customer_id: 'customer-123',
        invoice_id: 'inv-123',
        amount: 1000,
        payment_method: 'cash',
        payment_number: 'PAY-001'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('AMOUNT_EXCEEDS_BALANCE');
    });
  });

  describe('approveExpense', () => {
    it('should call approve-expense edge function for approval', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { 
          success: true, 
          message: 'تمت الموافقة على المصروف بنجاح',
          details: { new_status: 'approved' }
        },
        error: null
      });

      const result = await approveExpense({
        expense_id: 'exp-123',
        action: 'approve'
      });

      expect(mockInvoke).toHaveBeenCalledWith('approve-expense', {
        body: {
          expense_id: 'exp-123',
          action: 'approve'
        }
      });
      expect(result.success).toBe(true);
    });

    it('should require rejection reason for reject action', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { 
          success: false, 
          error: 'Rejection reason is required',
          code: 'MISSING_REASON'
        },
        error: null
      });

      const result = await approveExpense({
        expense_id: 'exp-123',
        action: 'reject'
        // missing rejection_reason
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('MISSING_REASON');
    });

    it('should handle self-approval prevention', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { 
          success: false, 
          error: 'Cannot approve your own expense',
          code: 'SELF_APPROVAL'
        },
        error: null
      });

      const result = await approveExpense({
        expense_id: 'exp-123',
        action: 'approve'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('SELF_APPROVAL');
    });
  });

  describe('processStockMovement', () => {
    it('should call stock-movement edge function', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { 
          success: true, 
          movement_id: 'mov-123',
          details: { new_stock: 100 }
        },
        error: null
      });

      const result = await processStockMovement({
        product_id: 'prod-123',
        movement_type: 'in',
        quantity: 50,
        to_warehouse_id: 'wh-123'
      });

      expect(mockInvoke).toHaveBeenCalledWith('stock-movement', {
        body: {
          movement_data: {
            product_id: 'prod-123',
            movement_type: 'in',
            quantity: 50,
            to_warehouse_id: 'wh-123'
          }
        }
      });
      expect(result.success).toBe(true);
      expect(result.data?.movement_id).toBe('mov-123');
    });

    it('should handle insufficient stock error', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { 
          success: false, 
          error: 'Insufficient stock',
          code: 'INSUFFICIENT_STOCK',
          details: { available: 10, requested: 50 }
        },
        error: null
      });

      const result = await processStockMovement({
        product_id: 'prod-123',
        movement_type: 'out',
        quantity: 50,
        from_warehouse_id: 'wh-123'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('getErrorMessage', () => {
    it('should return Arabic error messages for known codes', () => {
      expect(getErrorMessage('UNAUTHORIZED')).toBe('يجب تسجيل الدخول للقيام بهذا الإجراء');
      expect(getErrorMessage('NO_PERMISSION')).toBe('ليس لديك صلاحية للقيام بهذا الإجراء');
      expect(getErrorMessage('LIMIT_EXCEEDED')).toBe('المبلغ يتجاوز الحد المسموح لك');
      expect(getErrorMessage('CREDIT_LIMIT_EXCEEDED')).toBe('تم تجاوز الحد الائتماني للعميل');
      expect(getErrorMessage('INSUFFICIENT_STOCK')).toBe('الكمية المطلوبة غير متوفرة في المخزون');
      expect(getErrorMessage('SELF_APPROVAL')).toBe('لا يمكنك الموافقة على مصروفاتك الخاصة');
    });

    it('should return default message for unknown codes', () => {
      expect(getErrorMessage('UNKNOWN_CODE')).toBe('حدث خطأ غير متوقع');
    });
  });
});
