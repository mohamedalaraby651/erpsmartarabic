/**
 * Products — deterministic mock dataset — UX-1E.
 *
 * @canonicalState Spike
 * @since UX-1E
 */
import { mulberry32, pick, rngInt, seededId, SEED } from "./seed";

export interface MockProduct {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly price: number;
  readonly stock: number;
  readonly category: string;
}

const CATEGORIES = ["A", "B", "C", "D"];
const NOUNS = ["Widget", "Gadget", "Sprocket", "Bolt", "Cable", "Module"];

export function buildProducts(count = 150, seed = SEED + 2): MockProduct[] {
  const rng = mulberry32(seed);
  const rows: MockProduct[] = [];
  for (let i = 1; i <= count; i++) {
    rows.push({
      id: seededId("product", i),
      sku: `SKU-${String(i).padStart(5, "0")}`,
      name: `${pick(rng, NOUNS)} ${rngInt(rng, 100, 999)}`,
      price: Math.round(rng() * 5000) / 100,
      stock: rngInt(rng, 0, 500),
      category: pick(rng, CATEGORIES),
    });
  }
  return rows;
}

export const products = buildProducts();
