#!/usr/bin/env node
/**
 * Run the full UX-2 fitness suite end-to-end.
 * Active checks fail the run on violation; pending checks always pass.
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ACTIVE = [
  "check-temporal-authority.mjs",
  "check-identity-authority.mjs",
  "check-retryability-single-source.mjs",
  "check-no-deep-imports.mjs",
];

const PENDING = [
  "check-domain-purity.mjs",
  "check-domain-service-purity.mjs",
  "check-aggregate-boundaries.mjs",
  "check-domain-events-immutable.mjs",
  "check-error-mapping.mjs",
  "check-repository-failure-taxonomy.mjs",
  "check-handler-signature.mjs",
  "check-ui-infrastructure-isolation.mjs",
  "check-composition-root-uniqueness.mjs",
  "check-transaction-finality.mjs",
];

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
