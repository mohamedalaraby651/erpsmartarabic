/**
 * Security Functions Integration Tests
 * Q1 Enterprise Transformation - Foundation & Governance
 * 
 * Tests for check_section_permission and check_financial_limit functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
const mockRpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mockRpc,
    auth: {
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user-id', email: 'test@example.com' } } 
      })
    }
  }
}));

import { 
  verifyPermissionOnServer, 
  verifyFinancialLimit 
} from '@/lib/api/secureOperations';

describe('Security Functions Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('check_section_permission via verifyPermissionOnServer', () => {
    it('should return true for admin on any section', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const result = await verifyPermissionOnServer('invoices', 'create');

      expect(mockRpc).toHaveBeenCalledWith('check_section_permission', {
        _user_id: 'test-user-id',
        _section: 'invoices',
        _action: 'create'
      });
      expect(result).toBe(true);
    });

    it('should return true when permission is granted', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const result = await verifyPermissionOnServer('products', 'view');

      expect(result).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      mockRpc.mockResolvedValueOnce({ data: false, error: null });

      const result = await verifyPermissionOnServer('employees', 'delete');

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

      const result = await verifyPermissionOnServer('customers', 'edit');

      expect(result).toBe(false);
    });

    it('should check different actions correctly', async () => {
      // Test view action
      mockRpc.mockResolvedValueOnce({ data: true, error: null });
      await verifyPermissionOnServer('payments', 'view');
      expect(mockRpc).toHaveBeenLastCalledWith('check_section_permission', 
        expect.objectContaining({ _action: 'view' })
      );

      // Test create action
      mockRpc.mockResolvedValueOnce({ data: true, error: null });
      await verifyPermissionOnServer('payments', 'create');
      expect(mockRpc).toHaveBeenLastCalledWith('check_section_permission', 
        expect.objectContaining({ _action: 'create' })
      );

      // Test edit action
      mockRpc.mockResolvedValueOnce({ data: true, error: null });
      await verifyPermissionOnServer('payments', 'edit');
      expect(mockRpc).toHaveBeenLastCalledWith('check_section_permission', 
        expect.objectContaining({ _action: 'edit' })
      );

      // Test delete action
      mockRpc.mockResolvedValueOnce({ data: true, error: null });
      await verifyPermissionOnServer('payments', 'delete');
      expect(mockRpc).toHaveBeenLastCalledWith('check_section_permission', 
        expect.objectContaining({ _action: 'delete' })
      );
    });

    it('should check different sections correctly', async () => {
      const sections = [
        'invoices', 'payments', 'customers', 'products', 
        'inventory', 'expenses', 'quotations', 'sales_orders'
      ];

      for (const section of sections) {
        mockRpc.mockResolvedValueOnce({ data: true, error: null });
        await verifyPermissionOnServer(section, 'view');
        expect(mockRpc).toHaveBeenLastCalledWith('check_section_permission', 
          expect.objectContaining({ _section: section })
        );
      }
    });
  });

  describe('check_financial_limit via verifyFinancialLimit', () => {
    it('should return true for admin (unlimited amounts)', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const result = await verifyFinancialLimit('invoice', 1000000);

      expect(mockRpc).toHaveBeenCalledWith('check_financial_limit', {
        _user_id: 'test-user-id',
        _limit_type: 'invoice',
        _value: 1000000
      });
      expect(result).toBe(true);
    });

    it('should return true when amount is within limit', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const result = await verifyFinancialLimit('discount', 15);

      expect(result).toBe(true);
    });

    it('should return false when amount exceeds limit', async () => {
      mockRpc.mockResolvedValueOnce({ data: false, error: null });

      const result = await verifyFinancialLimit('invoice', 500000);

      expect(result).toBe(false);
    });

    it('should check different limit types', async () => {
      // Discount limit
      mockRpc.mockResolvedValueOnce({ data: true, error: null });
      await verifyFinancialLimit('discount', 10);
      expect(mockRpc).toHaveBeenLastCalledWith('check_financial_limit', 
        expect.objectContaining({ _limit_type: 'discount' })
      );

      // Credit limit
      mockRpc.mockResolvedValueOnce({ data: true, error: null });
      await verifyFinancialLimit('credit', 50000);
      expect(mockRpc).toHaveBeenLastCalledWith('check_financial_limit', 
        expect.objectContaining({ _limit_type: 'credit' })
      );

      // Invoice limit
      mockRpc.mockResolvedValueOnce({ data: true, error: null });
      await verifyFinancialLimit('invoice', 100000);
      expect(mockRpc).toHaveBeenLastCalledWith('check_financial_limit', 
        expect.objectContaining({ _limit_type: 'invoice' })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

      const result = await verifyFinancialLimit('invoice', 1000);

      expect(result).toBe(false);
    });

    it('should handle edge cases for amounts', async () => {
      // Zero amount
      mockRpc.mockResolvedValueOnce({ data: true, error: null });
      await verifyFinancialLimit('invoice', 0);
      expect(mockRpc).toHaveBeenLastCalledWith('check_financial_limit', 
        expect.objectContaining({ _value: 0 })
      );

      // Very large amount
      mockRpc.mockResolvedValueOnce({ data: false, error: null });
      const result = await verifyFinancialLimit('invoice', 999999999);
      expect(result).toBe(false);
    });
  });
});
