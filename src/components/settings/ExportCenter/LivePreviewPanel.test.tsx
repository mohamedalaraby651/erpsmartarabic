import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LivePreviewPanel } from './LivePreviewPanel';
import { createDefaultProfile } from '@/domain/pdf/entities/DocumentRenderProfile';

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
    render(<LivePreviewPanel profile={profile} height={400} />);
    expect(screen.getByText(/A4/)).toBeInTheDocument();
    expect(screen.getByText(/طولي/)).toBeInTheDocument();
    expect(screen.getByText(/210×297mm/)).toBeInTheDocument();
  });

  it('reflects landscape orientation correctly', () => {
    const profile = createDefaultProfile('global');
    profile.layout.orientation = 'landscape';
    profile.layout.pageSize = 'A3';
    render(<LivePreviewPanel profile={profile} height={400} />);
    expect(screen.getByText(/A3/)).toBeInTheDocument();
    expect(screen.getByText(/عرضي/)).toBeInTheDocument();
    // A3 landscape: 420×297
    expect(screen.getByText(/420×297mm/)).toBeInTheDocument();
  });

  it('shows error overlay when profile is invalid', () => {
    const profile = createDefaultProfile('global');
    // Force invalid margin
    profile.layout.margins.top = -10;
    render(<LivePreviewPanel profile={profile} height={400} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/تعذّر عرض المعاينة/)).toBeInTheDocument();
  });
});
