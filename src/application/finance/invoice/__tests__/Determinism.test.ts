/**
 * Determinism — same inputs + same fakes ⇒ byte-identical event stream.
 *
 * If anything in the handler ever calls `new Date()`, `Math.random()`, or
 * `crypto.randomUUID()`, this test will go non-deterministic and fail.
 */
import { describe, test, expect } from "vitest";
import { isOk } from "@/shared-kernel";
import { IssueInvoiceHandler } from "../handlers/IssueInvoiceHandler";
import { ApplyInvoicePaymentHandler } from "../handlers/ApplyInvoicePaymentHandler";
import { VoidInvoiceHandler } from "../handlers/VoidInvoiceHandler";
import {
  TEST_CTX,
  makeDeps,
  makeIssueCmd,
  makeInvoiceId,
} from "./fakes/testKit";

async function scenario() {
  const deps = makeDeps();
  const invoiceId = makeInvoiceId("inv-det");
  const issueCmd = makeIssueCmd({ invoiceId });
  await new IssueInvoiceHandler(deps).execute(issueCmd, TEST_CTX);
  await new ApplyInvoicePaymentHandler(deps).execute(
    { invoiceId, amountMinor: 1000, currencyCode: "USD" },
    TEST_CTX,
  );
  await new VoidInvoiceHandler(deps).execute(
    { invoiceId, reason: "test" },
    TEST_CTX,
  );
  const history = deps.repository.historyOf(invoiceId);
  // Strip non-comparable references; keep deterministic fields.
  return history.map((ev) => ({
    id: String(ev.id),
    type: ev.type,
    sequence: ev.sequence,
    occurredAt: ev.occurredAt.toISOString(),
  }));
}

describe("Application layer — determinism", () => {
  test("identical fakes ⇒ identical event streams across 5 runs", async () => {
    const runs = await Promise.all([
      scenario(),
      scenario(),
      scenario(),
      scenario(),
      scenario(),
    ]);
    const reference = runs[0]!;
    for (const r of runs.slice(1)) {
      expect(r).toEqual(reference);
    }
    // And the reference is what we expect:
    expect(reference.map((e) => e.type)).toEqual([
      "InvoiceIssued",
      "InvoicePaymentApplied",
      "InvoiceVoided",
    ]);
    expect(reference.map((e) => e.id)).toEqual([
      "fake-id-1",
      "fake-id-2",
      "fake-id-3",
    ]);
  });

  test("Issue handler returns Ok with stable shape", async () => {
    const r1 = await new IssueInvoiceHandler(makeDeps()).execute(
      makeIssueCmd(),
      TEST_CTX,
    );
    const r2 = await new IssueInvoiceHandler(makeDeps()).execute(
      makeIssueCmd(),
      TEST_CTX,
    );
    expect(isOk(r1) && isOk(r2)).toBe(true);
    if (isOk(r1) && isOk(r2)) {
      expect(r1.value).toEqual(r2.value);
    }
  });
});
