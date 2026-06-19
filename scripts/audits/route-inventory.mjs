#!/usr/bin/env node
// scripts/audits/route-inventory.mjs
// UX-0: Parses src/App.tsx <Route /> definitions into a flat report.
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const APP = resolve(ROOT, "src/App.tsx");
const OUT = resolve(__dirname, "output/route-report.json");

const src = readFileSync(APP, "utf8");
const re = /<Route\s+(?:index\s+)?(?:path="([^"]+)"\s+)?element=\{<(\w+)/g;
const routes = [];
let m;
while ((m = re.exec(src))) {
  const [, path, element] = m;
  routes.push({ path: path ?? "(index)", element });
}

function workspaceOf(p) {
  if (!p || p === "(index)") return "dashboard";
  if (p.startsWith("/platform")) return "platform";
  if (p.startsWith("/dev")) return "dev";
  if (p.startsWith("admin")) return "admin";
  const seg = p.replace(/^\//, "").split("/")[0];
  if (["invoices", "payments", "credit-notes", "treasury", "expenses", "accounting", "collections", "supplier-payments"].includes(seg)) return "finance";
  if (["customers", "sales-orders", "quotes", "quotations", "sales-pipeline"].includes(seg)) return "sales";
  if (["products", "categories", "inventory", "price-lists"].includes(seg)) return "inventory";
  if (["suppliers", "purchase-orders", "purchase-invoices", "goods-receipts", "delivery-notes"].includes(seg)) return "procurement";
  if (["employees", "attendance"].includes(seg)) return "hr";
  if (["reports", "kpis"].includes(seg)) return "reports";
  if (["settings", "notifications", "search", "tasks", "approvals", "attachments", "profile", "sync", "install"].includes(seg)) return "system";
  if (["auth", "forgot-password", "reset-password", "landing"].includes(seg)) return "auth";
  return "other";
}

function requiresAuth(p) {
  if (!p || p === "(index)") return true;
  if (["/auth", "/landing", "/forgot-password", "/reset-password"].includes(p)) return false;
  return true;
}

const enriched = routes.map(r => ({
  route: r.path,
  element: r.element,
  workspace: workspaceOf(r.path),
  requiresAuth: requiresAuth(r.path),
  permission: r.path.startsWith("admin") || r.path.startsWith("/platform") ? "admin" : "user",
  dataSources: [],
  mainRepository: null,
  workflowCandidate: ["invoices", "purchase-invoices", "quotations", "credit-notes", "sales-orders", "purchase-orders", "goods-receipts", "delivery-notes", "approvals"].some(s => (r.path ?? "").includes(s)),
})).sort((a, b) => a.route.localeCompare(b.route));

const byWorkspace = {};
for (const r of enriched) byWorkspace[r.workspace] = (byWorkspace[r.workspace] ?? 0) + 1;

const report = {
  schemaVersion: 1,
  baselineVersion: "UX-0",
  totalRoutes: enriched.length,
  byWorkspace,
  workflowCandidates: enriched.filter(r => r.workflowCandidate).length,
  routes: enriched,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`[routes] ${enriched.length} routes → ${OUT}`);
