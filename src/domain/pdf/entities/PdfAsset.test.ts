import { describe, it, expect } from 'vitest';
import { validateAssetUpload, detectMimeFromBytes, MAX_ASSET_BYTES } from './PdfAsset';

describe('PdfAsset', () => {
  it('يقبل PNG صحيح', () => {
    const r = validateAssetUpload({
      mimeType: 'image/png',
      sizeBytes: 50_000,
      width: 500,
      height: 200,
    });
    expect(r.valid).toBe(true);
  });

  it('يرفض MIME غير مسموح', () => {
    const r = validateAssetUpload({ mimeType: 'image/gif', sizeBytes: 1000 });
    expect(r.valid).toBe(false);
  });

  it('يرفض ملف يتجاوز الحد الأقصى', () => {
    const r = validateAssetUpload({
      mimeType: 'image/png',
      sizeBytes: MAX_ASSET_BYTES + 1,
    });
    expect(r.valid).toBe(false);
  });

  it('يرفض أبعاد تتجاوز الحد', () => {
    const r = validateAssetUpload({
      mimeType: 'image/png',
      sizeBytes: 1000,
      width: 5000,
    });
    expect(r.valid).toBe(false);
  });

  it('detectMimeFromBytes: PNG signature', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    expect(detectMimeFromBytes(bytes)).toBe('image/png');
  });

  it('detectMimeFromBytes: JPEG signature', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(detectMimeFromBytes(bytes)).toBe('image/jpeg');
  });

  it('detectMimeFromBytes: WebP signature', () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectMimeFromBytes(bytes)).toBe('image/webp');
  });

  it('detectMimeFromBytes: SVG', () => {
    const bytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(detectMimeFromBytes(bytes)).toBe('image/svg+xml');
  });

  it('detectMimeFromBytes: bytes عشوائية → null', () => {
    const bytes = new Uint8Array([0x00, 0x11, 0x22, 0x33]);
    expect(detectMimeFromBytes(bytes)).toBeNull();
  });
});
