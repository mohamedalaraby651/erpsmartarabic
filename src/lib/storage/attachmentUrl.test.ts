import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSignedUrl, from } = vi.hoisted(() => ({ createSignedUrl: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { storage: { from } } }));
import { getAttachmentSignedUrl } from './attachmentUrl';

describe('private attachment access', () => {
  beforeEach(() => {
    createSignedUrl.mockReset();
    from.mockReset().mockReturnValue({ createSignedUrl });
  });

  it('signs a stored object path in the private documents bucket', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.test/fresh' } });
    expect(await getAttachmentSignedUrl('company/customer/id/file.pdf')).toBe('https://storage.test/fresh');
    expect(from).toHaveBeenCalledWith('documents');
    expect(createSignedUrl).toHaveBeenCalledWith('company/customer/id/file.pdf', 300);
  });

  it('renews a legacy expired link instead of reusing its token', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.test/renewed' } });
    expect(await getAttachmentSignedUrl('https://storage.test/storage/v1/object/sign/documents/company/file%20one.pdf?token=expired')).toBe('https://storage.test/renewed');
    expect(createSignedUrl).toHaveBeenCalledWith('company/file one.pdf', 300);
  });

  it('does not fall back to an unsigned path when access is denied', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'denied' } });
    expect(await getAttachmentSignedUrl('company/private.pdf')).toBe('');
  });
});