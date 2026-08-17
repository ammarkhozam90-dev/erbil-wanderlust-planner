import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { MapPin, Star, ExternalLink, Sparkles } from "lucide-react";
import { computeOpenState } from "@/lib/opening-status";
import type { BusinessListItem } from "@/lib/business-queries";

interface Props {
  business: BusinessListItem;
  onAddToPlan?: (b: BusinessListItem) => void;
}

export function BusinessCard({ business: b, onAddToPlan }: Props) {
  const open = computeOpenState(b.merchant_hours);
  const mapsHref =
    b.latitude != null && b.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${b.latitude},${b.longitude}`
      : b.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`
        : null;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <Link to="/business/$id" params={{ id: b.id }} className="block">
        <div className="relative aspect-[16/9] w-full bg-muted">
          {b.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.cover_url} alt={b.name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
          {b.logo_url && (
            <img
              src={b.logo_url}
              alt=""
              className="absolute bottom-2 left-2 h-12 w-12 rounded-md border-2 border-background object-cover shadow"
              loading="lazy"
            />
          )}
          {open !== "unknown" && (
            <Badge
              variant={open === "open" ? "default" : "secondary"}
              className="absolute right-2 top-2"
            >
              {open === "open" ? "Open" : "Closed"}
            </Badge>
          )}
        </div>

        <CardContent className="space-y-3 p-4 pb-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold">{b.name}</h3>
              <p className="text-xs capitalize text-muted-foreground">{b.category}</p>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-3.5 w-3.5" />
              <span>—</span>
            </div>
          </div>

          {b.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{b.description}</p>
          )}

          {(b.address || b.price_level) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {b.address && (
                <span className="flex min-w-0 items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{b.address}</span>
                </span>
              )}
              {b.price_level && <span className="font-medium">{b.price_level}</span>}
            </div>
          )}

          {b.features && b.features.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {b.features.slice(0, 4).map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Link>

      <CardContent className="pt-3">
        <div className="flex gap-2">
          <Button asChild size="sm" variant="secondary" className="flex-1">
            <Link to="/business/$id" params={{ id: b.id }}>View details</Link>
          </Button>
          {mapsHref && (
            <Button asChild size="sm" variant="outline">
              <a href={mapsHref} target="_blank" rel="noopener noreferrer" aria-label="Open in Maps">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          {onAddToPlan && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToPlan(b); }}
              aria-label="Add to AI Plan"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
