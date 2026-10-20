import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.erbilgo.app",
  appName: "ErbilGo",
  webDir: "dist/client",
  server: {
    // Inside the app the pages are served from the phone, but they now report the real
    // site address. So links the app builds (password reset, email confirmation, sharing a
    // plan) point to https://erbilgo.vercel.app instead of the useless https://localhost.
    hostname: "erbilgo.vercel.app",
    androidScheme: "https",
  },
};

export default config;
