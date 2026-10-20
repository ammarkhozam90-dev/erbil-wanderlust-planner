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
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#0d0d0f",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0d0d0f",
      overlaysWebView: false,
    },
  },
};

export default config;
