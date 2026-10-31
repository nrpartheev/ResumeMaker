/**
 * patch-wrangler.mjs
 *
 * Runs after `vite build`. Patches the generated wrangler.json to wire
 * SSR server entry + nodejs_compat flag for Cloudflare Workers deploy.
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

config.name = "resumemaker";
config.main = "../server/server.js";
config.assets = { directory: "." };
config.compatibility_flags = [
  ...new Set([...(config.compatibility_flags ?? []), "nodejs_compat"]),
];
delete config.topLevelName;
delete config.dev;

writeFileSync(wranglerPath, JSON.stringify(config, null, 2));
console.log("patch-wrangler: patched dist/client/wrangler.json ✓");
console.log("  name:", config.name);
console.log("  main:", config.main);
console.log("  compatibility_flags:", config.compatibility_flags);
