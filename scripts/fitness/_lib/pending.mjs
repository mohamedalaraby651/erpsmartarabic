/**
 * Helper for Pending fitness checks scaffolded in Step 1.
 * Emits a runnable PENDING report (exit code 0) until the corresponding
 * layer/contract lands in a later step.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function emitPending(name, outPath, note) {
  const report = {
    schemaVersion: 1,
    fitness: name,
    pending: true,
    pass: true,
    note: note ?? "Scaffolded in Step 1; activated in a later step.",
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`[fitness:${name}] PENDING — ${report.note}`);
}
