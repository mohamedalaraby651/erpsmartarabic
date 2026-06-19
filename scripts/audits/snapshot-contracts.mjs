#!/usr/bin/env node
/**
 * Audit — Contract snapshots + sha256 hashes (UX-1E, invariant E8).
 *
 * For each composite + its contracts, write a canonical JSON snapshot of
 * the public TypeScript surface (props + exported types) and a paired
 * sha256 hash. CI compares hashes; mismatches surface a snapshot diff.
 *
 * The snapshot is intentionally syntactic — extracted from source via
 * regex — rather than a full type checker run, because the spike must stay
 * lightweight and the snapshot must be diffable. Drift discipline is
 * preserved by the committed `.sha256` files.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const COMPOSITES = resolve(ROOT, "src/ui/composites");
const CONTRACTS = resolve(ROOT, "src/ui/contracts");
const OUT_DIR = resolve(ROOT, "docs/architecture/ux1e-evidence/snapshots");

const COMPOSITE_FILES = {
  DataGrid: "data/DataGrid.tsx",
  Form: "form/Form.tsx",
  FormDialog: "form/FormDialog.tsx",
  PageHeader: "page/PageHeader.tsx",
  StatGrid: "page/StatGrid.tsx",
  DescriptionList: "page/DescriptionList.tsx",
  EmptyState: "state/EmptyState.tsx",
  ErrorState: "state/ErrorState.tsx",
  LoadingState: "state/LoadingState.tsx",
  Pagination: "data/Pagination.tsx",
};

function extractExportedSurface(src) {
  // Capture exported interfaces / types / functions / consts (signature line only).
  const lines = [];
  const re = /^export\s+(?:default\s+)?(?:interface|type|function|const|class|enum)\s+[^\n]+$/gm;
  for (const m of src.matchAll(re)) {
    lines.push(m[0].replace(/\s+/g, " ").trim());
  }
  return lines.sort();
}

function extractInterfaceBodies(src, name) {
  // Capture interface bodies by simple brace counting.
  const out = [];
  const re = new RegExp(`export\\s+interface\\s+(\\w+)[^{]*\\{`, "g");
  let m;
  while ((m = re.exec(src)) !== null) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < src.length && depth > 0) {
      const ch = src[i++];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    const body = src.slice(m.index, i);
    out.push({ name: m[1], body: body.replace(/\s+/g, " ").trim() });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function snapshotFile(absPath, label) {
  const src = readFileSync(absPath, "utf8");
  return {
    label,
    file: absPath.split(ROOT + sep)[1]?.split(sep).join("/") ?? absPath,
    exportedSymbols: extractExportedSurface(src),
    exportedInterfaces: extractInterfaceBodies(src, label),
  };
}

const contractFiles = readdirSync(CONTRACTS)
  .filter((f) => f.endsWith(".ts") && f !== "index.ts")
  .sort();

const contracts = contractFiles.map((f) => snapshotFile(resolve(CONTRACTS, f), f.replace(/\.ts$/, "")));

mkdirSync(OUT_DIR, { recursive: true });
const hashes = {};

for (const [name, rel] of Object.entries(COMPOSITE_FILES)) {
  const snap = {
    schemaVersion: 1,
    composite: name,
    contracts,
    surface: snapshotFile(resolve(COMPOSITES, rel), name),
  };
  const json = JSON.stringify(snap, null, 2) + "\n";
  const hash = createHash("sha256").update(json).digest("hex");
  writeFileSync(resolve(OUT_DIR, `${name}.contract.snapshot.json`), json);
  writeFileSync(resolve(OUT_DIR, `${name}.contract.sha256`), `${hash}  ${name}.contract.snapshot.json\n`);
  hashes[name] = `sha256:${hash}`;
}

writeFileSync(
  resolve(OUT_DIR, "hashes.json"),
  JSON.stringify({ schemaVersion: 1, generatedFor: "ux1e-v3", hashes }, null, 2) + "\n",
);

console.log(`[audit:snapshot-contracts] OK — composites=${Object.keys(COMPOSITE_FILES).length}`);
