export type RideProvider = "careem" | "baly";

const PROVIDER_CONFIG: Record<RideProvider, { scheme: string; androidPackage: string; fallbackUrl: string }> = {
  careem: {
    scheme: "careem",
    androidPackage: "com.careem.acma",
    fallbackUrl: "https://www.careem.com/",
  },
  baly: {
    scheme: "baly",
    androidPackage: "app.baly.passenger",
    fallbackUrl: "https://baly.iq/",
  },
};

export function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

/**
 * Opens the provider app. Nothing else -- no location permission request,
 * no Google Maps fallback, no destination. Just a single navigation:
 * - Android: an intent:// URL. If the app is installed, Android opens it
 *   directly. If it isn't, Chrome itself (not our code) redirects to
 *   S.browser_fallback_url -- that's a single OS-level hop, not a second
 *   JS-triggered redirect, so nothing else can fire on top of it.
 * - iOS: the bare custom scheme. If the app is installed it opens; if not,
 *   iOS silently does nothing (there's no reliable "app missing" signal on
 *   iOS from JS alone, so we don't try to fake one with a timer).
 */
export function launchRideApp(provider: RideProvider) {
  const config = PROVIDER_CONFIG[provider];

  if (isAndroid()) {
    window.location.href =
      `intent://#Intent;scheme=${config.scheme};package=${config.androidPackage};` +
      `S.browser_fallback_url=${encodeURIComponent(config.fallbackUrl)};end`;
    return;
  }

  window.location.href = `${config.scheme}://`;
}
