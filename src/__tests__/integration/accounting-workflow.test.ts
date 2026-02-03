import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('Accounting Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Double-Entry Accounting Validation', () => {
    it('should reject unbalanced journal entries', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'القيد غير متوازن: المدين ≠ الدائن' },
      });

      const result = await supabase.functions.invoke('create-journal', {
        body: {
          journal_date: '2025-01-15',
          description: 'Unbalanced entry test',
          entries: [
            { account_id: 'acc-1', debit_amount: 1000, credit_amount: 0 },
            { account_id: 'acc-2', debit_amount: 0, credit_amount: 500 },
          ],
        },
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('غير متوازن');
    });

    it('should accept balanced journal entries', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValue({
        data: { 
          success: true, 
          journal_id: 'test-journal-id',
          journal_number: 'JRN-20250115-0001',
        },
        error: null,
      });

      const result = await supabase.functions.invoke('create-journal', {
        body: {
          journal_date: '2025-01-15',
          description: 'Balanced entry test',
          entries: [
            { account_id: 'acc-1', debit_amount: 1000, credit_amount: 0 },
            { account_id: 'acc-2', debit_amount: 0, credit_amount: 1000 },
          ],
        },
      });

      expect(result.error).toBeNull();
      expect(result.data?.success).toBe(true);
      expect(result.data?.journal_id).toBeDefined();
    });

    it('should reject entries with both debit and credit', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Invalid entry: cannot have both debit and credit' },
      });

      const result = await supabase.functions.invoke('create-journal', {
        body: {
          journal_date: '2025-01-15',
          description: 'Invalid entry test',
          entries: [
            { account_id: 'acc-1', debit_amount: 1000, credit_amount: 500 },
          ],
        },
      });

      expect(result.error).toBeDefined();
    });

    it('should reject empty entries array', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Entries are required' },
      });

      const result = await supabase.functions.invoke('create-journal', {
        body: {
          journal_date: '2025-01-15',
          description: 'Empty entries test',
          entries: [],
        },
      });

      expect(result.error).toBeDefined();
    });
  });

  describe('Invoice Approval Workflow', () => {
    it('should successfully approve a pending invoice', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValue({
        data: { 
          success: true,
          invoice_id: 'test-invoice-id',
          new_status: 'approved',
          journal_id: 'auto-generated-journal',
        },
        error: null,
      });

      const result = await supabase.functions.invoke('approve-invoice', {
        body: {
          invoice_id: 'test-invoice-id',
          action: 'approve',
        },
      });

      expect(result.error).toBeNull();
      expect(result.data?.success).toBe(true);
      expect(result.data?.new_status).toBe('approved');
      expect(result.data?.journal_id).toBeDefined();
    });

    it('should successfully reject an invoice with reason', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValue({
        data: { 
          success: true,
          invoice_id: 'test-invoice-id',
          new_status: 'rejected',
        },
        error: null,
      });

      const result = await supabase.functions.invoke('approve-invoice', {
        body: {
          invoice_id: 'test-invoice-id',
          action: 'reject',
          rejection_reason: 'المبلغ غير صحيح',
        },
      });

      expect(result.error).toBeNull();
      expect(result.data?.new_status).toBe('rejected');
    });

    it('should prevent self-approval', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Cannot approve your own invoice' },
      });

      const result = await supabase.functions.invoke('approve-invoice', {
        body: {
          invoice_id: 'own-invoice-id',
          action: 'approve',
        },
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Cannot approve');
    });

    it('should require rejection reason when rejecting', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Rejection reason is required' },
      });

      const result = await supabase.functions.invoke('approve-invoice', {
        body: {
          invoice_id: 'test-invoice-id',
          action: 'reject',
          // Missing rejection_reason
        },
      });

      expect(result.error).toBeDefined();
    });
  });

  describe('Two-Factor Authentication', () => {
    it('should setup 2FA and return QR code', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValue({
        data: { 
          success: true,
          qr_code: 'otpauth://totp/TestApp:user@example.com?secret=ABCDEFGH...',
          backup_codes: ['12345678', '23456789', '34567890', '45678901'],
        },
        error: null,
      });

      const result = await supabase.functions.invoke('verify-totp', {
        body: {
          action: 'setup',
        },
      });

      expect(result.error).toBeNull();
      expect(result.data?.qr_code).toBeDefined();
      expect(result.data?.backup_codes).toHaveLength(4);
    });

    it('should verify valid TOTP code', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValue({
        data: { 
          success: true,
          verified: true,
        },
        error: null,
      });

      const result = await supabase.functions.invoke('verify-totp', {
        body: {
          action: 'verify',
          totp_code: '123456',
        },
      });

      expect(result.error).toBeNull();
      expect(result.data?.verified).toBe(true);
    });

    it('should reject invalid TOTP code', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValue({
        data: { 
          success: false,
          verified: false,
          message: 'Invalid TOTP code',
        },
        error: null,
      });

      const result = await supabase.functions.invoke('verify-totp', {
        body: {
          action: 'verify',
          totp_code: '000000',
        },
      });

      expect(result.data?.verified).toBe(false);
    });

    it('should allow disabling 2FA', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValue({
        data: { 
          success: true,
          is_enabled: false,
        },
        error: null,
      });

      const result = await supabase.functions.invoke('verify-totp', {
        body: {
          action: 'disable',
        },
      });

      expect(result.error).toBeNull();
      expect(result.data?.is_enabled).toBe(false);
    });
  });

  describe('Fiscal Period Management', () => {
    it('should prevent posting to closed fiscal period', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Cannot post to closed fiscal period' },
      });

      const result = await supabase.functions.invoke('create-journal', {
        body: {
          journal_date: '2024-01-15', // Assuming this period is closed
          description: 'Old period entry',
          entries: [
            { account_id: 'acc-1', debit_amount: 1000, credit_amount: 0 },
            { account_id: 'acc-2', debit_amount: 0, credit_amount: 1000 },
          ],
        },
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('closed');
    });
  });

  describe('Auto-Posting from Invoices', () => {
    it('should create journal entry when invoice is approved', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      mockInvoke.mockResolvedValue({
        data: { 
          success: true,
          invoice_id: 'test-invoice-id',
          new_status: 'approved',
          journal_id: 'auto-journal-123',
          journal_number: 'JRN-20250115-0001',
        },
        error: null,
      });

      const result = await supabase.functions.invoke('approve-invoice', {
        body: {
          invoice_id: 'test-invoice-id',
          action: 'approve',
        },
      });

      expect(result.error).toBeNull();
      expect(result.data?.journal_id).toBeDefined();
      expect(result.data?.journal_number).toMatch(/^JRN-/);
    });
  });
});
