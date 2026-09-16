#!/usr/bin/env node
/**
 * action-triage.mjs — OPA-ACT-001 triage.
 *
 * Re-scans every `<Button` occurrence that the operational audit flagged as
 * "no direct handler" and classifies it with surrounding context:
 *   - demo        : demo/dev-only surface, not user-facing
 *   - trigger     : wrapped by a Radix *Trigger asChild (handler owned by parent)
 *   - submit      : inside a <form onSubmit=...> (native submit)
 *   - link        : wraps a <Link>/<a>
 *   - review      : no explanation found → genuine dead-action candidate
 *
 * Verification-only: writes JSON + markdown, mutates no product source.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "scripts/audits/output");
const EXTS = new Set([".tsx"]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, acc);
    else if (EXTS.has(extname(name))) acc.push(relative(ROOT, full).replace(/\\/g, "/"));
  }
  return acc;
}

const WIRED = /<Button(?=[^>]*(onClick|asChild|type="submit"|type='submit'|form=))/;
const TRIGGER = /(DialogTrigger|AlertDialogTrigger|PopoverTrigger|DropdownMenuTrigger|TooltipTrigger|SheetTrigger|DrawerTrigger|CollapsibleTrigger|HoverCardTrigger|AccordionTrigger|TabsTrigger|SelectTrigger|MenubarTrigger|ContextMenuTrigger)[^>]*asChild/;

const rows = [];
for (const file of walk(SRC)) {
  const text = readFileSync(join(ROOT, file), "utf8");
  if (!text.includes("<Button")) continue;
  const lines = text.split("\n");
  const hasForm = /<form[^>]*onSubmit/.test(text);
  const isDemo = /__demo__|\/dev\/|Gallery|LivePreview/.test(file);

  lines.forEach((line, i) => {
    if (!/<Button[\s>]/.test(line)) return;
    // Look ahead: a multi-line tag may carry the handler on following lines.
    const tag = lines.slice(i, i + 6).join(" ").split(">")[0] + ">";
    if (WIRED.test(tag)) return;

    const before = lines.slice(Math.max(0, i - 4), i).join(" ");
    const after = lines.slice(i, i + 8).join(" ");
    let kind = "review";
    if (isDemo) kind = "demo";
    else if (TRIGGER.test(before)) kind = "trigger";
    else if (/<(Link|a)\s/.test(after)) kind = "link";
    else if (hasForm) kind = "submit";

    rows.push({ file, line: i + 1, kind, snippet: line.trim().slice(0, 120) });
  });
}

const byKind = rows.reduce((acc, r) => ((acc[r.kind] = (acc[r.kind] ?? 0) + 1), acc), {});
const review = rows.filter((r) => r.kind === "review");

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, "action-triage.json"),
  JSON.stringify({ id: "OPA-ACT-001-TRIAGE", generatedAt: new Date().toISOString(), total: rows.length, byKind, review, rows }, null, 2),
);
console.log(`[action-triage] total=${rows.length}`, byKind);
for (const r of review) console.log(`  REVIEW ${r.file}:${r.line} ${r.snippet}`);
