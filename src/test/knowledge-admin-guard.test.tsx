/**
 * UI guard check for knowledge pages. This tests the existing RoleGuard UX only
 * (it renders the 403 page); real data protection is enforced server-side and is
 * not exercised here.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';

const auth = { userRole: 'employee' as string | null, loading: false };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/lib/router-compat', () => ({ useNavigate: () => () => {} }));

import { RoleGuard } from '@/components/auth/RoleGuard';

describe('knowledge pages sit behind the admin RoleGuard', () => {
  it('admin layout wraps its outlet in RoleGuard allow=[admin]', () => {
    const src = readFileSync('src/routes/_app/admin.tsx', 'utf8');
    expect(src).toMatch(/<RoleGuard allow=\{\['admin'\]\}>\s*<Outlet \/>/);
  });
  it('every knowledge route is nested under /_app/admin', () => {
    const dir = 'src/routes/_app/admin/knowledge';
    const files = readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith('.tsx'));
    expect(files.length).toBeGreaterThanOrEqual(5);
    for (const file of files) {
      expect(readFileSync(join(dir, file), 'utf8')).toMatch(/createFileRoute\("\/_app\/admin\/knowledge/);
    }
  });
  it('non-admin sees the forbidden page instead of content', () => {
    auth.userRole = 'employee';
    render(<RoleGuard allow={['admin']}><p>knowledge-content</p></RoleGuard>);
    expect(screen.queryByText('knowledge-content')).toBeNull();
    expect(screen.getByText('غير مصرّح بالوصول')).toBeTruthy();
  });
  it('admin sees the content', () => {
    auth.userRole = 'admin';
    render(<RoleGuard allow={['admin']}><p>knowledge-content</p></RoleGuard>);
    expect(screen.getByText('knowledge-content')).toBeTruthy();
  });
});
