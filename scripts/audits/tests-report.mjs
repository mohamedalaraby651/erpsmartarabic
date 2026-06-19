#!/usr/bin/env node
// scripts/audits/tests-report.mjs — captures Vitest pass count from a non-mutating run.
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "output/tests-report.json");

let out = "", failed = 0, passed = 0, total = 0, ran = true;
try {
  out = execSync("bunx vitest run --reporter=default --silent", { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
} catch (e) {
  out = (e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? "");
}
const mp = out.match(/Tests\s+(?:(\d+)\s+failed.*?\|\s*)?(\d+)\s+passed(?:\s+\((\d+)\))?/);
if (mp) { failed = +(mp[1] ?? 0); passed = +mp[2]; total = +(mp[3] ?? (passed + failed)); }
else ran = false;

const report = {
  schemaVersion: 1,
  baselineVersion: "UX-0",
  vitest: { ran, passed, failed, total },
  hardStopTriggered: passed > 0 && passed < 1187,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`[tests] passed=${passed} failed=${failed} total=${total} → ${OUT}`);
