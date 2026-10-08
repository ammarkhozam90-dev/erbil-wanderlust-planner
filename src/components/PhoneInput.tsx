import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  PINNED_COUNT,
  type PhoneCountry,
} from "@/data/phone-countries";

/**
 * Phone input with a country calling-code dropdown.
 * - value / onChange use ONE string in international format: "+9647501234567" ("" when empty).
 * - Existing values are parsed back into country + number (longest dial-code match).
 */

const BY_CODE = new Map(PHONE_COUNTRIES.map((c) => [c.code, c]));
// Longest dial code first so "+1876" (Jamaica) wins over "+1" (US).
const BY_DIAL_LENGTH = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

function parsePhone(value: string): { country: PhoneCountry; national: string } {
  const fallback = BY_CODE.get(DEFAULT_PHONE_COUNTRY)!;
  const v = (value ?? "").trim();
  if (!v) return { country: fallback, national: "" };

  if (v.startsWith("+") || v.startsWith("00")) {
    const digits = v.replace(/\D/g, "").replace(/^00/, "");
    const hit = BY_DIAL_LENGTH.find((c) => digits.startsWith(c.dial));
    if (hit) return { country: hit, national: digits.slice(hit.dial.length) };
  }
  // Local format without country code (e.g. "0750 123 4567") -> default country.
  return { country: fallback, national: v.replace(/\D/g, "").replace(/^0+/, "") };
}

function build(country: PhoneCountry, national: string): string {
  const n = national.replace(/\D/g, "").replace(/^0+/, "");
  return n ? `+${country.dial}${n}` : "";
}

/** True when the value looks like a plausible international number (E.164: max 15 digits). */
export function isValidPhone(value: string | null | undefined): boolean {
  const digits = (value ?? "").replace(/\D/g, "");
  return /^\+/.test((value ?? "").trim()) && digits.length >= 8 && digits.length <= 15;
}

function Flag({ code }: { code: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="inline-block w-6 text-center text-[10px] font-semibold text-muted-foreground">
        {code}
      </span>
    );
  }
  return (
    <img
      src={`https://flagcdn.com/24x18/${code.toLowerCase()}.png`}
      alt=""
      width={24}
      height={18}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-[18px] w-6 shrink-0 rounded-[3px] object-cover"
    />
  );
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function PhoneInput({ value, onChange, placeholder = "750 123 4567", disabled, id }: PhoneInputProps) {
  const initial = useMemo(() => parsePhone(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<PhoneCountry>(initial.country);
  const [national, setNational] = useState(initial.national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(value);

  // Normalise a stored value once (e.g. "0750 123 4567" -> "+9647501234567").
  useEffect(() => {
    const norm = build(initial.country, initial.national);
    if (value && norm && norm !== value) {
      lastEmitted.current = norm;
      onChange(norm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync if the parent changes the value from outside (e.g. profile loads later).
  useEffect(() => {
    if (value === lastEmitted.current) return;
    const p = parsePhone(value);
    setCountry(p.country);
    setNational(p.national);
    lastEmitted.current = value;
  }, [value]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    // window + capture runs before the dialog's own Escape handler, so Esc only closes this list.
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  function emit(c: PhoneCountry, n: string) {
    const next = build(c, n);
    lastEmitted.current = next;
    onChange(next);
  }

  const q = query.trim().toLowerCase().replace(/^\+/, "");
  const filtered = useMemo(() => {
    if (!q) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.startsWith(q) || c.code.toLowerCase() === q,
    );
  }, [q]);

  function pick(c: PhoneCountry) {
    setCountry(c);
    setOpen(false);
    setQuery("");
    emit(c, national);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Country calling code: ${country.name} +${country.dial}`}
          className={cn(
            "flex h-10 shrink-0 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm",
            "hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
          )}
        >
          <Flag code={country.code} />
          <span className="font-medium tabular-nums">+{country.dial}</span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>

        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          disabled={disabled}
          value={national}
          maxLength={15}
          placeholder={placeholder}
          onChange={(e) => {
            const n = e.target.value.replace(/\D/g, "");
            setNational(n);
            emit(country, n);
          }}
        />
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[260px] overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered[0]) {
                  e.preventDefault();
                  pick(filtered[0]);
                }
              }}
              placeholder="Search country or code"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div role="listbox" className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">No country found</p>
            )}
            {filtered.map((c, i) => (
              <div key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.code === country.code}
                  onClick={() => pick(c)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent",
                    c.code === country.code && "bg-accent",
                  )}
                >
                  <Flag code={c.code} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">+{c.dial}</span>
                </button>
                {!q && i === PINNED_COUNT - 1 && <div className="my-1 h-px bg-border" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
