// Builds the static mobile (Capacitor) version of the site into dist/client.
// Run with:  node scripts/build-mobile.mjs
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";

const result = spawnSync("npx", ["vite", "build"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, BUILD_TARGET: "mobile" },
});
if (result.status !== 0) process.exit(result.status ?? 1);

// Capacitor expects an index.html in the web folder; TanStack Start writes _shell.html.
if (!existsSync("dist/client/_shell.html")) {
  console.error("dist/client/_shell.html was not generated - SPA build failed.");
  process.exit(1);
}
copyFileSync("dist/client/_shell.html", "dist/client/index.html");
console.log("Mobile web build ready in dist/client");
