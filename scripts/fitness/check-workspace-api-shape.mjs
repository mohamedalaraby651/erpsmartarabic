#!/usr/bin/env node
/**
 * Fitness function — WorkspaceManifest serializability.
 *
 * Loads sample workspaces via tsx and asserts the manifest portion of every
 * `WorkspaceDefinition` round-trips through `JSON.stringify` without loss.
 * Behavior fields (commands/lifecycle/breadcrumbs) are intentionally
 * optional and excluded from manifest serialization.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "../audits/output/fitness/check-workspace-api-shape.json");

async function main() {
  // Use tsx-style dynamic import via Bun/tsx runner (invoked through bunx tsx).
  const fixturePath = resolve(ROOT, "src/ui/layout/__fixtures__/workspaces.ts");
  const mod = await import(pathToFileURL(fixturePath).href);
  const samples = mod.sampleWorkspaces;

  const violations = [];
  for (const ws of samples) {
    try {
      const manifest = {
        id: ws.id,
        name: ws.name,
        icon: ws.icon,
        permissions: ws.permissions,
        navigation: ws.navigation,
        basePath: ws.basePath,
        status: ws.status,
        meta: ws.meta,
      };
      const serialized = JSON.stringify(manifest);
      const parsed = JSON.parse(serialized);
      if (parsed.id !== ws.id) {
        violations.push({ workspace: ws.id, why: "id mismatch after round-trip" });
      }
      if (parsed.navigation.length !== ws.navigation.length) {
        violations.push({ workspace: ws.id, why: "navigation length changed" });
      }
    } catch (err) {
      violations.push({ workspace: ws.id, why: `serialization threw: ${String(err)}` });
    }
  }

  const report = {
    schemaVersion: 1,
    fitness: "check-workspace-api-shape",
    baselineVersion: "UX-1",
    samples: samples.map((s) => s.id),
    violations,
    pass: violations.length === 0,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");

  const status = report.pass ? "PASS" : "FAIL";
  console.log(
    `[fitness:workspace-api-shape] ${status} — samples=${samples.length} violations=${violations.length}`
  );
  if (!report.pass) process.exit(1);
}

main().catch((err) => {
  console.error("[fitness:workspace-api-shape] crashed:", err);
  process.exit(1);
});
