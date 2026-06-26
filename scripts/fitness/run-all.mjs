#!/usr/bin/env node
/**
 * Run the full UX-2 fitness suite end-to-end.
 * Active checks fail the run on violation; pending checks always pass.
 *
 * Wave 7 (UX-2A): activated 8 previously-pending checks + 2 new ones
 * (`check-domain-api-stability`, `check-domain-bigint-boundary`).
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ACTIVE = [
  // Wave 0..4
  "check-temporal-authority.mjs",
  "check-identity-authority.mjs",
  "check-retryability-single-source.mjs",
  "check-no-deep-imports.mjs",
  // Wave 5
  "check-aggregate-boundaries.mjs",
  "check-domain-events-immutable.mjs",
  // Wave 7 (Step 6+)
  "check-domain-purity.mjs",
  "check-domain-service-purity.mjs",
  "check-error-mapping.mjs",
  "check-repository-failure-taxonomy.mjs",
  "check-handler-signature.mjs",
  "check-ui-infrastructure-isolation.mjs",
  "check-composition-root-uniqueness.mjs",
  "check-transaction-finality.mjs",
  "check-domain-api-stability.mjs",
  "check-domain-bigint-boundary.mjs",
  // Wave 8 (G2)
  "check-domain-strictness.mjs",
  // UX-2B Wave 1
  "check-application-purity.mjs",
  // UX-2B Wave 1.5
  "check-application-surface.mjs",
  "check-adapter-error-boundary.mjs",
];

const PENDING = [];

let failed = 0;
for (const name of [...ACTIVE, ...PENDING]) {
  const r = spawnSync(process.execPath, [resolve(__dirname, name)], {
    stdio: "inherit",
  });
  if (r.status !== 0) failed++;
}

console.log("");
console.log(
  `[fitness:run-all] active=${ACTIVE.length} pending=${PENDING.length} failures=${failed}`,
);
process.exit(failed === 0 ? 0 : 1);
