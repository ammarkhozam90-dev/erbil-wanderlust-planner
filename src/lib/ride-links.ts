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

function queryString(pickup: Coordinates, destination: Coordinates, destinationName: string) {
  const params = new URLSearchParams({
    pickup_latitude: pickup.latitude.toFixed(6),
    pickup_longitude: pickup.longitude.toFixed(6),
    dropoff_latitude: destination.latitude.toFixed(6),
    dropoff_longitude: destination.longitude.toFixed(6),
    dropoff_name: destinationName,
    // Keep the short aliases for older provider builds that still read them.
    pickup_lat: pickup.latitude.toFixed(6),
    pickup_lng: pickup.longitude.toFixed(6),
    dropoff_lat: destination.latitude.toFixed(6),
    dropoff_lng: destination.longitude.toFixed(6),
  });

  return params.toString();
}

export function getRideAppUrls(
  provider: RideProvider,
  pickup: Coordinates,
  destination: Coordinates,
  destinationName: string,
) {
  const config = PROVIDER_CONFIG[provider];
  const query = queryString(pickup, destination, destinationName);
  const appUrl = `${config.scheme}://ride?${query}`;

  // Android's intent URL gives Chrome a native-app fallback without leaving
  // the user on an empty custom-scheme page when the app is not installed.
  const androidIntentUrl = `intent://ride?${query}#Intent;scheme=${config.scheme};package=${config.androidPackage};S.browser_fallback_url=${encodeURIComponent(config.fallbackUrl)};end`;

  return {
    appUrl,
    androidIntentUrl,
    fallbackUrl: config.fallbackUrl,
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
 * Opens the provider app without leaving the browser on a broken custom-scheme
 * page. The fallback runs only while the document remains visible, so it will
 * not race a successfully opened native app.
 */
export function launchRideApp(
  provider: RideProvider,
  pickup: Coordinates,
  destination: Coordinates,
  destinationName: string,
) {
  const urls = getRideAppUrls(provider, pickup, destination, destinationName);
  const url = isAndroid() ? urls.androidIntentUrl : urls.appUrl;
  let appOpened = false;

  const markOpened = () => {
    appOpened = true;
    window.removeEventListener("visibilitychange", markOpened);
  };
  window.addEventListener("visibilitychange", markOpened, { once: true });

  window.location.href = url;

  window.setTimeout(() => {
    window.removeEventListener("visibilitychange", markOpened);
    if (!appOpened && document.visibilityState === "visible") {
      window.location.href = urls.fallbackUrl;
    }
  }, 1400);
}
