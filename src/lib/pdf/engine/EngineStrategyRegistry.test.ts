import { describe, it, expect } from 'vitest';
import {
  EngineStrategyRegistry,
  engineRegistry,
} from './EngineStrategyRegistry';
import type { IPdfEngine } from './IPdfEngine';

function makeFakeEngine(id: IPdfEngine['id']): IPdfEngine {
  return {
    id,
    isAvailable: () => true,
    render: async () => ({
      blob: new Blob(),
      filename: 'x.pdf',
      pages: 1,
      engine: id,
      durationMs: 0,
    }),
  };
}

describe('EngineStrategyRegistry', () => {
  it('default singleton has jspdf + html2pdf seeded', () => {
    expect(engineRegistry.has('jspdf')).toBe(true);
    expect(engineRegistry.has('html2pdf')).toBe(true);
    expect(engineRegistry.get('jspdf').id).toBe('jspdf');
    expect(engineRegistry.get('html2pdf').id).toBe('html2pdf');
  });

  it('lists registered engine ids', () => {
    const ids = engineRegistry.ids();
    expect(ids).toContain('jspdf');
    expect(ids).toContain('html2pdf');
  });

  it('throws when asking for an unregistered engine id', () => {
    const r = new EngineStrategyRegistry();
    expect(() => r.get('jspdf')).toThrowError(/No PDF engine/);
  });

  it('register / unregister round-trip', () => {
    const r = new EngineStrategyRegistry();
    const e = makeFakeEngine('edge');
    r.register(e);
    expect(r.has('edge')).toBe(true);
    expect(r.get('edge')).toBe(e);
    r.unregister('edge');
    expect(r.has('edge')).toBe(false);
  });

  it('register is idempotent — same id replaces previous engine', () => {
    const r = new EngineStrategyRegistry();
    const a = makeFakeEngine('jspdf');
    const b = makeFakeEngine('jspdf');
    r.register(a);
    r.register(b);
    expect(r.list()).toHaveLength(1);
    expect(r.get('jspdf')).toBe(b);
  });

  it('pickEngine still resolves through the registry', async () => {
    const { pickEngine } = await import('./pickEngine');
    expect(pickEngine({ docType: 'invoice', prefer: 'html2pdf' }).id).toBe(
      'html2pdf',
    );
    expect(pickEngine({ docType: 'invoice', prefer: 'jspdf' }).id).toBe('jspdf');
  });
});
