import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { MapView } from "@/components/MapView";
import { ImageLightbox } from "@/components/ImageLightbox";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ReviewsPanel } from "@/components/ReviewsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { computeOpenState } from "@/lib/opening-status";
import {
  MapPin, Phone, Mail, Globe, Instagram, Facebook, ExternalLink, Building2, Star,
} from "lucide-react";

const businessDetailQuery = (id: string) => queryOptions({
  queryKey: ["business-detail", id],
  queryFn: async () => {
    const now = new Date().toISOString();
    const [{ data: business, error }, { data: photos }, { data: hours }, offersResult] = await Promise.all([
      supabase.from("merchants").select("*").eq("id", id).eq("status", "approved").maybeSingle(),
      supabase.from("merchant_photos").select("*").eq("merchant_id", id).order("sort_order"),
      supabase.from("merchant_hours").select("*").eq("merchant_id", id).order("day_of_week"),
      supabase.from("merchant_offers" as any).select("*").eq("merchant_id", id).eq("is_active", true).lte("starts_at", now).gte("ends_at", now).order("ends_at", { ascending: true }),
    ]);
    if (error) throw error;
    if (!business) throw notFound();

    let branches: any[] = [];
    if ((business as any).brand_group_id) {
      const { data: siblings } = await supabase
        .from("merchants")
        .select("id, name, branch_label, is_main_branch, address, city")
        .eq("brand_group_id", (business as any).brand_group_id)
        .eq("status", "approved")
        .neq("id", id)
        .order("is_main_branch", { ascending: false });
      branches = siblings ?? [];
    }

    return { business, photos: photos ?? [], hours: hours ?? [], branches, offers: offersResult.error ? [] : (offersResult.data ?? []) };
  },
});

export const Route = createFileRoute("/business/$id")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(businessDetailQuery(params.id)),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.business.name} — ErbilGo` : "ErbilGo" },
      { name: "description", content: loaderData?.business.description ?? "Discover this place on ErbilGo." },
    ],
  }),
  component: BusinessDetail,
  pendingComponent: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-2xl p-6 text-center">
        <h1 className="font-display text-2xl font-bold">Not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This place doesn't exist or isn't published yet.</p>
        <Button asChild className="mt-4"><Link to="/">Back home</Link></Button>
      </div>
    </div>
  ),
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type SocialPlatform = "instagram" | "facebook";

function normalizeSocialUrl(value: unknown, platform: SocialPlatform) {
  const raw = String(value ?? "").trim().replace(/^@/, "");
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(www\.)?(instagram|facebook)\.com\//i.test(raw)) return `https://${raw}`;

  const host = platform === "instagram" ? "instagram.com" : "facebook.com";
  return `https://${host}/${raw.replace(/^\/+/, "")}`;
}

function socialLabel(value: unknown, platform: SocialPlatform) {
  const raw = String(value ?? "").trim().replace(/^@/, "");
  if (!raw) return platform === "instagram" ? "Instagram" : "Facebook";

  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(candidate);
    const path = url.pathname.replace(/^\/+|\/+$/g, "");
    if (path) return platform === "instagram" ? `@${path.split("/")[0]}` : path.split("/")[0];
  } catch {
    // Treat malformed values as handles rather than rendering a broken URL.
  }

  return platform === "instagram" ? `@${raw}` : raw;
}

function BranchSelector({ currentId, currentName, currentBranchLabel, currentCity, isMain, branches }: { currentId: string; currentName: string; currentBranchLabel?: string | null; currentCity?: string | null; isMain: boolean; branches: any[] }) {
  if (branches.length === 0) return null;
  const all = [
    { id: currentId, name: currentName, branch_label: currentBranchLabel, city: currentCity, is_main_branch: isMain },
    ...branches,
  ];
  const parentName = all.find((branch) => branch.is_main_branch)?.name || currentName;

  return (
    <section id="branch-locations" className="mt-10 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 via-card/60 to-transparent p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/20 bg-gold/10 text-gold"><Building2 className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">More locations</p>
          <h2 className="mt-1 font-display text-xl font-bold">Choose a location for {parentName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">You are viewing <span className="font-semibold text-foreground">{currentBranchLabel || (isMain ? "the main location" : currentName)}</span>{currentCity ? ` in ${currentCity}` : ""}. Each location has its own details, hours, offers and directions.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {all.map((br) => {
          const selected = br.id === currentId;
          const locationName = br.branch_label || (br.is_main_branch ? "Main location" : br.name || "Branch");
          return (
            <Link
              key={br.id}
              to="/business/$id"
              params={{ id: br.id }}
              className={`group flex items-center gap-3 rounded-xl border px-3 py-3 transition ${selected ? "border-gold/50 bg-gold/15" : "border-border/70 bg-background/50 hover:border-gold/40 hover:bg-gold/5"}`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${selected ? "bg-gold text-background" : "bg-muted text-muted-foreground"}`}><MapPin className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className={`block truncate text-sm font-semibold ${selected ? "text-gold" : "text-foreground"}`}>{locationName}</span><span className="block truncate text-xs text-muted-foreground">{br.city || "Erbil"}{br.is_main_branch ? " · Main location" : ""}</span></span>
              {selected && <Badge className="shrink-0 bg-gold text-[10px] text-background">Current</Badge>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function LiveOffers({ offers }: { offers: any[] }) {
  return (
    <section className="mt-6 space-y-3 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Limited-time offers</p><h2 className="mt-1 font-display text-xl font-bold">A little extra for your visit</h2></div><span className="rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-bold text-gold">{offers.length} available</span></div>
      <div className="grid gap-3 md:grid-cols-2">{offers.map((offer) => <div key={offer.id} className="rounded-xl border border-gold/15 bg-background/60 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{offer.title}</h3>{offer.discount_value != null && <Badge className="bg-gold text-background">{offer.offer_type === 'percentage' ? `${offer.discount_value}% off` : `${Number(offer.discount_value).toLocaleString()} ${offer.currency || 'IQD'}`}</Badge>}</div>{offer.description && <p className="mt-2 text-sm text-muted-foreground">{offer.description}</p>}{offer.promo_code && <p className="mt-3 rounded-lg border border-dashed border-gold/30 px-3 py-2 text-center font-mono text-xs font-bold tracking-widest text-gold">Use code: {offer.promo_code}</p>}{offer.terms && <p className="mt-2 text-[10px] text-muted-foreground">{offer.terms}</p>}</div>)}</div>
    </section>
  );
}

function BusinessDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(businessDetailQuery(id));
  const b = data.business;
  const parentBrandName = (data.branches as any[]).find((branch) => branch.is_main_branch)?.name || ((b as any).is_main_branch ? b.name : null);
  const open = computeOpenState(data.hours as any);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const mapsHref = b.latitude != null && b.longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${b.latitude},${b.longitude}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-4xl px-4 pb-16 pt-4 md:px-6">
        {/* Cover */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-muted md:aspect-[21/9]">
          {b.cover_url ? (
            <img src={b.cover_url} alt={b.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">No image</div>
          )}
          <FavoriteButton merchantId={b.id} className="absolute left-3 top-3" />
          {open !== "unknown" && (
            <Badge variant={open === "open" ? "default" : "secondary"} className="absolute right-3 top-3">
              {open === "open" ? "Open now" : "Closed"}
            </Badge>
          )}
        </div>

        {/* Title row */}
        <div className="mt-4 flex items-start gap-4">
          {b.logo_url && (
            <img src={b.logo_url} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold md:text-3xl">{b.name}</h1>
            {parentBrandName && !(b as any).is_main_branch && <p className="mt-1 text-sm text-muted-foreground">A branch of <span className="font-semibold text-foreground">{parentBrandName}</span></p>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">{b.category}</Badge>
              {b.price_level && <span className="text-sm text-muted-foreground">{b.price_level}</span>}
              {(b as any).review_count > 0 && <span className="flex items-center gap-1 text-sm text-gold"><Star className="h-3.5 w-3.5 fill-gold" />{Number((b as any).avg_rating ?? 0).toFixed(1)} <span className="text-muted-foreground">({(b as any).review_count})</span></span>}
              {b.avg_duration_minutes && (
                <span className="text-sm text-muted-foreground">· ~{b.avg_duration_minutes} min visit</span>
              )}
              {(b as any).branch_label && (
                <Badge variant="secondary" className="text-xs">{(b as any).branch_label}</Badge>
              )}
            </div>
          </div>
        </div>

        {data.offers.length > 0 && <LiveOffers offers={data.offers as any[]} />}

        {b.description && <p className="mt-4 text-sm text-muted-foreground">{b.description}</p>}

        <ReviewsPanel merchantId={b.id} averageRating={(b as any).avg_rating} reviewCount={(b as any).review_count} />

        {/* Tags */}
        {((b.features?.length ?? 0) > 0 || (b.mood_tags?.length ?? 0) > 0 || (b.dietary_options?.length ?? 0) > 0) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {[...(b.mood_tags ?? []), ...(b.features ?? []), ...(b.dietary_options ?? [])].map((t: string) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
          </div>
        )}

        {/* Ride Hailing / Taxi */}
        {b.latitude != null && b.longitude != null && (
          <div className="mt-6 rounded-2xl border border-gold/20 bg-gold/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">Get there with Taxi</h3>
                <p className="text-xs text-muted-foreground">Quickest way to reach this destination.</p>
              </div>
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full border-2 border-background bg-green-600 p-1.5 shadow-sm">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/Careem_logo.svg" alt="Careem" className="h-full w-full invert" />
                </div>
                <div className="h-8 w-8 rounded-full border-2 border-background bg-yellow-400 p-1 shadow-sm">
                  <span className="flex h-full w-full items-center justify-center text-[10px] font-black text-black">B</span>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                asChild
                className="h-12 bg-green-600 text-white hover:bg-green-700 shadow-md"
              >
                <a
                  href={`careem://ride?dropoff_lat=${b.latitude}&dropoff_lng=${b.longitude}&dropoff_name=${encodeURIComponent(b.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    void supabase.rpc('record_taxi_click' as any, {
                      p_business_id: b.id,
                      p_provider: 'careem',
                    }).then(({ error }) => {
                      if (error) console.warn('[taxi-analytics] Careem click was not recorded', error);
                    });
                  }}
                  className="flex items-center justify-center gap-2"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/Careem_logo.svg" alt="" className="h-5 w-5 invert" />
                  Order Careem
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-500 shadow-md"
              >
                <a
                  href={`baly://ride?lat=${b.latitude}&lng=${b.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    void supabase.rpc('record_taxi_click' as any, {
                      p_business_id: b.id,
                      p_provider: 'baly',
                    }).then(({ error }) => {
                      if (error) console.warn('[taxi-analytics] Baly click was not recorded', error);
                    });
                  }}
                  className="flex items-center justify-center gap-2"
                >
                  <span className="font-black">Baly</span>
                  Order Baly
                </a>
              </Button>
            </div>
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              Note: App must be installed on your mobile device.
            </p>
          </div>
        )}

        {/* Contact */}
        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          {b.address && (
            <a href={mapsHref ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-muted-foreground transition hover:border-gold/40 hover:text-foreground">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold"><MapPin className="h-4 w-4" /></span>
              <span className="min-w-0 truncate">{b.address}{b.city ? `, ${b.city}` : ""}</span>
            </a>
          )}
          {b.phone && (
            <a href={`tel:${b.phone}`} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-muted-foreground transition hover:border-gold/40 hover:text-foreground">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-300"><Phone className="h-4 w-4" /></span>
              <span className="min-w-0 truncate">{b.phone}</span>
            </a>
          )}
          {b.email && (
            <a href={`mailto:${b.email}`} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-muted-foreground transition hover:border-gold/40 hover:text-foreground">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-300"><Mail className="h-4 w-4" /></span>
              <span className="min-w-0 truncate">{b.email}</span>
            </a>
          )}
          {b.website && (
            <a href={/^https?:\/\//i.test(b.website) ? b.website : `https://${b.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-muted-foreground transition hover:border-gold/40 hover:text-foreground">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold"><Globe className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block font-semibold text-foreground">Website</span><span className="block text-xs text-muted-foreground">Open official site</span></span>
              <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0" />
            </a>
          )}
          {b.instagram && (
            <a href={normalizeSocialUrl(b.instagram, "instagram")} target="_blank" rel="noreferrer" aria-label={`Open ${socialLabel(b.instagram, "instagram")} on Instagram`} className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-muted-foreground transition hover:border-pink-400/40 hover:text-foreground">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500/20 via-pink-500/15 to-amber-400/20 text-pink-300"><Instagram className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block font-semibold text-foreground">Instagram</span><span className="block truncate text-xs text-muted-foreground">{socialLabel(b.instagram, "instagram")}</span></span>
              <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </a>
          )}
          {b.facebook && (
            <a href={normalizeSocialUrl(b.facebook, "facebook")} target="_blank" rel="noreferrer" aria-label={`Open ${socialLabel(b.facebook, "facebook")} on Facebook`} className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-muted-foreground transition hover:border-blue-400/40 hover:text-foreground">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-500/15 text-blue-300"><Facebook className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block font-semibold text-foreground">Facebook</span><span className="block truncate text-xs text-muted-foreground">{socialLabel(b.facebook, "facebook")}</span></span>
              <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </a>
          )}
        </div>

        {/* Map */}
        {b.latitude != null && b.longitude != null && (
          <div className="mt-6">
            <h2 className="mb-2 font-display text-lg font-bold">Location</h2>
            <MapView lat={b.latitude} lng={b.longitude} label={b.name} className="h-72 w-full rounded-xl border border-border" />
          </div>
        )}

        {/* Gallery */}
        {data.photos.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 font-display text-lg font-bold">Photos</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {data.photos.map((p: any, i: number) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="block"
                >
                  <img src={p.url} alt="" className="aspect-square w-full rounded-lg object-cover transition hover:opacity-90" />
                </button>
              ))}
            </div>
          </div>
        )}

        {lightboxIndex !== null && (
          <ImageLightbox
            images={data.photos.map((p: any) => p.url)}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}

        {/* Hours */}
        {data.hours.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 font-display text-lg font-bold">Opening hours</h2>
            <div className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-4">
              {DAYS.map((d, i) => {
                const h = data.hours.find((x: any) => x.day_of_week === i);
                return (
                  <div key={d} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{d}:</span>{" "}
                    {h?.is_24h ? "24h" : h?.is_closed ? "Closed" : h ? `${h.open_time}–${h.close_time}` : "—"}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <BranchSelector currentId={b.id} currentName={b.name} currentBranchLabel={(b as any).branch_label} currentCity={b.city} isMain={Boolean((b as any).is_main_branch)} branches={data.branches} />
      </div>
    </div>
  );
}
