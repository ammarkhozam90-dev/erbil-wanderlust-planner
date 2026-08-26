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
import { computeOpenState, formatHoursLabel } from "@/lib/opening-status";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
  ExternalLink,
  Building2,
  Star,
  BedDouble,
  Users,
  Ruler,
  Accessibility,
  Images,
} from "lucide-react";

type PublicRoom = {
  id: string;
  name: string;
  description?: string;
  bed_type?: string;
  room_size_sqm?: number | null;
  max_guests?: number;
  available_units?: number | null;
  price_from?: number | null;
  currency?: string;
  amenities?: string[];
  accessible?: boolean;
};

type PublicRoomPhoto = {
  id: string;
  room_type_id: string;
  url: string;
  sort_order: number;
};

const businessDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["business-detail", id],
    queryFn: async () => {
      const now = new Date().toISOString();
      const [
        { data: business, error },
        { data: photos },
        { data: hours },
        offersResult,
        { data: hotelProfile },
        { data: roomPhotos },
      ] = await Promise.all([
        supabase.from("merchants").select("*").eq("id", id).eq("status", "approved").maybeSingle(),
        supabase.from("merchant_photos").select("*").eq("merchant_id", id).order("sort_order"),
        supabase.from("merchant_hours").select("*").eq("merchant_id", id).order("day_of_week"),
        supabase
          .from("merchant_offers" as any)
          .select("*")
          .eq("merchant_id", id)
          .eq("is_active", true)
          .lte("starts_at", now)
          .gte("ends_at", now)
          .order("ends_at", { ascending: true }),
        supabase
          .from("hotel_profiles" as any)
          .select(
            "star_rating, check_in_time, check_out_time, amenities, breakfast_available, airport_transfer_available, parking_available, cancellation_policy, room_types",
          )
          .eq("merchant_id", id)
          .maybeSingle(),
        supabase
          .from("hotel_room_photos" as any)
          .select("id, room_type_id, url, sort_order")
          .eq("merchant_id", id)
          .order("sort_order")
          .order("created_at"),
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

      return {
        business,
        photos: photos ?? [],
        hours: hours ?? [],
        branches,
        offers: offersResult.error ? [] : (offersResult.data ?? []),
        hotelProfile: hotelProfile ?? null,
        roomPhotos: roomPhotos ?? [],
      };
    },
  });

export const Route = createFileRoute("/business/$id")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(businessDetailQuery(params.id)),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.business.name} — ErbilGo` : "ErbilGo" },
      {
        name: "description",
        content: loaderData?.business.description ?? "Discover this place on ErbilGo.",
      },
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
        <p className="mt-2 text-sm text-muted-foreground">
          This place doesn't exist or isn't published yet.
        </p>
        <Button asChild className="mt-4">
          <Link to="/">Back home</Link>
        </Button>
      </div>
    </div>
  ),
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type SocialPlatform = "instagram" | "facebook";

function normalizeSocialUrl(value: unknown, platform: SocialPlatform) {
  const raw = String(value ?? "")
    .trim()
    .replace(/^@/, "");
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(www\.)?(instagram|facebook)\.com\//i.test(raw)) return `https://${raw}`;

  const host = platform === "instagram" ? "instagram.com" : "facebook.com";
  return `https://${host}/${raw.replace(/^\/+/, "")}`;
}

function socialLabel(value: unknown, platform: SocialPlatform) {
  const raw = String(value ?? "")
    .trim()
    .replace(/^@/, "");
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

function BranchSelector({
  currentId,
  currentName,
  currentBranchLabel,
  currentCity,
  isMain,
  branches,
}: {
  currentId: string;
  currentName: string;
  currentBranchLabel?: string | null;
  currentCity?: string | null;
  isMain: boolean;
  branches: any[];
}) {
  if (branches.length === 0) return null;
  const all = [
    {
      id: currentId,
      name: currentName,
      branch_label: currentBranchLabel,
      city: currentCity,
      is_main_branch: isMain,
    },
    ...branches,
  ];
  const parentName = all.find((branch) => branch.is_main_branch)?.name || currentName;

  return (
    <section
      id="branch-locations"
      className="mt-10 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 via-card/60 to-transparent p-5 shadow-sm md:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
          <Building2 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
            More locations
          </p>
          <h2 className="mt-1 font-display text-xl font-bold">
            Choose a location for {parentName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You are viewing{" "}
            <span className="font-semibold text-foreground">
              {currentBranchLabel || (isMain ? "the main location" : currentName)}
            </span>
            {currentCity ? ` in ${currentCity}` : ""}. Each location has its own details, hours,
            offers and directions.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {all.map((br) => {
          const selected = br.id === currentId;
          const locationName =
            br.branch_label || (br.is_main_branch ? "Main location" : br.name || "Branch");
          return (
            <Link
              key={br.id}
              to="/business/$id"
              params={{ id: br.id }}
              className={`group flex items-center gap-3 rounded-xl border px-3 py-3 transition ${selected ? "border-gold/50 bg-gold/15" : "border-border/70 bg-background/50 hover:border-gold/40 hover:bg-gold/5"}`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${selected ? "bg-gold text-background" : "bg-muted text-muted-foreground"}`}
              >
                <MapPin className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm font-semibold ${selected ? "text-gold" : "text-foreground"}`}
                >
                  {locationName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {br.city || "Erbil"}
                  {br.is_main_branch ? " · Main location" : ""}
                </span>
              </span>
              {selected && (
                <Badge className="shrink-0 bg-gold text-[10px] text-background">Current</Badge>
              )}
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
            Limited-time offers
          </p>
          <h2 className="mt-1 font-display text-xl font-bold">A little extra for your visit</h2>
        </div>
        <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-bold text-gold">
          {offers.length} available
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {offers.map((offer) => (
          <div key={offer.id} className="rounded-xl border border-gold/15 bg-background/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold">{offer.title}</h3>
              {offer.discount_value != null && (
                <Badge className="bg-gold text-background">
                  {offer.offer_type === "percentage"
                    ? `${offer.discount_value}% off`
                    : `${Number(offer.discount_value).toLocaleString()} ${offer.currency || "IQD"}`}
                </Badge>
              )}
            </div>
            {offer.description && (
              <p className="mt-2 text-sm text-muted-foreground">{offer.description}</p>
            )}
            {offer.promo_code && (
              <p className="mt-3 rounded-lg border border-dashed border-gold/30 px-3 py-2 text-center font-mono text-xs font-bold tracking-widest text-gold">
                Use code: {offer.promo_code}
              </p>
            )}
            {offer.terms && <p className="mt-2 text-[10px] text-muted-foreground">{offer.terms}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function HotelRooms({ profile, photos }: { profile: any; photos: PublicRoomPhoto[] }) {
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const rooms: PublicRoom[] = Array.isArray(profile?.room_types)
    ? profile.room_types.map((room: PublicRoom, index: number) => ({
        ...room,
        id: room.id || `room-${index}`,
        amenities: Array.isArray(room.amenities) ? room.amenities : [],
      }))
    : [];

  if (!profile || rooms.length === 0) return null;

  return (
    <section className="mt-8 space-y-5 rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/10 via-card/50 to-transparent p-5 shadow-sm md:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
            Stay with us
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold">Rooms designed for your stay</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Explore the room categories and send an inquiry for the dates that suit you.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {profile.star_rating && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1.5 font-bold text-gold">
              <Star className="h-3.5 w-3.5 fill-gold" /> {profile.star_rating} stars
            </span>
          )}
          {profile.check_in_time && (
            <span className="rounded-full border border-border/70 bg-background/40 px-3 py-1.5 text-muted-foreground">
              Check-in {String(profile.check_in_time).slice(0, 5)}
            </span>
          )}
          {profile.check_out_time && (
            <span className="rounded-full border border-border/70 bg-background/40 px-3 py-1.5 text-muted-foreground">
              Check-out {String(profile.check_out_time).slice(0, 5)}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {rooms.map((room) => {
          const roomPhotos = photos
            .filter((photo) => photo.room_type_id === room.id)
            .sort((a, b) => a.sort_order - b.sort_order);
          const roomImages = roomPhotos.map((photo) => photo.url);
          return (
            <article
              key={room.id}
              className="overflow-hidden rounded-2xl border border-border/60 bg-background/55"
            >
              {roomPhotos.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setLightbox({ images: roomImages, index: 0 })}
                  className="group relative block aspect-[16/9] w-full overflow-hidden bg-muted text-left"
                  aria-label={`View photos of ${room.name || "room"}`}
                >
                  <img
                    src={roomPhotos[0].url}
                    alt={room.name || "Room"}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  {roomPhotos.length > 1 && (
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white">
                      <Images className="h-3.5 w-3.5" /> {roomPhotos.length} photos
                    </span>
                  )}
                </button>
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-gold/10 to-muted text-muted-foreground">
                  <BedDouble className="h-10 w-10 text-gold/50" />
                </div>
              )}
              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-bold">
                      {room.name || "Room category"}
                    </h3>
                    {room.bed_type && (
                      <p className="mt-1 text-sm text-muted-foreground">{room.bed_type}</p>
                    )}
                  </div>
                  {room.price_from != null && (
                    <p className="shrink-0 text-right text-sm font-bold text-gold">
                      From {Number(room.price_from).toLocaleString()} {room.currency || "USD"}
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        per night
                      </span>
                    </p>
                  )}
                </div>
                {room.description && (
                  <p className="text-sm leading-6 text-muted-foreground">{room.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {room.room_size_sqm && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2.5 py-1">
                      <Ruler className="h-3.5 w-3.5 text-gold" /> {room.room_size_sqm} m²
                    </span>
                  )}
                  {room.max_guests && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2.5 py-1">
                      <Users className="h-3.5 w-3.5 text-gold" /> Up to {room.max_guests}
                    </span>
                  )}
                  {room.accessible && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2.5 py-1">
                      <Accessibility className="h-3.5 w-3.5 text-gold" /> Accessible
                    </span>
                  )}
                </div>
                {(room.amenities?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {room.amenities?.map((amenity) => (
                      <Badge key={amenity} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                )}
                {roomPhotos.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {roomPhotos.slice(0, 4).map((photo, index) => (
                      <button
                        type="button"
                        key={photo.id}
                        onClick={() => setLightbox({ images: roomImages, index })}
                        className="aspect-[4/3] overflow-hidden rounded-lg border border-border/60"
                        aria-label={`Open room photo ${index + 1}`}
                      >
                        <img
                          src={photo.url}
                          alt=""
                          className="h-full w-full object-cover transition hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
  );
}

function BusinessDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(businessDetailQuery(id));
  const b = data.business;
  const parentBrandName =
    (data.branches as any[]).find((branch) => branch.is_main_branch)?.name ||
    ((b as any).is_main_branch ? b.name : null);
  const open = computeOpenState(data.hours as any);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const mapsHref =
    b.latitude != null && b.longitude != null
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
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
          <FavoriteButton merchantId={b.id} className="absolute left-3 top-3" />
          {open !== "unknown" && (
            <Badge
              variant={open === "open" ? "default" : "secondary"}
              className="absolute right-3 top-3"
            >
              {open === "open" ? "Open now" : "Closed"}
            </Badge>
          )}
        </div>

        {/* Title row */}
        <div className="mt-4 flex items-start gap-4">
          {b.logo_url && (
            <img
              src={b.logo_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold md:text-3xl">{b.name}</h1>
            {parentBrandName && !(b as any).is_main_branch && (
              <p className="mt-1 text-sm text-muted-foreground">
                A branch of <span className="font-semibold text-foreground">{parentBrandName}</span>
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {b.category}
              </Badge>
              {b.price_level && (
                <span className="text-sm text-muted-foreground">{b.price_level}</span>
              )}
              {(b as any).review_count > 0 && (
                <span className="flex items-center gap-1 text-sm text-gold">
                  <Star className="h-3.5 w-3.5 fill-gold" />
                  {Number((b as any).avg_rating ?? 0).toFixed(1)}{" "}
                  <span className="text-muted-foreground">({(b as any).review_count})</span>
                </span>
              )}
              {b.avg_duration_minutes && (
                <span className="text-sm text-muted-foreground">
                  · ~{b.avg_duration_minutes} min visit
                </span>
              )}
              {(b as any).branch_label && (
                <Badge variant="secondary" className="text-xs">
                  {(b as any).branch_label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {data.offers.length > 0 && <LiveOffers offers={data.offers as any[]} />}

        <HotelRooms profile={data.hotelProfile} photos={data.roomPhotos as PublicRoomPhoto[]} />

        {b.description && <p className="mt-4 text-sm text-muted-foreground">{b.description}</p>}

        <ReviewsPanel
          merchantId={b.id}
          averageRating={(b as any).avg_rating}
          reviewCount={(b as any).review_count}
        />

        {/* Tags */}
        {((b.features?.length ?? 0) > 0 ||
          (b.mood_tags?.length ?? 0) > 0 ||
          (b.dietary_options?.length ?? 0) > 0) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {[...(b.mood_tags ?? []), ...(b.features ?? []), ...(b.dietary_options ?? [])].map(
              (t: string) => (
                <Badge key={t} variant="secondary" className="text-xs">
                  {t}
                </Badge>
              ),
            )}
          </div>
        )}

        {/* Ride Hailing / Taxi */}
        {b.latitude != null && b.longitude != null && (
          <div className="mt-6 rounded-2xl border border-gold/20 bg-gold/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">Get there with Taxi</h3>
                <p className="text-xs text-muted-foreground">
                  Quickest way to reach this destination.
                </p>
              </div>
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full border-2 border-background bg-green-600 p-1.5 shadow-sm">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/b/b8/Careem_logo.svg"
                    alt="Careem"
                    className="h-full w-full invert"
                  />
                </div>
                <div className="h-8 w-8 rounded-full border-2 border-background bg-yellow-400 p-1 shadow-sm">
                  <span className="flex h-full w-full items-center justify-center text-[10px] font-black text-black">
                    B
                  </span>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild className="h-12 bg-green-600 text-white hover:bg-green-700 shadow-md">
                <a
                  href={`careem://ride?dropoff_lat=${b.latitude}&dropoff_lng=${b.longitude}&dropoff_name=${encodeURIComponent(b.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    void supabase
                      .rpc("record_taxi_click" as any, {
                        p_business_id: b.id,
                        p_provider: "careem",
                      })
                      .then(({ error }) => {
                        if (error)
                          console.warn("[taxi-analytics] Careem click was not recorded", error);
                      });
                  }}
                  className="flex items-center justify-center gap-2"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/b/b8/Careem_logo.svg"
                    alt=""
                    className="h-5 w-5 invert"
                  />
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
                    void supabase
                      .rpc("record_taxi_click" as any, {
                        p_business_id: b.id,
                        p_provider: "baly",
                      })
                      .then(({ error }) => {
                        if (error)
                          console.warn("[taxi-analytics] Baly click was not recorded", error);
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
            <a
              href={mapsHref ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-muted-foreground transition hover:border-gold/40 hover:text-foreground"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="min-w-0 truncate">
                {b.address}
                {b.city ? `, ${b.city}` : ""}
              </span>
            </a>
          )}
          {b.phone && (
            <a
              href={`tel:${b.phone}`}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-muted-foreground transition hover:border-gold/40 hover:text-foreground"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-300">
                <Phone className="h-4 w-4" />
              </span>
              <span className="min-w-0 truncate">{b.phone}</span>
            </a>
          )}
          {b.email && (
            <a
              href={`mailto:${b.email}`}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-muted-foreground transition hover:border-gold/40 hover:text-foreground"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-300">
                <Mail className="h-4 w-4" />
              </span>
              <span className="min-w-0 truncate">{b.email}</span>
            </a>
          )}
          {b.website && (
            <a
              href={/^https?:\/\//i.test(b.website) ? b.website : `https://${b.website}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-muted-foreground transition hover:border-gold/40 hover:text-foreground"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold">
                <Globe className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-foreground">Website</span>
                <span className="block text-xs text-muted-foreground">Open official site</span>
              </span>
              <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0" />
            </a>
          )}
          {b.instagram && (
            <a
              href={normalizeSocialUrl(b.instagram, "instagram")}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${socialLabel(b.instagram, "instagram")} on Instagram`}
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-muted-foreground transition hover:border-pink-400/40 hover:text-foreground"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500/20 via-pink-500/15 to-amber-400/20 text-pink-300">
                <Instagram className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-foreground">Instagram</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {socialLabel(b.instagram, "instagram")}
                </span>
              </span>
              <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </a>
          )}
          {b.facebook && (
            <a
              href={normalizeSocialUrl(b.facebook, "facebook")}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${socialLabel(b.facebook, "facebook")} on Facebook`}
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-muted-foreground transition hover:border-blue-400/40 hover:text-foreground"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-500/15 text-blue-300">
                <Facebook className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-foreground">Facebook</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {socialLabel(b.facebook, "facebook")}
                </span>
              </span>
              <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </a>
          )}
        </div>

        {/* Map */}
        {b.latitude != null && b.longitude != null && (
          <div className="mt-6">
            <h2 className="mb-2 font-display text-lg font-bold">Location</h2>
            <MapView
              lat={b.latitude}
              lng={b.longitude}
              label={b.name}
              className="h-72 w-full rounded-xl border border-border"
            />
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
                  <img
                    src={p.url}
                    alt=""
                    className="aspect-square w-full rounded-lg object-cover transition hover:opacity-90"
                  />
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
          <section className="mt-8 rounded-2xl border border-border/70 bg-card/40 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
                  Plan your visit
                </p>
                <h2 className="mt-1 font-display text-xl font-bold">Opening hours</h2>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Local time · Erbil
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {DAYS.map((d, i) => {
                const h = data.hours.find((x: any) => x.day_of_week === i);
                const closed = !h || h.is_closed;
                return (
                  <div
                    key={d}
                    className={`rounded-xl border px-3 py-2.5 ${closed ? "border-border/50 bg-background/30" : "border-gold/15 bg-gold/5"}`}
                  >
                    <p className="text-xs font-bold text-foreground">{d}</p>
                    <p
                      className={`mt-1 text-[11px] leading-4 ${closed ? "text-muted-foreground" : "text-gold"}`}
                    >
                      {formatHoursLabel(h)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <BranchSelector
          currentId={b.id}
          currentName={b.name}
          currentBranchLabel={(b as any).branch_label}
          currentCity={b.city}
          isMain={Boolean((b as any).is_main_branch)}
          branches={data.branches}
        />
      </div>
    </div>
  );
}
