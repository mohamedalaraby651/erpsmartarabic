#!/usr/bin/env node
/**
 * component-duplication.mjs — Wave 2 discovery (DS-notes #3).
 * Computes a lightweight AST-free signature for each React component
 * (exported prop names + JSX element histogram) and emits a similarity
 * score between candidate duplicates (Button, Badge, Card, Modal,
 * Dialog, Input variants). Higher score = stronger deletion candidate.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "scripts/audits/output/wave2-discovery");
const EXTS = new Set([".tsx"]);
const TARGETS = /(Button|Badge|Card|Modal|Dialog|Input|Alert|Toast)/;

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (name === "__tests__" || name === "__demo__") continue;
      walk(full, acc);
    } else if (EXTS.has(extname(name))) acc.push(full);
  }
  return acc;
}

function signature(src) {
  const props = new Set();
  for (const m of src.matchAll(/interface\s+\w*Props[^{]*\{([^}]*)\}/g)) {
    for (const p of m[1].matchAll(/(\w+)\s*[?:]/g)) props.add(p[1]);
  }
  const jsx = {};
  for (const m of src.matchAll(/<([A-Z]\w+)/g)) jsx[m[1]] = (jsx[m[1]] ?? 0) + 1;
  return { props: [...props].sort(), jsx };
}

function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni === 0 ? 0 : inter / uni;
}

function cosineHist(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, na = 0, nb = 0;
  for (const k of keys) { const x = a[k] ?? 0, y = b[k] ?? 0; dot += x * y; na += x * x; nb += y * y; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

const files = walk(SRC).filter((f) => TARGETS.test(f));
const sigs = files.map((f) => ({ file: relative(ROOT, f).replace(/\\/g, "/"), ...signature(readFileSync(f, "utf8")) }));

const pairs = [];
for (let i = 0; i < sigs.length; i++) {
  for (let j = i + 1; j < sigs.length; j++) {
    const nameA = sigs[i].file.split("/").pop();
    const nameB = sigs[j].file.split("/").pop();
    // Only compare same-family components (Button vs Button, etc.)
    const famA = (nameA.match(TARGETS) || [])[0];
    const famB = (nameB.match(TARGETS) || [])[0];
    if (!famA || famA !== famB) continue;
    const propScore = jaccard(sigs[i].props, sigs[j].props);
    const jsxScore = cosineHist(sigs[i].jsx, sigs[j].jsx);
    const score = Math.round((0.6 * propScore + 0.4 * jsxScore) * 100);
    if (score >= 40) pairs.push({ family: famA, a: sigs[i].file, b: sigs[j].file, similarity: score, propScore: Math.round(propScore * 100), jsxScore: Math.round(jsxScore * 100) });
  }
}
pairs.sort((x, y) => y.similarity - x.similarity);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "component-duplication.json"), JSON.stringify({ generatedAt: new Date().toISOString(), pairs }, null, 2));
console.log(`[component-duplication] ${pairs.length} candidate duplicate pairs (score >= 40)`);
