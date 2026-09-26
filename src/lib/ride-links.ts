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

function queryString(pickup: Coordinates, destination: Coordinates, destinationName: string) {
  return new URLSearchParams({
    pickup_latitude: formatCoordinate(pickup.latitude),
    pickup_longitude: formatCoordinate(pickup.longitude),
    dropoff_latitude: formatCoordinate(destination.latitude),
    dropoff_longitude: formatCoordinate(destination.longitude),
    dropoff_name: destinationName,
    // Keep the short aliases for provider versions that still read them.
    pickup_lat: formatCoordinate(pickup.latitude),
    pickup_lng: formatCoordinate(pickup.longitude),
    dropoff_lat: formatCoordinate(destination.latitude),
    dropoff_lng: formatCoordinate(destination.longitude),
  }).toString();
}

export function getRideAppUrls(
  provider: RideProvider,
  pickup: Coordinates,
  destination: Coordinates,
  destinationName: string,
) {
  const config = PROVIDER_CONFIG[provider];
  const query = queryString(pickup, destination, destinationName);

  // Do not use the unsupported `://ride` route. On current Android builds it
  // opens the app and immediately closes because that internal route is not a
  // public contract. The app root is safer; the provider can then use its own
  // current-location and destination picker.
  const appUrl = `${config.scheme}://?${query}`;
  const androidIntentUrl = `intent://#Intent;scheme=${config.scheme};package=${config.androidPackage};end`;
  const mapsFallbackUrl =
    `https://www.google.com/maps/dir/?api=1&origin=${formatCoordinate(pickup.latitude)},${formatCoordinate(pickup.longitude)}` +
    `&destination=${formatCoordinate(destination.latitude)},${formatCoordinate(destination.longitude)}` +
    "&travelmode=driving";

  return {
    appUrl,
    androidIntentUrl,
    providerFallbackUrl: config.fallbackUrl,
    mapsFallbackUrl,
  };
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
 * Opens the provider app without relying on its private ride screen. If the
 * app is missing or immediately exits, the user gets a working route in Maps
 * containing both the current pickup and the business destination.
 */
export function launchRideApp(
  provider: RideProvider,
  pickup: Coordinates,
  destination: Coordinates,
  destinationName: string,
) {
  const urls = getRideAppUrls(provider, pickup, destination, destinationName);
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
    // If the native app stayed open, the page remains hidden. If it crashed,
    // closed, or was not installed, return the user to a usable route.
    if (document.visibilityState === "visible" && (!wasHidden || returnedToBrowser)) {
      window.location.href = urls.mapsFallbackUrl;
    }
  }, 1800);
}
