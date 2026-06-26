import { createRequestContext, unsafeId } from "@/shared-kernel";
import type { RequestContext } from "@/shared-kernel";
import type { InvoiceId, CustomerId } from "@/domain/finance";
import type { IssueInvoiceCommand } from "../../commands";
import { FakeClock } from "./FakeClock";
import { FakeIdPort } from "./FakeIdPort";
import { InMemoryInvoiceRepository } from "./InMemoryInvoiceRepository";

export const TEST_CTX: Readonly<RequestContext> = createRequestContext({
  tenantId: "tenant-test",
  userId: "user-test",
  correlationId: "corr-test",
  locale: "en-US",
});

export function makeDeps(): {
  repository: InMemoryInvoiceRepository;
  clock: FakeClock;
  idPort: FakeIdPort;
} {
  return {
    repository: new InMemoryInvoiceRepository(),
    clock: new FakeClock(),
    idPort: new FakeIdPort(),
  };
}

export function makeInvoiceId(s = "inv-1"): InvoiceId {
  return unsafeId<"InvoiceId">(s);
}

export function makeCustomerId(s = "cust-1"): CustomerId {
  return unsafeId<"CustomerId">(s);
}

export function makeIssueCmd(
  overrides: Partial<IssueInvoiceCommand> = {},
): IssueInvoiceCommand {
  return {
    invoiceId: overrides.invoiceId ?? makeInvoiceId(),
    number: overrides.number ?? "INV-001",
    currencyCode: overrides.currencyCode ?? "USD",
    ...(overrides.customerId !== undefined
      ? { customerId: overrides.customerId }
      : {}),
    lines: overrides.lines ?? [
      { quantity: 2, unitPriceMinor: 5000, taxBasisPoints: 1500 },
    ],
  };
}
