// Compute current open/closed status from merchant_hours rows.
// day_of_week: 0 = Sunday ... 6 = Saturday (matches JS Date.getDay()).

export interface HourRow {
  day_of_week: number;
  is_closed: boolean;
  is_24h: boolean;
  open_time: string | null; // "HH:MM" or "HH:MM:SS"
  close_time: string | null;
}

export type OpenState = "open" | "closed" | "unknown";

function toMinutes(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function computeOpenState(hours: HourRow[] | null | undefined, now = new Date()): OpenState {
  if (!hours || hours.length === 0) return "unknown";
  const dow = now.getDay();
  const row = hours.find((h) => h.day_of_week === dow);
  if (!row) return "closed";
  if (row.is_closed) return "closed";
  if (row.is_24h) return "open";
  const open = toMinutes(row.open_time);
  const close = toMinutes(row.close_time);
  if (open === null || close === null) return "unknown";
  const cur = now.getHours() * 60 + now.getMinutes();
  if (close > open) {
    return cur >= open && cur < close ? "open" : "closed";
  }
  // Overnight (e.g. 20:00 -> 02:00)
  return cur >= open || cur < close ? "open" : "closed";
}
