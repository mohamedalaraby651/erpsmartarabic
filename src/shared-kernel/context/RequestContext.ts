/**
 * RequestContext — immutable, propagated by reference across layers.
 *
 * tenantId, userId, correlationId, locale MUST NOT mutate post-construction.
 */

export interface RequestContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly correlationId: string;
  readonly locale: string;
}

export function createRequestContext(
  ctx: RequestContext,
): Readonly<RequestContext> {
  return Object.freeze({ ...ctx });
}
