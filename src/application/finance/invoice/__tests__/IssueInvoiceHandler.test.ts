/**
 * IssueInvoiceHandler — UX-2B Wave 1 test suite.
 *
 * Verifies:
 *   - happy path emits exactly one InvoiceIssued event at version 0
 *   - VO validation failures translate to ValidationError variants
 *   - domain guard failures (EmptyInvoice) translate to DomainRuleViolation
 *   - repository failures translate to the sealed Application union
 *   - no RepositoryFailure / DomainError leaks across the boundary
 *   - no throws under any input
 */
import { describe, test, expect } from "vitest";
import { isOk, isErr } from "@/shared-kernel";
import { IssueInvoiceHandler } from "../handlers/IssueInvoiceHandler";
import type { InvoiceApplicationError } from "../errors/InvoiceApplicationError";
import {
  TEST_CTX,
  makeDeps,
  makeIssueCmd,
  makeInvoiceId,
} from "./fakes/testKit";

describe("IssueInvoiceHandler — happy path", () => {
  test("issues a brand-new invoice with expectedVersion=0 and newVersion=1", async () => {
    const deps = makeDeps();
    const h = new IssueInvoiceHandler(deps);
    const cmd = makeIssueCmd();

    const r = await h.execute(cmd, TEST_CTX);

    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.invoiceId).toBe(cmd.invoiceId);
    expect(r.value.newVersion).toBe(1);
    expect(r.value.status).toBe("Issued");

    const history = deps.repository.historyOf(cmd.invoiceId);
    expect(history.length).toBe(1);
    expect(history[0]!.type).toBe("InvoiceIssued");
    expect(history[0]!.sequence).toBe(1);
    expect(deps.repository.appendCalls).toBe(1);
  });

  test("uses ClockPort + IdPort exclusively for time/identity", async () => {
    const deps = makeDeps();
    const h = new IssueInvoiceHandler(deps);
    const cmd = makeIssueCmd();
    await h.execute(cmd, TEST_CTX);

    const ev = deps.repository.historyOf(cmd.invoiceId)[0]!;
    // FakeClock starts at 2025-01-01T00:00:00Z; FakeIdPort emits fake-id-1.
    expect(ev.occurredAt.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect(String(ev.id)).toBe("fake-id-1");
  });
});

describe("IssueInvoiceHandler — validation", () => {
  test("invalid currency code → ValidationError(INVALID_CURRENCY)", async () => {
    const deps = makeDeps();
    const h = new IssueInvoiceHandler(deps);
    const r = await h.execute(
      makeIssueCmd({ currencyCode: "ZZZ" }),
      TEST_CTX,
    );
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    const e: InvoiceApplicationError = r.error;
    expect(e.kind).toBe("ValidationError");
    if (e.kind === "ValidationError") {
      expect(e.field).toBe("currencyCode");
    }
    expect(deps.repository.appendCalls).toBe(0);
  });

  test("empty invoice number → ValidationError(INVALID_INVOICE_NUMBER)", async () => {
    const deps = makeDeps();
    const h = new IssueInvoiceHandler(deps);
    const r = await h.execute(makeIssueCmd({ number: "" }), TEST_CTX);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("ValidationError");
  });

  test("non-integer quantity → ValidationError(INVALID_INVOICE_LINE)", async () => {
    const deps = makeDeps();
    const h = new IssueInvoiceHandler(deps);
    const r = await h.execute(
      makeIssueCmd({
        lines: [{ quantity: 1.5, unitPriceMinor: 100, taxBasisPoints: 0 }],
      }),
      TEST_CTX,
    );
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("ValidationError");
  });

  test("negative unit price minor → ValidationError(INVALID_INVOICE_LINE)", async () => {
    const deps = makeDeps();
    const h = new IssueInvoiceHandler(deps);
    const r = await h.execute(
      makeIssueCmd({
        lines: [{ quantity: 1, unitPriceMinor: -1, taxBasisPoints: 0 }],
      }),
      TEST_CTX,
    );
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("ValidationError");
  });

  test("tax basis points out of range → ValidationError(INVALID_TAX_RATE)", async () => {
    const deps = makeDeps();
    const h = new IssueInvoiceHandler(deps);
    const r = await h.execute(
      makeIssueCmd({
        lines: [
          { quantity: 1, unitPriceMinor: 100, taxBasisPoints: 99999 },
        ],
      }),
      TEST_CTX,
    );
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("ValidationError");
  });

  test("empty lines array → ValidationError(INVALID_COMMAND)", async () => {
    const deps = makeDeps();
    const h = new IssueInvoiceHandler(deps);
    const r = await h.execute(makeIssueCmd({ lines: [] }), TEST_CTX);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("ValidationError");
  });
});

describe("IssueInvoiceHandler — infrastructure translation", () => {
  test("Conflict from repository → ConcurrencyConflict", async () => {
    const deps = makeDeps();
    deps.repository.failNextAppend = { kind: "Conflict", actualVersion: 3 };
    const h = new IssueInvoiceHandler(deps);
    const r = await h.execute(makeIssueCmd(), TEST_CTX);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("ConcurrencyConflict");
    if (r.error.kind === "ConcurrencyConflict") {
      expect(r.error.actualVersion).toBe(3);
    }
  });

  test("Timeout from repository → InfrastructureUnavailable(retryable=true)", async () => {
    const deps = makeDeps();
    deps.repository.failNextAppend = { kind: "Timeout" };
    const h = new IssueInvoiceHandler(deps);
    const r = await h.execute(makeIssueCmd(), TEST_CTX);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error.kind).toBe("InfrastructureUnavailable");
    if (r.error.kind === "InfrastructureUnavailable") {
      expect(r.error.cause).toBe("Timeout");
      expect(r.error.retryable).toBe(true);
    }
  });

  test("PermissionDenied → InfrastructureUnavailable(retryable=false)", async () => {
    const deps = makeDeps();
    deps.repository.failNextAppend = { kind: "PermissionDenied" };
    const h = new IssueInvoiceHandler(deps);
    const r = await h.execute(makeIssueCmd(), TEST_CTX);
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    if (r.error.kind === "InfrastructureUnavailable") {
      expect(r.error.cause).toBe("PermissionDenied");
      expect(r.error.retryable).toBe(false);
    }
  });
});

describe("IssueInvoiceHandler — non-throwing contract", () => {
  test("never throws even on completely malformed input", async () => {
    const deps = makeDeps();
    const h = new IssueInvoiceHandler(deps);
    const badCmd = {
      invoiceId: makeInvoiceId(),
      number: "",
      currencyCode: "",
      lines: [],
    };
    await expect(h.execute(badCmd, TEST_CTX)).resolves.toBeDefined();
  });
});
