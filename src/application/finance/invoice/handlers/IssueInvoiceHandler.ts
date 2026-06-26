/**
 * IssueInvoiceHandler — application-layer use case (UX-2B Wave 1).
 *
 * Reviewer-locked contract:
 *   - Returns `Promise<Result<IssueInvoiceResult, InvoiceApplicationError>>`.
 *     No DomainError, no RepositoryFailure, no InfrastructureFailure leaks.
 *   - Pure orchestrator:
 *       1. parse primitives into Value Objects (Currency, Money, TaxRate,
 *          InvoiceNumber, InvoiceLine[])
 *       2. construct the aggregate via `Invoice.create`
 *       3. add each line; issue() it
 *       4. read `committedVersion()` (= 0 for a brand-new aggregate)
 *       5. append events via the repository with the same expectedVersion
 *   - Time is obtained ONLY via `ClockPort`; identity ONLY via `IdPort`.
 *     No raw Date constructor, no Math/random, no crypto UUID.
 *   - Never throws. Every failure is a Result.
 */
import { ok, err, isErr, isOk } from "@/shared-kernel";
import type {
  Result,
  RequestContext,
  ClockPort,
  IdPort,
} from "@/shared-kernel";
import {
  Currency,
  Money,
  TaxRate,
  Invoice,
  InvoiceLine,
  InvoiceNumber,
} from "@/domain/finance";
import type { InvoiceRepository, AnyInvoiceEvent } from "@/domain/finance";
import type {
  IssueInvoiceCommand,
  IssueInvoiceResult,
} from "../commands/IssueInvoiceCommand";
import {
  fromInvoiceError,
  fromCurrencyError,
  fromTaxRateError,
  fromInvoiceNumberError,
  fromRepositoryFailure,
  validationError,
  ERR,
} from "../errors/InvoiceApplicationError";
import type { InvoiceApplicationError } from "../errors/InvoiceApplicationError";

export interface IssueInvoiceHandlerDeps {
  readonly repository: InvoiceRepository;
  readonly clock: ClockPort;
  readonly idPort: IdPort;
}

export class IssueInvoiceHandler {
  readonly #deps: IssueInvoiceHandlerDeps;

  constructor(deps: IssueInvoiceHandlerDeps) {
    this.#deps = deps;
  }

  async execute(
    cmd: IssueInvoiceCommand,
    ctx: Readonly<RequestContext>,
  ): Promise<Result<IssueInvoiceResult, InvoiceApplicationError>> {
    // ─── 1. Parse primitive DTO into Value Objects ──────────────────────
    if (!Array.isArray(cmd.lines) || cmd.lines.length === 0) {
      return err(validationError(ERR.INVALID_COMMAND, "lines"));
    }

    const currencyR = Currency.of(cmd.currencyCode);
    if (isErr(currencyR)) return err(fromCurrencyError(currencyR.error));
    const currency = currencyR.value;

    const numberR = InvoiceNumber.of(cmd.number);
    if (isErr(numberR)) return err(fromInvoiceNumberError(numberR.error));

    const lines: InvoiceLine[] = [];
    for (let i = 0; i < cmd.lines.length; i++) {
      const input = cmd.lines[i]!;
      const priceR = Money.of(input.unitPriceMinor, currency);
      if (isErr(priceR)) return err(fromInvoiceError(priceR.error));
      const taxR = TaxRate.of(input.taxBasisPoints);
      if (isErr(taxR)) return err(fromTaxRateError(taxR.error));
      const lineR = InvoiceLine.of({
        qty: input.quantity,
        unitPrice: priceR.value,
        taxRate: taxR.value,
      });
      if (isErr(lineR)) return err(fromInvoiceError(lineR.error));
      lines.push(lineR.value);
    }

    // ─── 2. Construct the aggregate ─────────────────────────────────────
    const baseProps = {
      id: cmd.invoiceId,
      number: numberR.value,
      currency,
    };
    const props =
      cmd.customerId === undefined
        ? baseProps
        : { ...baseProps, customerId: cmd.customerId };
    const aggR = Invoice.create(props);
    if (isErr(aggR)) return err(fromInvoiceError(aggR.error));
    const invoice = aggR.value;

    // ─── 3. Add lines + issue ───────────────────────────────────────────
    for (const line of lines) {
      const addR = invoice.addLine(line);
      if (isErr(addR)) return err(fromInvoiceError(addR.error));
    }

    const now = this.#deps.clock.now();
    const issueEventId = this.#deps.idPort.generate<"DomainEvent">();
    const issuedR = invoice.issue(now, issueEventId);
    if (isErr(issuedR)) return err(fromInvoiceError(issuedR.error));

    // ─── 4. Capture expectedVersion BEFORE pullEvents ───────────────────
    // For a brand-new aggregate this is always 0 (Contract Gap D5).
    const expectedVersion = invoice.committedVersion();
    const events: readonly AnyInvoiceEvent[] = invoice.pullEvents();

    // ─── 5. Persist through the repository port ─────────────────────────
    const appendR = await this.#deps.repository.appendEvents(
      cmd.invoiceId,
      expectedVersion,
      events,
      ctx,
    );
    if (isErr(appendR)) {
      return err(fromRepositoryFailure(appendR.error, String(cmd.invoiceId)));
    }
    // Sanity: at least one event was produced.
    if (!isOk(appendR) || events.length === 0) {
      return err(validationError(ERR.INVALID_COMMAND, "events"));
    }

    return ok({
      invoiceId: cmd.invoiceId,
      newVersion: expectedVersion + events.length,
      status: "Issued",
    });
  }
}
