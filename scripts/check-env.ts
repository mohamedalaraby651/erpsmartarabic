/**
 * Pre-build environment validator.
 *
 * Prints the values of every variable required for a healthy build and
 * exits with a non-zero status (blocking `vite build`) if any required
 * value is missing or fails its format check.
 *
 * Wired into the `prebuild` hook via scripts/generate-sitemap.ts so it
 * runs automatically before every `vite build` and `vite dev`.
 *
 * Override with --warn to print problems without failing
 * (useful for local debugging).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

type Severity = "required" | "optional";

interface EnvCheck {
  name: string;
  severity: Severity;
  /** Optional regex the value must match. */
  pattern?: RegExp;
  /** What this var is used for, shown on failure. */
  description: string;
  /** Mask the printed value (e.g. for API keys). */
  secret?: boolean;
}

const CHECKS: EnvCheck[] = [
  {
    name: "VITE_SUPABASE_URL",
    severity: "required",
    pattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i,
    description: "Lovable Cloud REST endpoint (used by the Supabase client + og-image URL builder).",
  },
  {
    name: "VITE_SUPABASE_PUBLISHABLE_KEY",
    severity: "required",
    pattern: /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    description: "Public anon JWT for the Supabase client.",
    secret: true,
  },
  {
    name: "VITE_SUPABASE_PROJECT_ID",
    severity: "required",
    pattern: /^[a-z0-9]{16,}$/i,
    description: "Lovable Cloud project ref (used to construct edge-function URLs).",
  },
  {
    name: "VITE_OG_IMAGE_VERSION",
    severity: "optional",
    pattern: /^[A-Za-z0-9._-]{1,16}$/,
    description: "Cache-busting version appended to /public/og-*.jpg URLs. Defaults to '2' when unset.",
  },
];

function loadDotEnv(): Record<string, string> {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function mask(value: string): string {
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 4)}…${value.slice(-4)} (${value.length} chars)`;
}

const warnOnly = process.argv.includes("--warn");
const dotenv = loadDotEnv();
const errors: string[] = [];

console.log("\n🔍 Environment check (prebuild)\n");

for (const check of CHECKS) {
  const value = (process.env[check.name] ?? dotenv[check.name] ?? "").trim();
  const display = value ? (check.secret ? mask(value) : value) : "(empty)";
  const tagColor = check.severity === "required" ? "\x1b[31m" : "\x1b[33m";
  const reset = "\x1b[0m";
  const ok = "\x1b[32m✓\x1b[0m";
  const bad = `${tagColor}✗${reset}`;

  if (!value) {
    if (check.severity === "required") {
      errors.push(`${check.name} is empty — ${check.description}`);
      console.log(`  ${bad} ${check.name.padEnd(32)} ${display}`);
    } else {
      console.log(`  ${ok} ${check.name.padEnd(32)} (using default) — ${check.description}`);
    }
    continue;
  }

  if (check.pattern && !check.pattern.test(value)) {
    const msg = `${check.name} has invalid format (expected ${check.pattern}). Current: ${display}`;
    if (check.severity === "required") errors.push(msg);
    console.log(`  ${bad} ${check.name.padEnd(32)} ${display}`);
    continue;
  }

  console.log(`  ${ok} ${check.name.padEnd(32)} ${display}`);
}

console.log("");

if (errors.length === 0) {
  console.log("✅ All environment variables look good.\n");
  process.exit(0);
}

console.error("❌ Environment validation failed:\n");
for (const err of errors) console.error(`   • ${err}`);
console.error(
  "\n   Fix these before deploying. .env is auto-managed by Lovable Cloud — " +
    "if values are missing, reconnect Cloud or add them in Project Settings.\n",
);

if (warnOnly) {
  console.warn("⚠️  --warn flag set: continuing despite errors.\n");
  process.exit(0);
}

process.exit(1);
