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
  const name = encodeURIComponent(destinationName);

  // EXPERIMENTAL: Careem/Baly do not publish an official deep-link spec
  // for a specific dropoff. This is the pattern some developers report
  // working; it is NOT confirmed by Careem/Baly documentation. If the app
  // opens and immediately closes (same failure as before), the automatic
  // fallback below detects it and redirects to Google Maps within ~1.8s
  // instead of leaving the user on a broken/blank screen.
  const appUrl =
    `${config.scheme}://ride?dropoff_latitude=${lat}&dropoff_longitude=${lng}` +
    `&dropoff_address=${name}`;

  // FIX: the old intent URL had no `scheme=` and no
  // `S.browser_fallback_url=`. Without those two fields Chrome can't match
  // the installed app to the intent, so it defaults to opening the Play
  // Store listing for the package -- even when the app IS installed. Both
  // fields are required: `scheme` lets Android resolve the right activity,
  // `S.browser_fallback_url` is what Chrome opens when the app is missing
  // (instead of guessing).
  const androidIntentUrl =
    `intent://ride?dropoff_latitude=${lat}&dropoff_longitude=${lng}&dropoff_address=${name}` +
    `#Intent;scheme=${config.scheme};package=${config.androidPackage};` +
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

/**
 * Opens native Google Maps turn-by-turn directions to `destination`, with
 * the user's current location as origin. Google Maps has an official,
 * documented Careem integration: a Careem icon on the directions screen
 * that transfers the pickup/dropoff straight into the Careem app. This is
 * currently the only reliable way to hand Careem a specific destination --
 * there is no public Careem deep-link route that does it directly. Baly has
 * no known equivalent integration, so this is only wired up for Careem.
 */
export function launchGoogleMapsForHandoff(
  destination: Coordinates,
  pickup?: Coordinates,
) {
  const dest = `${formatCoordinate(destination.latitude)},${formatCoordinate(destination.longitude)}`;
  const origin = pickup
    ? `${formatCoordinate(pickup.latitude)},${formatCoordinate(pickup.longitude)}`
    : "";
  const webUrl =
    `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}` +
    `&travelmode=driving&dir_action=navigate`;

  if (isIOS()) {
    // Native app if installed; falls through to the web URL otherwise.
    window.location.href = `comgooglemaps://?daddr=${dest}&directionsmode=driving`;
    window.setTimeout(() => {
      window.location.href = webUrl;
    }, 800);
    return;
  }

  // Android: the https Maps URL itself already opens the native app when
  // it's installed (Android's app-link verification handles this), and
  // falls back to the browser automatically when it isn't -- no manual
  // fallback chain needed here.
  window.location.href = webUrl;
}
