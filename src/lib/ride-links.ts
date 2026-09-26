export type RideProvider = "careem" | "baly";

type Coordinates = {
  latitude: number;
  longitude: number;
};

const PROVIDER_CONFIG: Record<
  RideProvider,
  { scheme: string; androidPackage: string; fallbackUrl: string }
> = {
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

  // CONFIRMED ON-DEVICE (Android): neither app can be relied on to match a
  // custom-scheme deep link from the web -- Careem's app opened then
  // crashed on guessed dropoff params, and Baly's app failed to match even
  // a bare `baly://` (no host/path), falling straight to its website even
  // though installed. Neither publishes a documented scheme, so instead of
  // guessing a URI path, we launch the app the way the OS launcher itself
  // does: ACTION_MAIN / CATEGORY_LAUNCHER by package name. This ignores
  // deep-link matching entirely (so it can't crash or mismatch) and opens
  // the app's home screen, exactly like tapping its icon.
  const appUrl = `${config.scheme}://`;

  const androidIntentUrl =
    `intent://#Intent;action=android.intent.action.MAIN;` +
    `category=android.intent.category.LAUNCHER;package=${config.androidPackage};` +
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

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      wasHidden = true;
    } else if (wasHidden) {
      returnedToBrowser = true;
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.location.href = url;

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (document.visibilityState === "visible" && (!wasHidden || returnedToBrowser)) {
      window.location.href = urls.mapsFallbackUrl;
    }
  }, 1800);
}
