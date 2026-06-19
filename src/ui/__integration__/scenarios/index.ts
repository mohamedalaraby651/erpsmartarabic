/**
 * Scenario Registry — UX-1E.
 *
 * @canonicalState Spike
 * @adr ADR-0005
 * @since UX-1E
 *
 * Each scenario carries both data and metadata. Metadata drives the
 * generated findings report.
 *
 * NOTE: This module is permitted to read from `mocks/**` but NOT from any
 * composite, contract, or real data-layer module.
 */
import type { ColumnDef } from "@/ui/contracts";
import type { MockCustomer } from "../mocks/customers.mock";
import { customers, buildCustomers } from "../mocks/customers.mock";
import type { MockError } from "../mocks/errors";

export interface ScenarioMeta {
  readonly complexity: "empty" | "normal" | "slow" | "large" | "error" | "edge";
  readonly expectedRows: number;
  readonly rtl: boolean;
  readonly nullable: boolean;
  readonly duplicateKeys: boolean;
}

export interface Scenario {
  readonly name: string;
  readonly meta: ScenarioMeta;
  readonly rows: ReadonlyArray<MockCustomer>;
  readonly columns: ReadonlyArray<ColumnDef<MockCustomer>>;
  readonly formInitial: Readonly<Record<string, string>>;
  readonly latencyMs?: number;
  readonly error?: MockError;
}

const baseColumns: ReadonlyArray<ColumnDef<MockCustomer>> = [
  { id: "name", header: "Name", accessor: "name", sortable: true },
  { id: "email", header: "Email", accessor: "email" },
  { id: "city", header: "City", accessor: "city", sortable: true },
  { id: "balance", header: "Balance", accessor: "balance", sortable: true, align: "end" },
];

const baseFormInitial = { name: "", email: "", phone: "" } as const;

export const happy: Scenario = {
  name: "happy",
  meta: { complexity: "normal", expectedRows: 200, rtl: false, nullable: false, duplicateKeys: false },
  rows: customers,
  columns: baseColumns,
  formInitial: baseFormInitial,
};

export const empty: Scenario = {
  name: "empty",
  meta: { complexity: "empty", expectedRows: 0, rtl: false, nullable: false, duplicateKeys: false },
  rows: [],
  columns: baseColumns,
  formInitial: baseFormInitial,
};

export const error: Scenario = {
  name: "error",
  meta: { complexity: "error", expectedRows: 0, rtl: false, nullable: false, duplicateKeys: false },
  rows: [],
  columns: baseColumns,
  formInitial: baseFormInitial,
  error: { kind: "network", status: 503, message: "Upstream unavailable" },
};

export const slow: Scenario = {
  name: "slow",
  meta: { complexity: "slow", expectedRows: 200, rtl: false, nullable: false, duplicateKeys: false },
  rows: customers,
  columns: baseColumns,
  formInitial: baseFormInitial,
  latencyMs: 800,
};

const largeRows = buildCustomers(5000, 9001);
export const large: Scenario = {
  name: "large",
  meta: { complexity: "large", expectedRows: 5000, rtl: false, nullable: false, duplicateKeys: false },
  rows: largeRows,
  columns: baseColumns,
  formInitial: baseFormInitial,
};

const dupRows: MockCustomer[] = customers.slice(0, 5).flatMap((c) => [c, c]);
export const duplicateIds: Scenario = {
  name: "duplicateIds",
  meta: { complexity: "edge", expectedRows: dupRows.length, rtl: false, nullable: false, duplicateKeys: true },
  rows: dupRows,
  columns: baseColumns,
  formInitial: baseFormInitial,
};

const nullRows: MockCustomer[] = customers.slice(0, 10).map((c, i) => ({
  ...c,
  name: i % 3 === 0 ? "" : c.name,
  phone: null,
}));
export const nullFields: Scenario = {
  name: "nullFields",
  meta: { complexity: "edge", expectedRows: nullRows.length, rtl: false, nullable: true, duplicateKeys: false },
  rows: nullRows,
  columns: baseColumns,
  formInitial: baseFormInitial,
};

const unicodeRows: MockCustomer[] = [
  { id: "customer-ar-1", name: "شركة الأمل ٢٠٢٦", email: "amal@example.test", phone: null, city: "الرياض", balance: 1234.56, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "customer-ar-2", name: "مؤسسة النجاح — Acme Co.", email: "najah@example.test", phone: "+966500000000", city: "جدة", balance: 9876.54, createdAt: "2026-02-01T00:00:00.000Z" },
  { id: "customer-mix-1", name: "Test 测试 テスト 🚀", email: "mix@example.test", phone: null, city: "Riyadh", balance: 42, createdAt: "2026-03-01T00:00:00.000Z" },
];
export const unicode: Scenario = {
  name: "unicode",
  meta: { complexity: "edge", expectedRows: unicodeRows.length, rtl: true, nullable: true, duplicateKeys: false },
  rows: unicodeRows,
  columns: baseColumns,
  formInitial: baseFormInitial,
};

export const scenarios = {
  happy,
  empty,
  error,
  slow,
  large,
  duplicateIds,
  nullFields,
  unicode,
} as const;

export type ScenarioName = keyof typeof scenarios;
export const scenarioNames = Object.keys(scenarios) as ReadonlyArray<ScenarioName>;
