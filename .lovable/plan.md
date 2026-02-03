

# 📋 خطة تنفيذ Q2: Enterprise Finance Core
## Q2 Implementation Plan - Enterprise Finance Core

---

## 📊 تقييم الوضع الحالي (Current State Assessment)

### ✅ Q1 - Foundation & Governance: COMPLETE

| Component | Status | Evidence |
|-----------|--------|----------|
| Security Functions | ✅ 100% | 3 SQL functions deployed |
| Edge Functions | ✅ 100% | 4 functions (27 tests passing) |
| RLS Policies | ✅ 100% | 52 tables with 120+ policies |
| Forms Integration | ✅ 100% | 8/8 forms with server-side checks |
| Testing | ✅ 100% | 850+ tests at 100% pass rate |
| Documentation | ✅ 100% | Q1_COMPLETION_REPORT.md created |
| Supabase Linter | ✅ 0 issues | Clean security baseline |

### 📂 Current Database Tables: 52 tables
### 📁 Current Edge Functions: 4 (validate-invoice, process-payment, approve-expense, stock-movement)

---

## 🎯 Q2 Objectives

```text
Q2: Enterprise Finance Core
├── 2.1 Double-Entry Accounting System
│   ├── chart_of_accounts table
│   ├── fiscal_periods table
│   ├── journals table
│   ├── journal_entries table
│   ├── create-journal Edge Function
│   └── Auto-posting from invoices/payments
│
├── 2.2 Two-Factor Authentication (2FA)
│   ├── user_2fa_settings table
│   ├── verify-totp Edge Function
│   ├── TwoFactorSetup.tsx component
│   └── TwoFactorVerify.tsx component
│
└── 2.3 Invoice Approval Workflow
    ├── Approval status columns on invoices
    ├── approve-invoice Edge Function
    └── Approval UI components
```

---

## 📋 Implementation Plan

### Phase 2.1: Double-Entry Accounting System
**Estimated Duration: 10-12 hours | Priority: P0 - Critical**

#### 2.1.1 Database Schema (Migration)

**New Tables:**

1. **chart_of_accounts** - شجرة الحسابات
   - id, code (unique), name, name_en
   - account_type ENUM (asset, liability, equity, revenue, expense)
   - parent_id (self-reference for hierarchy)
   - normal_balance ENUM (debit, credit)
   - current_balance DECIMAL(15,2)
   - is_active, description, created_at, updated_at

2. **fiscal_periods** - الفترات المالية
   - id, name, start_date, end_date
   - is_closed (boolean), closed_at, closed_by
   - CHECK constraint: end_date > start_date

3. **journals** - اليوميات/القيود
   - id, fiscal_period_id (FK)
   - journal_number (unique sequence)
   - journal_date, description
   - is_posted, posted_at, created_by
   - source_type (invoice/payment/expense/manual)
   - source_id (reference to source document)
   - total_debit, total_credit

4. **journal_entries** - بنود القيود
   - id, journal_id (FK)
   - account_id (FK to chart_of_accounts)
   - line_number
   - debit_amount, credit_amount (mutually exclusive)
   - memo
   - CHECK: (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)

**RLS Policies:**
- chart_of_accounts: Everyone views, admin/accountant manages
- fiscal_periods: Everyone views, admin only closes
- journals: Strict - accountant/admin only
- journal_entries: Inherits from journals

**Auto-Generated Sequences:**
- JRN-YYYYMMDD-XXXX for journal_number

#### 2.1.2 Edge Function: create-journal

**Purpose:** Create balanced journal entries with validation

**Validations:**
1. Fiscal period is open
2. Total debit = Total credit (mandatory balance)
3. All accounts exist and are active
4. User has accountant/admin role
5. No posting to closed periods

**Flow:**
```text
Input: journal_date, description, entries[]
  ↓
Validate fiscal period open
  ↓
Validate entries balance (debit = credit)
  ↓
Create journal record
  ↓
Create journal_entries
  ↓
Update account balances (if posted)
  ↓
Return journal_id
```

#### 2.1.3 Auto-Posting Logic

**Invoice Creation (when approved):**
```text
DR: Accounts Receivable (حساب العميل)     [total_amount]
CR: Sales Revenue (إيرادات المبيعات)      [subtotal]
CR: VAT Payable (ضريبة مستحقة)           [tax_amount]
```

**Payment Receipt:**
```text
DR: Cash/Bank (النقدية/البنك)             [amount]
CR: Accounts Receivable (حساب العميل)     [amount]
```

**Expense Approval:**
```text
DR: Expense Account (حساب المصروف)        [amount]
CR: Cash/Bank or Payable                  [amount]
```

#### 2.1.4 Frontend Components

**New Pages:**
- `src/pages/accounting/ChartOfAccountsPage.tsx` - Tree view of accounts
- `src/pages/accounting/JournalEntriesPage.tsx` - Journal list with filters
- `src/pages/accounting/FiscalPeriodsPage.tsx` - Period management
- `src/pages/accounting/TrialBalancePage.tsx` - Reporting view

**New Components:**
- `src/components/accounting/AccountTreeView.tsx`
- `src/components/accounting/JournalFormDialog.tsx`
- `src/components/accounting/JournalEntryLine.tsx`
- `src/components/accounting/FiscalPeriodFormDialog.tsx`

---

### Phase 2.2: Two-Factor Authentication (2FA)
**Estimated Duration: 5-6 hours | Priority: P1 - High**

#### 2.2.1 Database Schema

**New Table: user_2fa_settings**
- id, user_id (unique FK to auth.users)
- is_enabled (boolean default false)
- secret_key (encrypted TOTP secret)
- backup_codes (text array, encrypted)
- enabled_at, last_used_at
- created_at

**RLS Policy:**
- User can only view/update their own 2FA settings

#### 2.2.2 Edge Function: verify-totp

**Purpose:** Verify TOTP code and issue session

**Flow:**
```text
Input: user_id, totp_code
  ↓
Fetch user's secret_key
  ↓
Verify TOTP using algorithm
  ↓
Update last_used_at
  ↓
Return verification result
```

**Implementation Note:** 
- Use TOTP algorithm directly (no external library in Deno)
- 30-second window with 1 step tolerance
- Base32 encoding for secret

#### 2.2.3 Edge Function: setup-2fa

**Purpose:** Generate and store 2FA secret

**Flow:**
```text
Generate random secret (Base32)
  ↓
Generate QR code data (otpauth URL)
  ↓
Generate backup codes (8 codes)
  ↓
Store encrypted in database
  ↓
Return QR data + backup codes
```

#### 2.2.4 Frontend Components

**New Components:**
- `src/components/auth/TwoFactorSetup.tsx`
  - Display QR code for authenticator app
  - Show backup codes (one-time display)
  - Verify code before enabling

- `src/components/auth/TwoFactorVerify.tsx`
  - 6-digit OTP input
  - Backup code option
  - Remember device option (optional)

- `src/hooks/useTwoFactor.ts`
  - Check if 2FA is enabled
  - Manage 2FA flow state
  - Handle verification

**Auth Flow Modification:**
```text
Login (email/password)
  ↓
Check 2FA enabled?
  ├── No → Redirect to Dashboard
  └── Yes → Show TwoFactorVerify
              ↓
            Verify code
              ↓
            Redirect to Dashboard
```

---

### Phase 2.3: Invoice Approval Workflow
**Estimated Duration: 4-5 hours | Priority: P1 - High**

#### 2.3.1 Database Modifications

**Add columns to invoices table:**
```sql
ALTER TABLE invoices ADD COLUMN approval_status TEXT DEFAULT 'draft';
-- Values: draft, pending, approved, rejected

ALTER TABLE invoices ADD COLUMN submitted_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN approved_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN approved_by UUID REFERENCES auth.users(id);
ALTER TABLE invoices ADD COLUMN rejection_reason TEXT;
```

#### 2.3.2 Edge Function: approve-invoice

**Purpose:** Handle invoice approval workflow

**Validations:**
1. User is admin or accountant
2. Invoice exists and is in 'pending' status
3. User is not the invoice creator (prevent self-approval)

**Actions on Approval:**
1. Update approval_status to 'approved'
2. Set approved_at and approved_by
3. Create accounting journal entry (auto-posting)
4. Log activity

**Actions on Rejection:**
1. Update approval_status to 'rejected'
2. Set rejection_reason
3. Log activity

#### 2.3.3 Frontend Changes

**InvoicesPage.tsx Modifications:**
- Add approval status badge
- Add "Submit for Approval" action
- Add "Approve/Reject" buttons for authorized users

**New Component: InvoiceApprovalDialog.tsx**
- Approve button
- Reject with reason input
- Preview of invoice details

**InvoiceDetailsPage.tsx Modifications:**
- Show approval timeline
- Display approved_by user info
- Show rejection reason if rejected

---

## 📁 Files Summary

### New Database Tables (4)
- chart_of_accounts
- fiscal_periods
- journals
- journal_entries

### New/Modified Table Columns
- invoices: approval_status, submitted_at, approved_at, approved_by, rejection_reason
- user_2fa_settings (new table)

### New Edge Functions (3)
- `supabase/functions/create-journal/index.ts`
- `supabase/functions/verify-totp/index.ts`
- `supabase/functions/approve-invoice/index.ts`

### New Frontend Pages (4)
- `src/pages/accounting/ChartOfAccountsPage.tsx`
- `src/pages/accounting/JournalEntriesPage.tsx`
- `src/pages/accounting/FiscalPeriodsPage.tsx`
- `src/pages/accounting/TrialBalancePage.tsx`

### New Frontend Components (8+)
- `src/components/auth/TwoFactorSetup.tsx`
- `src/components/auth/TwoFactorVerify.tsx`
- `src/components/accounting/AccountTreeView.tsx`
- `src/components/accounting/JournalFormDialog.tsx`
- `src/components/accounting/JournalEntryLine.tsx`
- `src/components/accounting/FiscalPeriodFormDialog.tsx`
- `src/components/invoices/InvoiceApprovalDialog.tsx`

### New Hooks (2)
- `src/hooks/useTwoFactor.ts`
- `src/hooks/useAccounting.ts`

### Test Files (6+)
- `supabase/functions/create-journal/index_test.ts`
- `supabase/functions/verify-totp/index_test.ts`
- `supabase/functions/approve-invoice/index_test.ts`
- `src/__tests__/security/accounting-security.test.ts`
- `src/__tests__/integration/accounting-workflow.test.tsx`
- `e2e/accounting-journey.spec.ts`

---

## ✅ Acceptance Criteria for Q2

| Criteria | Target |
|----------|--------|
| Accounting tables created | 4 tables |
| Journal entries balance validation | 100% enforced |
| Auto-posting from invoices | Working |
| 2FA setup and verify flow | Complete |
| Invoice approval workflow | Complete |
| Edge function tests passing | 100% |
| Supabase Linter | 0 issues |
| Documentation updated | Complete |

---

## ⏱️ Estimated Timeline

```text
Phase 2.1: Double-Entry Accounting
├── Database migration           2 hours
├── create-journal Edge Function 3 hours
├── Auto-posting logic           2 hours
├── Frontend pages               3 hours
└── Testing                      2 hours

Phase 2.2: Two-Factor Authentication
├── Database table               1 hour
├── Edge Functions (2)           2 hours
├── Frontend components          2 hours
└── Auth flow integration        1 hour

Phase 2.3: Invoice Approval Workflow
├── Database modifications       1 hour
├── approve-invoice Edge Function 2 hours
├── Frontend changes             1 hour
└── Testing                      1 hour

Total Estimated: ~23-25 hours
```

---

## ⚠️ Technical Considerations

### Trade-offs
1. **TOTP without external library**: Implementing TOTP algorithm directly is more complex but avoids dependency issues in Deno Edge Functions
2. **Single fiscal period assumption**: Initial version assumes one open period at a time
3. **No currency support**: All amounts in EGP (Egyptian Pound) as per project requirements

### Assumptions
1. TOTP 2FA only (no SMS - requires external service)
2. Basic chart of accounts (not GAAP/IFRS compliant)
3. Manual journal entries require accountant role
4. Auto-posting runs synchronously (not queued)

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Accounting complexity | Medium | High | Start with basic accounts, expand later |
| 2FA adoption resistance | Medium | Low | Make 2FA optional initially |
| Performance with many journals | Low | Medium | Add indexes, pagination |

---

## 🚀 Execution Order

**Recommended sequence:**

1. **First: Invoice Approval Workflow** (easiest, builds on existing patterns)
   - Familiar approve-expense pattern
   - Quick wins for visibility

2. **Second: Double-Entry Accounting** (core financial foundation)
   - Most complex but most impactful
   - Enables financial reporting

3. **Third: 2FA Authentication** (security enhancement)
   - Independent from other features
   - Can be enabled gradually

---

## 📝 Notes for Implementation

### Database Considerations
- Use PostgreSQL CHECK constraints for entry validation
- Add indexes on frequently queried columns (journal_date, account_id)
- Consider table partitioning for journals if volume grows

### Security Considerations
- All accounting operations require authenticated users
- Financial data only accessible to admin/accountant roles
- 2FA secrets must be encrypted at rest

### Mobile Considerations
- Journal entry form needs mobile-optimized layout
- 2FA code input should be numeric keyboard
- Approval workflow needs swipe actions for mobile

