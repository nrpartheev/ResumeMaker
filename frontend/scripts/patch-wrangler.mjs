/**
 * patch-wrangler.mjs
 *
 * Runs after `vite build`:
 * 1. Patches the generated wrangler.json to wire SSR server entry + nodejs_compat
 * 2. Downloads WasmTex engine assets to dist/client/wasmtex/ for static serving
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// 1. Patch wrangler.json
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 2. Ensure wasmtex assets are in dist/client/wasmtex/2025/
//    Vite copies from public/ automatically, but verify they exist.
//    If missing (e.g. fresh clone without public/wasmtex), download them.
// ---------------------------------------------------------------------------

const destAssets = resolve(__dirname, "../dist/client/wasmtex/2025");

if (!existsSync(destAssets) || !existsSync(resolve(destAssets, "manifest.json"))) {
  console.log("patch-wrangler: wasmtex assets missing, downloading...");
  mkdirSync(destAssets, { recursive: true });
  try {
    execSync(
      `git clone --depth 1 https://github.com/corca-ai/wasmtex.git /tmp/wasmtex-clone && ` +
      `cd /tmp/wasmtex-clone && ` +
      `node scripts/sync-engine-assets.mjs --from https://corca-ai.github.io/wasmtex/ --version 2025 --dest ${destAssets}`,
      { stdio: "inherit", timeout: 180000 }
    );
    console.log("patch-wrangler: wasmtex assets downloaded ✓");
  } catch (e) {
    console.error("patch-wrangler: failed to download wasmtex assets");
    console.error("  LaTeX compilation will not work without these assets.");
  }
} else {
  console.log("patch-wrangler: wasmtex assets already present ✓");
}
