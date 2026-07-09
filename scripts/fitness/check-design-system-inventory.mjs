#!/usr/bin/env node
/**
 * check-design-system-inventory.mjs — Wave 2 fitness (warn mode).
 * Runs `design-system-inventory.mjs` and fails when the total findings
 * count exceeds the pinned budget (Wave 2 close: 0).
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ENFORCING = process.env.CHECK_DS_INVENTORY_ENFORCE === "1";
const BUDGET = Number(process.env.CHECK_DS_INVENTORY_BUDGET ?? Number.POSITIVE_INFINITY);

const r = spawnSync(process.execPath, [join(ROOT, "scripts/audits/design-system-inventory.mjs")], { encoding: "utf8" });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }

let report;
try { report = JSON.parse(readFileSync(join(ROOT, "scripts/audits/output/wave2-discovery/design-system-inventory.json"), "utf8")); }
catch { console.log("[check-design-system-inventory] WARN — inventory not yet generated"); process.exit(0); }

const total = Object.values(report.totals).reduce((a, b) => a + b, 0);
const mode = ENFORCING ? "ENFORCING" : "WARN";
console.log(`[check-design-system-inventory] ${mode} — total findings=${total} budget=${Number.isFinite(BUDGET) ? BUDGET : "∞"}`);
process.exit(ENFORCING && total > BUDGET ? 1 : 0);
