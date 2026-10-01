// Pulls a {lat, lng} pair out of a Google Maps URL someone pasted in.
// Handles the shapes that actually appear when copying from the browser
// address bar or the "Share" menu:
//   https://www.google.com/maps/place/Some+Place/@36.1911,44.0094,15z/...
//   https://www.google.com/maps/@36.1911,44.0094,15z
//   https://maps.google.com/?q=36.1911,44.0094
//   https://www.google.com/maps?q=36.1911,44.0094
//   https://www.google.com/maps/dir/.../@36.1911,44.0094,15z/...  (first @ pair)
//   bare "36.1911, 44.0094" coordinates, in case someone pastes those instead
//
// Does NOT resolve shortened links (maps.app.goo.gl/..., goo.gl/maps/...) —
// those only redirect server-side, so there's nothing to parse client-side.
// Returns null in that case so the caller can tell the person to paste the
// full link from the address bar instead.

export function parseGoogleMapsLink(input: string): { lat: number; lng: number } | null {
  const text = input.trim();
  if (!text) return null;

  if (/goo\.gl\/maps|maps\.app\.goo\.gl/i.test(text)) return null;

  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // .../@lat,lng,zoom
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/, // ?q=lat,lng
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/, // ?ll=lat,lng
    /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/, // bare "lat, lng"
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}
