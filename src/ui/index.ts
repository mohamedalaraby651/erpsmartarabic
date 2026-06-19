/**
 * `src/ui` public surface — UX-1A.
 *
 * Only the design token API and canonical primitives are exported here.
 * Shell, workspace, contract, and data-layer code arrive in later waves.
 */

export * from "./tokens";
export { Button, buttonVariants, type ButtonProps } from "./primitives/Button";
