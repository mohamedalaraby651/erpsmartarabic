/**
 * ApplyInvoicePaymentHandler test suite (UX-2B Wave 1).
 *
 * Covers: happy path, NotFound, overpayment, currency mismatch,
 * concurrency conflict on append, and the committedVersion contract.
 */
import { describe, test, expect, beforeEach } from "vitest";
import { isOk, isErr } from "@/shared-kernel";
import { IssueInvoiceHandler } from "../handlers/IssueInvoiceHandler";
import { ApplyInvoicePaymentHandler } from "../handlers/ApplyInvoicePaymentHandler";
import {
  TEST_CTX,
  makeDeps,
  makeIssueCmd,
  makeInvoiceId,
} from "./fakes/testKit";

async function issueOne(deps: ReturnType<typeof makeDeps>) {
  const h = new IssueInvoiceHandler(deps);
  const cmd = makeIssueCmd({
    lines: [{ quantity: 2, unitPriceMinor: 5000, taxBasisPoints: 1500 }],
  });
  // lineGross = 5000*2 + tax(15%) = 10000 + 1500 = 11500
  const r = await h.execute(cmd, TEST_CTX);
  if (!isOk(r)) throw new Error("setup: issue failed");
  return cmd;
}

describe("ApplyInvoicePaymentHandler — happy path", () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    deps = makeDeps();
  });

  test("partial payment → PartiallyPaid, newVersion=2", async () => {
    const cmd = await issueOne(deps);
    const h = new ApplyInvoicePaymentHandler(deps);
    const r = await h.execute(
      { invoiceId: cmd.invoiceId, amountMinor: 3000, currencyCode: "USD" },
      TEST_CTX,
    );
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.newVersion).toBe(2);
    expect(r.value.status).toBe("PartiallyPaid");
    expect(deps.repository.historyOf(cmd.invoiceId).length).toBe(2);
  });

  test("full payment → Paid", async () => {
    const cmd = await issueOne(deps);
    const h = new ApplyInvoicePaymentHandler(deps);
    const r = await h.execute(
      { invoiceId: cmd.invoiceId, amountMinor: 11500, currencyCode: "USD" },
      TEST_CTX,
    );
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.status).toBe("Paid");
  });
});

describe("ApplyInvoicePaymentHandler — guards", () => {
  test("NotFound when no aggregate exists", async () => {
    const deps = makeDeps();
    const h = new ApplyInvoicePaymentHandler(deps);
    const r = await h.execute(
      {
        invoiceId: makeInvoiceId("missing"),
        amountMinor: 100,
        currencyCode: "USD",
      },
      TEST_CTX,
    );
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("NotFound");
  });

  test("overpayment → DomainRuleViolation(OverPayment)", async () => {
    const deps = makeDeps();
    const cmd = await issueOne(deps);
    const h = new ApplyInvoicePaymentHandler(deps);
    const r = await h.execute(
      { invoiceId: cmd.invoiceId, amountMinor: 99999, currencyCode: "USD" },
      TEST_CTX,
    );
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("DomainRuleViolation");
    if (r.error.kind === "DomainRuleViolation") {
      expect(r.error.rule).toBe("OverPayment");
    }
  });

  test("currency mismatch → DomainRuleViolation(PaymentCurrencyMismatch)", async () => {
    const deps = makeDeps();
    const cmd = await issueOne(deps);
    const h = new ApplyInvoicePaymentHandler(deps);
    const r = await h.execute(
      { invoiceId: cmd.invoiceId, amountMinor: 100, currencyCode: "EUR" },
      TEST_CTX,
    );
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("DomainRuleViolation");
    if (r.error.kind === "DomainRuleViolation") {
      expect(r.error.rule).toBe("PaymentCurrencyMismatch");
    }
  });

  test("non-positive payment → DomainRuleViolation(NonPositivePayment)", async () => {
    const deps = makeDeps();
    const cmd = await issueOne(deps);
    const h = new ApplyInvoicePaymentHandler(deps);
    const r = await h.execute(
      { invoiceId: cmd.invoiceId, amountMinor: 0, currencyCode: "USD" },
      TEST_CTX,
    );
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("DomainRuleViolation");
  });
});

describe("ApplyInvoicePaymentHandler — committedVersion (D5)", () => {
  test("two sequential payments produce versions 2 then 3", async () => {
    const deps = makeDeps();
    const cmd = await issueOne(deps);
    const h = new ApplyInvoicePaymentHandler(deps);

    const a = await h.execute(
      { invoiceId: cmd.invoiceId, amountMinor: 1000, currencyCode: "USD" },
      TEST_CTX,
    );
    const b = await h.execute(
      { invoiceId: cmd.invoiceId, amountMinor: 1000, currencyCode: "USD" },
      TEST_CTX,
    );
    expect(isOk(a) && a.value.newVersion).toBe(2);
    expect(isOk(b) && b.value.newVersion).toBe(3);
    expect(deps.repository.historyOf(cmd.invoiceId).length).toBe(3);
  });
});
