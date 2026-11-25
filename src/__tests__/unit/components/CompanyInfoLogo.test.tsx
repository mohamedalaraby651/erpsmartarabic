import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompanyInfoSection } from '@/components/settings/CompanyInfoSection';

const mocks = vi.hoisted(() => ({ sign: vi.fn(), settings: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ limit: () => ({ maybeSingle: mocks.settings }) }) }), storage: { from: () => ({ createSignedUrl: mocks.sign }) } } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/shared/LogoUpload', () => ({ LogoUpload: ({ onUpload, onRemove }: { onUpload: (path: string) => void; onRemove: () => void }) => <><button onClick={() => onUpload('tenant/new.png')}>Upload</button><button onClick={onRemove}>Remove</button></> }));

function mount() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CompanyInfoSection /></QueryClientProvider>);
}
describe('company invoice header logo', () => {
  beforeEach(() => {
    mocks.sign.mockReset().mockImplementation(async (path: string) => ({ data: { signedUrl: `https://assets.example.test/${path}?signed=true` }, error: null }));
    mocks.settings.mockResolvedValue({ data: { id: 'settings', company_name: 'Company', logo_url: 'tenant/saved.png', currency: 'ج.م' }, error: null });
  });
  it('resolves the saved storage path for the invoice header preview', async () => {
    mount();
    await waitFor(() => expect(screen.getByAltText('Logo')).toHaveAttribute('src', 'https://assets.example.test/tenant/saved.png?signed=true'));
    expect(mocks.sign).toHaveBeenCalledWith('tenant/saved.png', 3600);
  });
  it('resolves a newly uploaded path and removes the preview when cleared', async () => {
    mount();
    await screen.findByText('Upload');
    fireEvent.click(screen.getByText('Upload'));
    await waitFor(() => expect(screen.getByAltText('Logo')).toHaveAttribute('src', 'https://assets.example.test/tenant/new.png?signed=true'));
    fireEvent.click(screen.getByText('Remove'));
    expect(screen.queryByAltText('Logo')).not.toBeInTheDocument();
  });
});