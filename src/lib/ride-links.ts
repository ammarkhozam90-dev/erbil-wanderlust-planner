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

function destinationQuery(destination: Coordinates, destinationName: string) {
  return new URLSearchParams({
    dropoff_latitude: formatCoordinate(destination.latitude),
    dropoff_longitude: formatCoordinate(destination.longitude),
    dropoff_name: destinationName,
    // Backward-compatible aliases used by some older provider builds.
    dropoff_lat: formatCoordinate(destination.latitude),
    dropoff_lng: formatCoordinate(destination.longitude),
  }).toString();
}

export function getRideAppUrls(
  provider: RideProvider,
  destination: Coordinates,
  destinationName: string,
  pickup?: Coordinates,
) {
  const config = PROVIDER_CONFIG[provider];
  const query = destinationQuery(destination, destinationName);
  const appUrl = `${config.scheme}://ride?${query}`;
  const androidIntentUrl =
    `intent://ride?${query}#Intent;scheme=${config.scheme};package=${config.androidPackage};` +
    `S.browser_fallback_url=${encodeURIComponent(config.fallbackUrl)};end`;

  const mapsFallbackUrl =
    pickup == null
      ? `https://www.google.com/maps/search/?api=1&query=${formatCoordinate(destination.latitude)},${formatCoordinate(destination.longitude)}`
      : `https://www.google.com/maps/dir/?api=1&origin=${formatCoordinate(pickup.latitude)},${formatCoordinate(pickup.longitude)}` +
        `&destination=${formatCoordinate(destination.latitude)},${formatCoordinate(destination.longitude)}&travelmode=driving`;

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
