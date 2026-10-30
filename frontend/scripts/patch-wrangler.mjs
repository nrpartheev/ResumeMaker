/**
 * patch-wrangler.mjs
 *
 * Runs after `vite build`. The @cloudflare/vite-plugin generates a
 * dist/client/wrangler.json that has no `main` field (assets-only mode),
 * which causes every route to 404 on Cloudflare Workers.
 *
 * This script patches the generated wrangler.json to:
 *   1. Set `main` to the SSR server entry (../server/server.js)
 *   2. Fix the `name` to match the Cloudflare project name
 *   3. Ensure assets directory is correct
 *   4. Add nodejs_compat flag (required for node:async_hooks, node:stream, etc.)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const wranglerPath = resolve(__dirname, "../dist/client/wrangler.json");

let config;
try {
  config = JSON.parse(readFileSync(wranglerPath, "utf-8"));
} catch {
  console.error("patch-wrangler: could not read", wranglerPath);
  process.exit(1);
}

// Patch the config
config.name = "resumemaker";
config.main = "../server/server.js";
config.assets = { directory: "." };

// Required for node:async_hooks, node:stream, node:stream/web used by TanStack Start SSR
config.compatibility_flags = [
  ...new Set([...(config.compatibility_flags ?? []), "nodejs_compat"]),
];

// Remove keys that conflict with Worker mode
delete config.topLevelName;
delete config.dev;

writeFileSync(wranglerPath, JSON.stringify(config, null, 2));
console.log("patch-wrangler: patched dist/client/wrangler.json ✓");
console.log("  name:", config.name);
console.log("  main:", config.main);
console.log("  assets.directory:", config.assets.directory);
console.log("  compatibility_flags:", config.compatibility_flags);
