import { useState } from "react";
import { Loader2, MapPin, RotateCw } from "lucide-react";
import { getCurrentLocation, locationErrorMessage, type UserLocation } from "@/lib/geolocation";

export function UseCurrentLocation({
  value,
  onChange,
}: {
  value?: { lat: number; lng: number } | null;
  onChange: (location: UserLocation | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestLocation() {
    setLoading(true);
    setError(null);
    const result = await getCurrentLocation();
    setLoading(false);

    if (!result.ok) {
      setError(locationErrorMessage(result.reason));
      return;
    }

    onChange(result.location);
  }

  const hasLocation = value?.lat != null && value?.lng != null;

  return (
    <section className="mt-6 rounded-2xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/10 text-gold">
          <MapPin className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold">Start near me?</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Optional. We use your location to choose a smoother starting point. It is not saved to your profile.
          </p>
          <button
            type="button"
            onClick={() => void requestLocation()}
            disabled={loading}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold/40 px-3 py-2 text-xs font-semibold text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : hasLocation ? (
              <RotateCw className="h-3.5 w-3.5" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
            {loading ? "Finding you…" : hasLocation ? "Update my location" : "Use my current location"}
          </button>
          {hasLocation && !loading && (
            <p className="mt-2 text-[11px] text-primary">Starting point added to this plan.</p>
          )}
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </section>
  );
}
