// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import path from "node:path";
import fs from "node:fs";
import type { Plugin } from "vite";

// Build stamp computed once per build (EnvironmentBadge / AboutSystemCard / update detection).
const BUILD_TIME = new Date().toISOString();
const BUILD_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Emits /version.json with the same buildId/buildTime inlined into the bundle. */
function versionJsonPlugin(): Plugin {
  return {
    name: "lvbl-version-json",
    configResolved() {
      try {
        const publicDir = path.resolve(process.cwd(), "public");
        if (fs.existsSync(publicDir)) {
          fs.writeFileSync(
            path.join(publicDir, "version.json"),
            JSON.stringify({ buildId: BUILD_ID, buildTime: BUILD_TIME }, null, 2),
          );
        }
      } catch {
        /* non-fatal */
      }
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      __BUILD_TIME__: JSON.stringify(BUILD_TIME),
      __BUILD_ID__: JSON.stringify(BUILD_ID),
    },
    plugins: [versionJsonPlugin(), mcpPlugin()],
  },
});
