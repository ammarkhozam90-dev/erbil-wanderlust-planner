import { useEffect, useState } from "react";
import { Coffee, Landmark, MapPin, ShoppingBag, Trees, UtensilsCrossed, Palette, Moon } from "lucide-react";

const ICONS: Record<string, typeof MapPin> = {
  "Cafés": Coffee,
  Restaurants: UtensilsCrossed,
  Landmarks: Landmark,
  "Parks & Nature": Trees,
  Shopping: ShoppingBag,
  "Art & Culture": Palette,
  Nightlife: Moon,
};

/**
 * Shows the business photo, or a branded placeholder (category icon + initials)
 * when the business has no photo yet or the link is broken.
 */
export function PlaceImage({
  src,
  name,
  category,
  className = "",
}: {
  src?: string | null;
  name: string;
  category?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const usable = !!src && src.trim() !== "" && !src.endsWith("/placeholder.svg") && !failed;

  if (usable) {
    return (
      <img
        src={src!}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    );
  }
  const Icon = (category && ICONS[category]) || MapPin;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <div
      role="img"
      aria-label={name}
      className={`flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-gold/25 via-card to-background text-gold ${className}`}
    >
      <Icon className="h-7 w-7" />
      <span className="font-display text-sm font-bold tracking-wide">{initials}</span>
    </div>
  );
}
