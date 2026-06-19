/**
 * Customers — deterministic mock dataset — UX-1E.
 *
 * @canonicalState Spike
 * @since UX-1E
 */
import { mulberry32, pick, rngInt, seededId, seededIsoDate, SEED } from "./seed";

export interface MockCustomer {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly city: string;
  readonly balance: number;
  readonly createdAt: string;
  readonly [key: string]: string | number | null;
}

const CITIES = ["Riyadh", "Jeddah", "Dammam", "Mecca", "Medina", "Khobar"];
const FIRST = ["Acme", "Globex", "Initech", "Umbrella", "Soylent", "Hooli", "Stark", "Wayne"];
const LAST = ["Co.", "Industries", "LLC", "Holdings", "Group", "Trading"];

export function buildCustomers(count = 200, seed = SEED): MockCustomer[] {
  const rng = mulberry32(seed);
  const rows: MockCustomer[] = [];
  for (let i = 1; i <= count; i++) {
    rows.push({
      id: seededId("customer", i),
      name: `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
      email: `c${i}@example.test`,
      phone: rng() > 0.1 ? `+9665${rngInt(rng, 10000000, 99999999)}` : null,
      city: pick(rng, CITIES),
      balance: Math.round(rng() * 100000) / 100,
      createdAt: seededIsoDate(-rngInt(rng, 0, 365)),
    });
  }
  return rows;
}

export const customers = buildCustomers();
