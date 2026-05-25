/**
 * EngineStrategyRegistry — Wave B / Item 5.
 *
 * Pluggable registry of `IPdfEngine` strategies. Instead of importing
 * engines directly inside `pickEngine`, callers ask the registry for
 * an engine by id, and adding a new generation engine (e.g. an
 * `edge-pdf` server-side strategy) requires zero edits to the routing
 * layer — just `engineRegistry.register(new EdgePdfEngine())`.
 *
 * The default singleton is pre-seeded with the two engines currently
 * shipping (`jspdf`, `html2pdf`). A fresh registry can be created for
 * tests via `new EngineStrategyRegistry()`.
 */
import type { IPdfEngine } from './IPdfEngine';
import { jsPdfEngine } from './JsPdfEngine';
import { htmlPdfEngine } from './HtmlPdfEngine';

export type EngineId = IPdfEngine['id'];

export class EngineStrategyRegistry {
  private readonly engines = new Map<EngineId, IPdfEngine>();

  register(engine: IPdfEngine): void {
    this.engines.set(engine.id, engine);
  }

  unregister(id: EngineId): void {
    this.engines.delete(id);
  }

  has(id: EngineId): boolean {
    return this.engines.has(id);
  }

  get(id: EngineId): IPdfEngine {
    const e = this.engines.get(id);
    if (!e) throw new Error(`No PDF engine registered for id="${id}"`);
    return e;
  }

  list(): IPdfEngine[] {
    return Array.from(this.engines.values());
  }

  ids(): EngineId[] {
    return Array.from(this.engines.keys());
  }

  clear(): void {
    this.engines.clear();
  }
}

/** Default app-wide registry. */
export const engineRegistry = new EngineStrategyRegistry();
engineRegistry.register(jsPdfEngine);
engineRegistry.register(htmlPdfEngine);
