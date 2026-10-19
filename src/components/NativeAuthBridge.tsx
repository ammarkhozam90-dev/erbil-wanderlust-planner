import { useEffect } from "react";
import { setupNativeAuth } from "@/lib/native-auth";

/** Invisible helper: enables Google sign-in inside the mobile app. Does nothing on the website. */
export function NativeAuthBridge() {
  useEffect(() => setupNativeAuth(), []);
  return null;
}
