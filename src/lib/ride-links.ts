export type RideProvider = "careem" | "baly";

type Coordinates = {
  latitude: number;
  longitude: number;
};

const PROVIDER_CONFIG: Record<
  RideProvider,
  { scheme: string; entryPath: string; androidPackage: string; fallbackUrl: string }
> = {
  careem: {
    scheme: "careem",
    // CONFIRMED ON-DEVICE: `careem://ride` (this exact host) is a real,
    // registered entry point -- the app opened when we hit it before. It
    // then crashed because we also appended dropoff_latitude/longitude/
    // address query params it didn't expect. Hitting the same host with NO
    // query params should open the Rides screen without those bad inputs.
    entryPath: "ride",
    androidPackage: "com.careem.acma",
    fallbackUrl: "https://www.careem.com/",
  },
  baly: {
    scheme: "baly",
    // UNCONFIRMED GUESS: bare `baly://` and ACTION_MAIN/LAUNCHER both
    // failed to match on-device (see launchRideApp comment). "home" is an
    // unverified guess at a registered host -- if it also falls through to
    // baly.iq, there is currently no known entry point we can hit from the
    // web without Baly's own deep-link documentation.
    entryPath: "home",
    androidPackage: "app.baly.passenger",
    fallbackUrl: "https://baly.iq/",
  },
};

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

export function getRideAppUrls(
  provider: RideProvider,
  destination: Coordinates,
  destinationName: string,
  pickup?: Coordinates,
) {
  const config = PROVIDER_CONFIG[provider];
  const lat = formatCoordinate(destination.latitude);
  const lng = formatCoordinate(destination.longitude);

  // See PROVIDER_CONFIG.entryPath comments: careem's "ride" host is
  // confirmed to match; baly's "home" host is an unverified guess. No
  // query params on either -- that's what crashed Careem last time.
  const appUrl = `${config.scheme}://${config.entryPath}`;

  const androidIntentUrl =
    `intent://${config.entryPath}#Intent;scheme=${config.scheme};` +
    `package=${config.androidPackage};` +
    `S.browser_fallback_url=${encodeURIComponent(config.fallbackUrl)};end`;

  const mapsFallbackUrl =
    pickup == null
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&origin=${formatCoordinate(pickup.latitude)},${formatCoordinate(pickup.longitude)}` +
        `&destination=${lat},${lng}&travelmode=driving`;

  return { appUrl, androidIntentUrl, mapsFallbackUrl };
}

export function getCurrentPosition(): Promise<Coordinates> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Location is not supported by this browser."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      (error) => reject(error),
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 8_000,
      },
    );
  });
}

export function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

export function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Best-effort copy of the destination name so the user can paste it into
 * whichever ride app opens, since neither app accepts it via deep link.
 * Resolves to false (not thrown) if the clipboard API is unavailable or
 * permission is denied -- callers should treat this as a nice-to-have.
 */
export async function copyDestinationText(destinationName: string): Promise<boolean> {
  if (!navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(destinationName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens the provider with destination only. The provider app is responsible
 * for resolving the user's current location. If its private deep-link route
 * is unavailable, the user receives a working Google Maps route instead.
 */
export function launchRideApp(
  provider: RideProvider,
  destination: Coordinates,
  destinationName: string,
  pickup?: Coordinates,
) {
  const urls = getRideAppUrls(provider, destination, destinationName, pickup);
  const url = isAndroid() ? urls.androidIntentUrl : urls.appUrl;
  let wasHidden = false;
  let returnedToBrowser = false;
  // FIX (double-fallback bug): when the intent's own
  // S.browser_fallback_url kicks in, Chrome navigates the SAME tab to it --
  // that's a normal in-page navigation, not an app switch, so
  // visibilitychange never fires "hidden". Without this flag, our own
  // 1800ms timer would then fire a SECOND redirect on top of that page
  // (what sent Careem's own fallback page on to Google Maps). `pagehide`
  // fires exactly when this kind of in-tab navigation starts, so we use it
  // to cancel our timer instead of double-redirecting.
  let navigatedAway = false;

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      wasHidden = true;
    } else if (wasHidden) {
      returnedToBrowser = true;
    }
  };
  const onPageHide = () => {
    navigatedAway = true;
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide, { once: true });
  window.location.href = url;

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
    if (
      !navigatedAway &&
      document.visibilityState === "visible" &&
      (!wasHidden || returnedToBrowser)
    ) {
      window.location.href = urls.mapsFallbackUrl;
    }
  }, 1800);
}
