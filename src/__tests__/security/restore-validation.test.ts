import { describe, expect, it } from 'vitest';
import { foreignIdIssues, referenceIssues, sanitizeRestoreRows } from '../../../supabase/functions/_shared/restoreValidation';

const tenant = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
const category = '44444444-4444-4444-8444-444444444444';
const columns = [
  { table_name: 'customers', column_name: 'id', data_type: 'uuid', is_required: false },
  { table_name: 'customers', column_name: 'name', data_type: 'text', is_required: true },
  { table_name: 'customers', column_name: 'category_id', data_type: 'uuid', is_required: false },
  { table_name: 'customers', column_name: 'credit_limit', data_type: 'numeric(12,2)', is_required: false },
];

describe('backup restore contract', () => {
  it('keeps approved fields and replaces company metadata on the server', () => {
    const result = sanitizeRestoreRows({ customers: [{ id, name: 'Customer', credit_limit: '25.50', tenant_id: tenant, created_at: 'old', updated_at: 'old' }] }, ['customers'], tenant, columns);
    expect(result.issues).toEqual([]);
    expect(result.sanitized.customers).toEqual([{ id, name: 'Customer', credit_limit: '25.50', tenant_id: tenant }]);
  });
  it('rejects unapproved fields, invalid types, missing required fields and foreign tenant metadata', () => {
    const result = sanitizeRestoreRows({ customers: [{ id: 'bad', credit_limit: 'many', is_admin: true, tenant_id: other }] }, ['customers'], tenant, columns);
    expect(result.issues.map(issue => issue.field)).toEqual(expect.arrayContaining(['tenant_id', 'credit_limit', 'is_admin', 'id', 'name']));
  });
  it('rejects identifiers already owned by another company', () => {
    expect(foreignIdIssues({ customers: [{ id }] }, { customers: [{ id, tenant_id: other }] }, tenant)).toEqual([{ table: 'customers', row: 1, field: 'id', message: 'المعرّف مستخدم في شركة أخرى' }]);
  });
  it('accepts references in the current company or restore payload and rejects unavailable references', () => {
    const refs = [{ table_name: 'customers', column_name: 'category_id', target_table: 'customer_categories', target_column: 'id', target_has_tenant: true }];
    expect(referenceIssues({ customers: [{ category_id: category }] }, refs, new Map([['customer_categories.id', new Set([category])]]))).toEqual([]);
    expect(referenceIssues({ customers: [{ category_id: category }], customer_categories: [{ id: category }] }, refs, new Map())).toEqual([]);
    expect(referenceIssues({ customers: [{ category_id: category }] }, refs, new Map())).toHaveLength(1);
  });
});