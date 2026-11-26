import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { LivePreviewPanel } from './LivePreviewPanel';
import { createDefaultProfile } from '@/domain/pdf/entities/DocumentRenderProfile';

function withQueryClient(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

// Polyfill ResizeObserver for jsdom
beforeAll(() => {
  // @ts-expect-error jsdom polyfill
  globalThis.ResizeObserver = class {
    observe() {/* noop */}
    unobserve() {/* noop */}
    disconnect() {/* noop */}
  };
});

describe('LivePreviewPanel', () => {
  it('renders header badge with page size, orientation and mm dimensions (A4 portrait)', () => {
    const profile = createDefaultProfile('global');
    render(withQueryClient(<LivePreviewPanel profile={profile} height={400} />));
    expect(screen.getByText(/A4/)).toBeInTheDocument();
    expect(screen.getByText(/طولي/)).toBeInTheDocument();
    expect(screen.getByText(/210×297mm/)).toBeInTheDocument();
  });

  it('reflects landscape orientation correctly', () => {
    const profile = createDefaultProfile('global');
    profile.layout.orientation = 'landscape';
    profile.layout.pageSize = 'A3';
    render(withQueryClient(<LivePreviewPanel profile={profile} height={400} />));
    expect(screen.getByText(/A3/)).toBeInTheDocument();
    expect(screen.getByText(/عرضي/)).toBeInTheDocument();
    // A3 landscape: 420×297
    expect(screen.getByText(/420×297mm/)).toBeInTheDocument();
  });

  it('shows error overlay when profile is invalid', () => {
    const profile = createDefaultProfile('global');
    // Force invalid margin
    profile.layout.margins.top = -10;
    render(withQueryClient(<LivePreviewPanel profile={profile} height={400} />));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/تعذّر عرض المعاينة/)).toBeInTheDocument();
  });
});

describe('LivePreviewPanel with a real document', () => {
  it('shows the real company, pending number and form lines instead of samples', () => {
    const profile = createDefaultProfile('global');
    // @ts-expect-error jsdom polyfill that reports a real size so the page renders
    globalThis.ResizeObserver = class { constructor(private cb: (e: unknown[]) => void) {} observe() { this.cb([{ contentRect: { width: 600, height: 800 } }]); } unobserve() {} disconnect() {} };
    render(withQueryClient(<LivePreviewPanel profile={profile} height={400} document={{ title: 'فاتورة', number: null, companyName: 'شركة الاختبار', lines: [{ name: 'سماد', quantity: 2, unitPrice: 125, total: 250 }], total: 250 }} />));
    expect(screen.getByText('شركة الاختبار')).toBeTruthy();
    expect(screen.getByText('فاتورة #سيتم التوليد عند الحفظ')).toBeTruthy();
    expect(screen.getByText('سماد')).toBeTruthy();
    expect(screen.queryByText(/صنف تجريبي/)).toBeNull();
  });
});
