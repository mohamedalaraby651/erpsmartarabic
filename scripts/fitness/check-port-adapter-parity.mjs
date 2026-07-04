#!/usr/bin/env node
/**
 * check-port-adapter-parity — UX3A Wave 1, Invariant #3.
 * Every port must have a browser AND memory adapter, and adapters must NOT
 * live inside src/platform/ports/*.ts alongside the interfaces (must be under
 * src/platform/ports/adapters/{browser,memory}/), and ports must not import
 * from ./adapters/**.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const PORTS = join(ROOT, "src", "platform", "ports");

const portsRegistrySrc = readFileSync(join(PORTS, "PortRegistry.ts"), "utf8");
const declared = [...portsRegistrySrc.matchAll(/"(\w+)"/g)]
  .map((m) => m[1])
  .filter((n) => /^(notification|dialog|navigation|storage|clipboard|filePicker|share)$/.test(n));
const unique = Array.from(new Set(declared));

const violations = [];
const browserDir = join(PORTS, "adapters", "browser");
const memoryDir = join(PORTS, "adapters", "memory");

for (const port of unique) {
  const cap = port[0].toUpperCase() + port.slice(1);
  const iface = join(PORTS, `${cap}Port.ts`);
  const browser = join(browserDir, `Browser${cap}Adapter.ts`);
  const memory = join(memoryDir, `InMemory${cap}Adapter.ts`);
  if (!existsSync(iface)) violations.push(`missing interface: ${cap}Port.ts`);
  if (!existsSync(browser)) violations.push(`missing browser adapter: Browser${cap}Adapter.ts`);
  if (!existsSync(memory)) violations.push(`missing memory adapter: InMemory${cap}Adapter.ts`);
  // No-reverse-import: port interface must not import from ./adapters/
  if (existsSync(iface)) {
    const src = readFileSync(iface, "utf8");
    if (/from\s+["']\.\/adapters\//.test(src)) {
      violations.push(`port imports adapters (forbidden): ${cap}Port.ts`);
    }
  }
}

// Also verify port files don't import adapters transitively via siblings.
for (const name of readdirSync(PORTS)) {
  if (!name.endsWith("Port.ts")) continue;
  const src = readFileSync(join(PORTS, name), "utf8");
  if (/from\s+["'].*adapters\//.test(src)) {
    violations.push(`port imports adapters (forbidden): ${name}`);
  }
}

const tag = "[fitness:check-port-adapter-parity]";
if (violations.length === 0) {
  console.log(`${tag} 0 violations; ${unique.length} port(s) verified`);
  process.exit(0);
}
console.log(`${tag} ${violations.length} violation(s):`);
for (const v of violations) console.log(`  ${v}`);
process.exit(1);
