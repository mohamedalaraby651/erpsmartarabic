import { describe, test, expect } from "vitest";
import { unsafeId, idEquals } from "@/shared-kernel";
import * as InvoiceIdModule from "../InvoiceId";
import type { InvoiceId } from "../InvoiceId";
import { invoiceIdEquals } from "../InvoiceId";

// Per ADR-0006, only IdPort implementations (or test fixtures) may mint Ids.
// These tests treat themselves as fixtures; production code never uses
// `unsafeId` outside the allow-listed boundaries.
const makeId = (raw: string): InvoiceId => unsafeId<"InvoiceId">(raw);

describe("InvoiceId — opaque branded identity", () => {
  test("equality of identical underlying strings", () => {
    const a = makeId("01HXXX-AAA");
    const b = makeId("01HXXX-AAA");
    expect(invoiceIdEquals(a, b)).toBe(true);
    expect(idEquals(a, b)).toBe(true);
  });

  test("inequality of different underlying strings", () => {
    const a = makeId("01HXXX-AAA");
    const b = makeId("01HXXX-BBB");
    expect(invoiceIdEquals(a, b)).toBe(false);
  });

  test("module exposes no factory — generation is IdPort's job", () => {
    const mod = InvoiceIdModule as unknown as Record<string, unknown>;
    expect(typeof mod["generate"]).toBe("undefined");
    expect(typeof mod["of"]).toBe("undefined");
    expect(typeof mod["create"]).toBe("undefined");
    expect(typeof mod["new"]).toBe("undefined");
    expect(typeof mod["InvoiceId"]).toBe("undefined"); // no runtime class either
  });
});
