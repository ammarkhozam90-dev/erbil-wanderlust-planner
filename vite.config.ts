// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Mobile app build (Capacitor): set BUILD_TARGET=mobile to produce a static SPA.
// Output goes to dist/client (includes _shell.html). Nitro is disabled for this build only.
// Without this variable the normal SSR web build is unchanged.
const isMobileBuild = process.env.BUILD_TARGET === "mobile";

export default defineConfig({
  ...(isMobileBuild
    ? {
        nitro: false as const,
        vite: { preview: { host: "127.0.0.1" } },
      }
    : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(isMobileBuild ? { spa: { enabled: true } } : {}),
  },
});
