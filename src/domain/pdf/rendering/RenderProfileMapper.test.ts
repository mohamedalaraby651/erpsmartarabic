import { describe, it, expect, vi } from 'vitest';
import {
  profileToPdfConfigInputAsync,
  profileToPdfConfigInput,
} from './RenderProfileMapper';
import { createDefaultProfile } from '../entities/DocumentRenderProfile';

describe('RenderProfileMapper', () => {
  it('sync mapper ignores assetIds and passes scalar fields', () => {
    const p = createDefaultProfile('global');
    p.branding.logoAssetId = 'asset-1';
    p.watermark.enabled = true;
    p.watermark.type = 'image';
    p.watermark.imageAssetId = 'asset-2';
    const cfg = profileToPdfConfigInput(p);
    expect(cfg.header?.logoUrl).toBeUndefined();
    expect(cfg.watermark?.imageUrl).toBeUndefined();
  });

  it('async mapper resolves logo and watermark image URLs', async () => {
    const p = createDefaultProfile('global');
    p.branding.logoAssetId = 'asset-1';
    p.watermark.enabled = true;
    p.watermark.type = 'image';
    p.watermark.imageAssetId = 'asset-2';

    const resolver = vi.fn(async (id: string) =>
      id === 'asset-1' ? 'https://x/logo.png' : 'https://x/wm.png',
    );
    const cfg = await profileToPdfConfigInputAsync(p, resolver);
    expect(cfg.header?.logoUrl).toBe('https://x/logo.png');
    expect(cfg.watermark?.imageUrl).toBe('https://x/wm.png');
    expect(cfg.watermark?.text).toBeUndefined();
    expect(resolver).toHaveBeenCalledTimes(2);
  });

  it('async mapper swallows resolver errors and keeps base config', async () => {
    const p = createDefaultProfile('global');
    p.branding.logoAssetId = 'broken';
    const resolver = vi.fn(async () => { throw new Error('boom'); });
    const cfg = await profileToPdfConfigInputAsync(p, resolver);
    expect(cfg.header?.logoUrl).toBeUndefined();
  });

  it('skips watermark resolution when type is text', async () => {
    const p = createDefaultProfile('global');
    p.watermark.enabled = true;
    p.watermark.type = 'text';
    p.watermark.text = 'مسودة';
    p.watermark.imageAssetId = 'should-not-resolve';
    const resolver = vi.fn(async () => 'https://x/wm.png');
    const cfg = await profileToPdfConfigInputAsync(p, resolver);
    expect(resolver).not.toHaveBeenCalled();
    expect(cfg.watermark?.text).toBe('مسودة');
  });
});
