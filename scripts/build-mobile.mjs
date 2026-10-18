// Builds the static mobile (Capacitor) version of the site into dist/client.
// Run with:  node scripts/build-mobile.mjs
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";

// ---- Clean up values that were pasted into GitHub secrets -------------------
function cleanValue(raw) {
  let v = String(raw ?? "").trim();
  // Whole line pasted, e.g.  VITE_SUPABASE_URL="https://xxxx.supabase.co"
  const line = v.match(/^[A-Za-z0-9_]+\s*=\s*([\s\S]*)$/);
  if (line) v = line[1];
  v = v.trim().replace(/^["'`]+|["'`]+$/g, "");
  return v.replace(/\s+/g, ""); // URLs and keys never contain spaces / line breaks
}

const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (key.startsWith("VITE_")) env[key] = cleanValue(env[key]);
}

function projectIdFromUrl(url) {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "";
  }
}

let url = env.VITE_SUPABASE_URL ?? "";
const projectId = env.VITE_SUPABASE_PROJECT_ID ?? "";
if (url && !/^https?:\/\//i.test(url)) {
  if (url.includes(".")) url = `https://${url}`; // missing https://
  else if (/^[a-z0-9]{15,30}$/i.test(url)) url = `https://${url}.supabase.co`; // only the project id
}
if (!isValidUrl(url) && /^[a-z0-9]{15,30}$/i.test(projectId)) {
  url = `https://${projectId}.supabase.co`; // fall back to the project id secret
}
// Keep only the base address: https://xxxx.supabase.co (drops things like /rest/v1/ or a trailing slash)
if (isValidUrl(url)) url = new URL(url).origin;
env.VITE_SUPABASE_URL = url;
if (!projectId && isValidUrl(url)) env.VITE_SUPABASE_PROJECT_ID = projectIdFromUrl(url);

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

if (!isValidUrl(env.VITE_SUPABASE_URL)) {
  // Describe the problem without printing the value.
  const raw = process.env.VITE_SUPABASE_URL ?? "";
  console.error("VITE_SUPABASE_URL is not a valid web address.");
  console.error(`  length=${raw.length}, startsWith https://=${raw.trim().startsWith("https://")}, contains '='=${raw.includes("=")}, contains quote=${/["'`]/.test(raw)}`);
  console.error("  It must look like https://xxxxxxxx.supabase.co");
  process.exit(1);
}
if (!env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.error("VITE_SUPABASE_PUBLISHABLE_KEY is empty.");
  process.exit(1);
}
if (process.argv.includes("--check-env")) {
  console.log("Supabase settings look valid.");
  process.exit(0);
}

// ---- Build ------------------------------------------------------------------
const result = spawnSync("npx", ["vite", "build"], {
  stdio: "inherit",
  shell: true,
  env: { ...env, BUILD_TARGET: "mobile" },
});
if (result.status !== 0) process.exit(result.status ?? 1);

// Capacitor expects an index.html in the web folder; TanStack Start writes _shell.html.
if (!existsSync("dist/client/_shell.html")) {
  console.error("dist/client/_shell.html was not generated - SPA build failed.");
  process.exit(1);
}
copyFileSync("dist/client/_shell.html", "dist/client/index.html");
console.log("Mobile web build ready in dist/client");
