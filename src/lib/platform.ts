/**
 * Platform helpers shared by the web shell and Capacitor bridges.
 *
 * This module is intentionally SSR-safe: `window` is never read at module
 * evaluation time, so importing it from route components cannot create a
 * hydration mismatch.
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean((window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}
