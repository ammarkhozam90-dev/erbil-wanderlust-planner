export type UserLocation = {
  lat: number;
  lng: number;
  accuracy: number | null;
};

export type LocationResult =
  | { ok: true; location: UserLocation }
  | { ok: false; reason: "unsupported" | "denied" | "timeout" | "unavailable" | "failed" };

/** Requests a single location only when a user explicitly asks for it. */
export function getCurrentLocation(): Promise<LocationResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: "unsupported" });
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: LocationResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    navigator.geolocation.getCurrentPosition(
      (position) =>
        finish({
          ok: true,
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : null,
          },
        }),
      (error) => {
        const reason =
          error.code === error.PERMISSION_DENIED
            ? "denied"
            : error.code === error.TIMEOUT
              ? "timeout"
              : error.code === error.POSITION_UNAVAILABLE
                ? "unavailable"
                : "failed";
        finish({ ok: false, reason });
      },
      {
        enableHighAccuracy: false,
        maximumAge: 120_000,
        timeout: 10_000,
      },
    );
  });
}

export function locationErrorMessage(reason: Exclude<LocationResult, { ok: true }>['reason']): string {
  switch (reason) {
    case "unsupported":
      return "Location is not available on this device.";
    case "denied":
      return "Location access was denied. You can enable it from your phone settings.";
    case "timeout":
      return "We could not get your location in time. Please try again outdoors.";
    case "unavailable":
      return "Your location is temporarily unavailable. Please check GPS and try again.";
    default:
      return "We could not read your location. Please try again.";
  }
}
