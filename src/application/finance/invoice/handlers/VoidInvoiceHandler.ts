/**
 * VoidInvoiceHandler — UX-2B Wave 1.
 *
 * Loads the aggregate, calls `invoice.void(reason, now, eventId, reasonCode)`,
 * and persists the resulting event. Reason trimming + length validation
 * happens inside the aggregate (Lock L5).
 */
import { ok, err, isErr } from "@/shared-kernel";
import type {
  Result,
  RequestContext,
  ClockPort,
  IdPort,
} from "@/shared-kernel";
import type {
  InvoiceRepository,
  AnyInvoiceEvent,
  VoidReasonCode,
} from "@/domain/finance";
import type {
  VoidInvoiceCommand,
  VoidInvoiceResult,
} from "../commands/VoidInvoiceCommand";
import {
  fromInvoiceError,
  fromRepositoryFailure,
} from "../errors/InvoiceApplicationError";
import type { InvoiceApplicationError } from "../errors/InvoiceApplicationError";

export interface VoidInvoiceHandlerDeps {
  readonly repository: InvoiceRepository;
  readonly clock: ClockPort;
  readonly idPort: IdPort;
}

export class VoidInvoiceHandler {
  readonly #deps: VoidInvoiceHandlerDeps;

  constructor(deps: VoidInvoiceHandlerDeps) {
    this.#deps = deps;
  }

  async execute(
    cmd: VoidInvoiceCommand,
    ctx: Readonly<RequestContext>,
  ): Promise<Result<VoidInvoiceResult, InvoiceApplicationError>> {
    const loadR = await this.#deps.repository.load(cmd.invoiceId, ctx);
    if (isErr(loadR)) {
      return err(fromRepositoryFailure(loadR.error, String(cmd.invoiceId)));
    }
    const invoice = loadR.value;

    const now = this.#deps.clock.now();
    const eventId = this.#deps.idPort.generate<"DomainEvent">();
    const reasonCode: VoidReasonCode = cmd.reasonCode ?? "Other";
    const voidR = invoice.void(cmd.reason, now, eventId, reasonCode);
    if (isErr(voidR)) return err(fromInvoiceError(voidR.error));

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
      status: "Void",
    });
  }
}
