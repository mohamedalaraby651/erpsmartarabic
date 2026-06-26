/**
 * VoidInvoiceHandler test suite (UX-2B Wave 1).
 */
import { describe, test, expect } from "vitest";
import { isOk, isErr } from "@/shared-kernel";
import { IssueInvoiceHandler } from "../handlers/IssueInvoiceHandler";
import { VoidInvoiceHandler } from "../handlers/VoidInvoiceHandler";
import { ApplyInvoicePaymentHandler } from "../handlers/ApplyInvoicePaymentHandler";
import {
  TEST_CTX,
  makeDeps,
  makeIssueCmd,
  makeInvoiceId,
} from "./fakes/testKit";

async function issueOne(deps: ReturnType<typeof makeDeps>) {
  const cmd = makeIssueCmd();
  const r = await new IssueInvoiceHandler(deps).execute(cmd, TEST_CTX);
  if (!isOk(r)) throw new Error("setup: issue failed");
  return cmd;
}

describe("VoidInvoiceHandler", () => {
  test("voids an Issued invoice (newVersion=2, status=Void)", async () => {
    const deps = makeDeps();
    const cmd = await issueOne(deps);
    const r = await new VoidInvoiceHandler(deps).execute(
      { invoiceId: cmd.invoiceId, reason: "customer cancelled" },
      TEST_CTX,
    );
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.status).toBe("Void");
    expect(r.value.newVersion).toBe(2);
  });

  test("empty reason → DomainRuleViolation(VoidReasonInvalid)", async () => {
    const deps = makeDeps();
    const cmd = await issueOne(deps);
    const r = await new VoidInvoiceHandler(deps).execute(
      { invoiceId: cmd.invoiceId, reason: "   " },
      TEST_CTX,
    );
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("DomainRuleViolation");
    if (r.error.kind === "DomainRuleViolation") {
      expect(r.error.rule).toBe("VoidReasonInvalid");
    }
  });

  test("void on Paid → DomainRuleViolation(VoidOnTerminalStatus)", async () => {
    const deps = makeDeps();
    const cmd = await issueOne(deps);
    await new ApplyInvoicePaymentHandler(deps).execute(
      { invoiceId: cmd.invoiceId, amountMinor: 11500, currencyCode: "USD" },
      TEST_CTX,
    );
    const r = await new VoidInvoiceHandler(deps).execute(
      { invoiceId: cmd.invoiceId, reason: "too late" },
      TEST_CTX,
    );
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("DomainRuleViolation");
    if (r.error.kind === "DomainRuleViolation") {
      expect(r.error.rule).toBe("VoidOnTerminalStatus");
    }
  });

  test("NotFound when aggregate doesn't exist", async () => {
    const deps = makeDeps();
    const r = await new VoidInvoiceHandler(deps).execute(
      { invoiceId: makeInvoiceId("missing"), reason: "x" },
      TEST_CTX,
    );
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("NotFound");
  });

  test("uses explicit reasonCode when provided", async () => {
    const deps = makeDeps();
    const cmd = await issueOne(deps);
    const r = await new VoidInvoiceHandler(deps).execute(
      {
        invoiceId: cmd.invoiceId,
        reason: "duplicate entry",
        reasonCode: "Duplicate",
      },
      TEST_CTX,
    );
    expect(isOk(r)).toBe(true);
    const ev = deps.repository.historyOf(cmd.invoiceId)[1]!;
    expect(ev.type).toBe("InvoiceVoided");
    if (ev.type === "InvoiceVoided") {
      expect(ev.payload.reasonCode).toBe("Duplicate");
      expect(ev.payload.reason).toBe("duplicate entry");
    }
  });
});
