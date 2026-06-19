/**
 * Accessibility helpers shared by primitives.
 * Internal utility; not exported from `@/ui`.
 *
 * @canonicalState Canonical
 * @adr ADR-0003
 * @since UX-1C
 */

/** Tailwind class for visually-hidden but screen-reader-accessible content. */
export const visuallyHiddenClass =
  "absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0_0_0_0)]";

/** Asserts that an icon-only control has an accessible name in dev. */
export function assertAccessibleName(
  componentName: string,
  props: { "aria-label"?: string; "aria-labelledby"?: string; title?: string },
) {
  if (import.meta.env?.PROD) return;
  const hasName =
    !!props["aria-label"] || !!props["aria-labelledby"] || !!props.title;
  if (!hasName) {
    // eslint-disable-next-line no-console -- allow-console: sink/logger
    console.warn(
      `[ui-primitives] ${componentName}: missing accessible name (aria-label, aria-labelledby, or title).`,
    );
  }
}
