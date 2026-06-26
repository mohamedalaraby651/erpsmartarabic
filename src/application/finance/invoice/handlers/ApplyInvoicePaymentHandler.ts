/**
 * ApplyInvoicePaymentHandler — UX-2B Wave 1.
 *
 * Pipeline:
 *   1. Parse Currency + Money from the primitive DTO.
 *   2. Load the aggregate via the repository (NotFound surfaces as
 *      InvoiceApplicationError.NotFound).
 *   3. Call `invoice.applyPayment(amount, clock.now(), idPort.generate())`.
 *   4. Capture `committedVersion()` BEFORE pullEvents — this is the
 *      `expectedVersion` for optimistic concurrency.
 *   5. `repository.appendEvents(id, expectedVersion, events, ctx)`.
 *
 * Boundary: returns only `InvoiceApplicationError`. RepositoryFailure
 * (incl. Conflict, Timeout, Network, Serialization, DuplicateKey,
 * PermissionDenied, Unknown) is mechanically translated.
 */
import { ok, err, isErr } from "@/shared-kernel";
import type {
  Result,
  RequestContext,
  ClockPort,
  IdPort,
} from "@/shared-kernel";
import { Currency, Money } from "@/domain/finance";
import type { InvoiceRepository, AnyInvoiceEvent } from "@/domain/finance";
import type {
  ApplyInvoicePaymentCommand,
  ApplyInvoicePaymentResult,
} from "../commands/ApplyInvoicePaymentCommand";
import {
  fromInvoiceError,
  fromCurrencyError,
  fromRepositoryFailure,
} from "../errors/InvoiceApplicationError";
import type { InvoiceApplicationError } from "../errors/InvoiceApplicationError";

export interface ApplyInvoicePaymentHandlerDeps {
  readonly repository: InvoiceRepository;
  readonly clock: ClockPort;
  readonly idPort: IdPort;
}

export class ApplyInvoicePaymentHandler {
  readonly #deps: ApplyInvoicePaymentHandlerDeps;

  constructor(deps: ApplyInvoicePaymentHandlerDeps) {
    this.#deps = deps;
  }

  async execute(
    cmd: ApplyInvoicePaymentCommand,
    ctx: Readonly<RequestContext>,
  ): Promise<Result<ApplyInvoicePaymentResult, InvoiceApplicationError>> {
    // 1. Parse VOs
    const currencyR = Currency.of(cmd.currencyCode);
    if (isErr(currencyR)) return err(fromCurrencyError(currencyR.error));
    const amountR = Money.of(cmd.amountMinor, currencyR.value);
    if (isErr(amountR)) return err(fromInvoiceError(amountR.error));

    // 2. Load
    const loadR = await this.#deps.repository.load(cmd.invoiceId, ctx);
    if (isErr(loadR)) {
      return err(fromRepositoryFailure(loadR.error, String(cmd.invoiceId)));
    }
    const invoice = loadR.value;

    // 3. Apply payment
    const now = this.#deps.clock.now();
    const eventId = this.#deps.idPort.generate<"DomainEvent">();
    const applyR = invoice.applyPayment(amountR.value, now, eventId);
    if (isErr(applyR)) return err(fromInvoiceError(applyR.error));

    // 4 + 5. Persist (expectedVersion BEFORE pullEvents)
    const expectedVersion = invoice.committedVersion();
    const events: readonly AnyInvoiceEvent[] = invoice.pullEvents();
    const appendR = await this.#deps.repository.appendEvents(
      cmd.invoiceId,
      expectedVersion,
      events,
      ctx,
    );
    if (isErr(appendR)) {
      return err(fromRepositoryFailure(appendR.error, String(cmd.invoiceId)));
    }

    return ok({
      invoiceId: cmd.invoiceId,
      newVersion: expectedVersion + events.length,
      status: invoice.status(),
    });
  }
}
