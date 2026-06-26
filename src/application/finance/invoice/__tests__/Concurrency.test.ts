/**
 * Concurrency — two handlers racing the SAME aggregate must produce
 * exactly one success and one ConcurrencyConflict.
 *
 * The InMemory repository serializes appendEvents via the JS event loop
 * but does NOT serialize the load → mutate → append window. We simulate
 * the classic lost-update race by interleaving two payment commands
 * loaded from the same version, then attempting to append both. The
 * second appendEvents call must see Conflict because the first already
 * advanced the history length.
 */
import { describe, test, expect } from "vitest";
import { isOk, isErr } from "@/shared-kernel";
import { IssueInvoiceHandler } from "../handlers/IssueInvoiceHandler";
import { ApplyInvoicePaymentHandler } from "../handlers/ApplyInvoicePaymentHandler";
import { TEST_CTX, makeDeps, makeIssueCmd } from "./fakes/testKit";

describe("Application layer — concurrency (real expectedVersion contract)", () => {
  test("two concurrent payments race ⇒ one ok, one ConcurrencyConflict", async () => {
    const deps = makeDeps();
    const issueCmd = makeIssueCmd({
      lines: [{ quantity: 10, unitPriceMinor: 1000, taxBasisPoints: 0 }],
    });
    const issued = await new IssueInvoiceHandler(deps).execute(
      issueCmd,
      TEST_CTX,
    );
    expect(isOk(issued)).toBe(true);

    const handler = new ApplyInvoicePaymentHandler(deps);
    const p1 = handler.execute(
      { invoiceId: issueCmd.invoiceId, amountMinor: 1000, currencyCode: "USD" },
      TEST_CTX,
    );
    const p2 = handler.execute(
      { invoiceId: issueCmd.invoiceId, amountMinor: 1000, currencyCode: "USD" },
      TEST_CTX,
    );
    const [r1, r2] = await Promise.all([p1, p2]);

    const results = [r1, r2];
    const oks = results.filter(isOk);
    const errs = results.filter(isErr);

    expect(oks.length).toBe(1);
    expect(errs.length).toBe(1);
    expect(errs[0]!.error.kind).toBe("ConcurrencyConflict");

    // Aggregate history advanced exactly once.
    expect(deps.repository.historyOf(issueCmd.invoiceId).length).toBe(2);
  });

  test("after conflict, retry sees the new version and succeeds", async () => {
    const deps = makeDeps();
    const issueCmd = makeIssueCmd({
      lines: [{ quantity: 10, unitPriceMinor: 1000, taxBasisPoints: 0 }],
    });
    await new IssueInvoiceHandler(deps).execute(issueCmd, TEST_CTX);
    const handler = new ApplyInvoicePaymentHandler(deps);

    const [a, b] = await Promise.all([
      handler.execute(
        {
          invoiceId: issueCmd.invoiceId,
          amountMinor: 1000,
          currencyCode: "USD",
        },
        TEST_CTX,
      ),
      handler.execute(
        {
          invoiceId: issueCmd.invoiceId,
          amountMinor: 1000,
          currencyCode: "USD",
        },
        TEST_CTX,
      ),
    ]);
    expect((isOk(a) ? 1 : 0) + (isOk(b) ? 1 : 0)).toBe(1);

    // Retry: now the load returns version=2, append targets version=2 → ok.
    const retry = await handler.execute(
      { invoiceId: issueCmd.invoiceId, amountMinor: 1000, currencyCode: "USD" },
      TEST_CTX,
    );
    expect(isOk(retry)).toBe(true);
    expect(deps.repository.historyOf(issueCmd.invoiceId).length).toBe(3);
  });
});
