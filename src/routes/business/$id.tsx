import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { MapView } from "@/components/MapView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { computeOpenState } from "@/lib/opening-status";
import { toast } from "sonner";
import {
  MapPin, Phone, Mail, Globe, Instagram, Facebook, ExternalLink, Store, Clock, Loader2,
} from "lucide-react";

const businessDetailQuery = (id: string) => queryOptions({
  queryKey: ["business-detail", id],
  queryFn: async () => {
    const [{ data: business, error }, { data: photos }, { data: hours }] = await Promise.all([
      supabase.from("merchants").select("*").eq("id", id).eq("status", "approved").maybeSingle(),
      supabase.from("merchant_photos").select("*").eq("merchant_id", id).order("sort_order"),
      supabase.from("merchant_hours").select("*").eq("merchant_id", id).order("day_of_week"),
    ]);
    if (error) throw error;
    if (!business) throw notFound();
    return { business, photos: photos ?? [], hours: hours ?? [] };
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

function ClaimBanner({ businessId, claimStatus }: { businessId: string; claimStatus: string | null | undefined }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { data: pendingClaim } = useQuery({
    queryKey: ["business-pending-claim", businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchant_claims")
        .select("*")
        .eq("merchant_id", businessId)
        .eq("status", "pending")
        .maybeSingle();
      return data;
    },
    enabled: claimStatus === "unclaimed",
  });

  if (claimStatus !== "unclaimed") return null;

  async function submitClaim() {
    if (!session?.user) {
      toast("Sign in as a merchant first to claim this business.");
      navigate({ to: "/merchant/auth" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("merchant_claims").insert({
      merchant_id: businessId,
      requester_id: session.user.id,
    } as any);
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("duplicate") || error.message.includes("uq_one_pending")
        ? "This business already has a pending claim."
        : error.message);
      return;
    }
    toast.success("Claim submitted — an admin will review it shortly.");
    qc.invalidateQueries({ queryKey: ["business-pending-claim", businessId] });
  }

  const isMine = pendingClaim && session?.user?.id === pendingClaim.requester_id;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/5 p-4">
      <div className="flex items-center gap-3">
        <Store className="h-5 w-5 shrink-0 text-gold" />
        <div>
          <p className="text-sm font-semibold">Is this your business?</p>
          <p className="text-xs text-muted-foreground">
            {pendingClaim
              ? (isMine ? "Your claim is awaiting admin review." : "A claim request for this listing is under review.")
              : "Claim it to manage photos, hours, and more."}
          </p>
        </div>
      </div>
      {!pendingClaim && (
        <Button size="sm" onClick={submitClaim} disabled={submitting} className="bg-gold text-background hover:bg-gold/90">
          {submitting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          Claim this business
        </Button>
      )}
      {pendingClaim && <Badge className="bg-yellow-500/10 text-yellow-700"><Clock className="mr-1 h-3 w-3" /> Pending review</Badge>}
    </div>
  );
}

function BusinessDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(businessDetailQuery(id));
  const b = data.business;
  const open = computeOpenState(data.hours as any);

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
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">{b.category}</Badge>
              {b.price_level && <span className="text-sm text-muted-foreground">{b.price_level}</span>}
              {b.avg_duration_minutes && (
                <span className="text-sm text-muted-foreground">· ~{b.avg_duration_minutes} min visit</span>
              )}
            </div>
          </div>
        </div>

        <ClaimBanner businessId={b.id} claimStatus={(b as any).claim_status} />

        {b.description && <p className="mt-4 text-sm text-muted-foreground">{b.description}</p>}

        {/* Tags */}
        {((b.features?.length ?? 0) > 0 || (b.mood_tags?.length ?? 0) > 0 || (b.dietary_options?.length ?? 0) > 0) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {[...(b.mood_tags ?? []), ...(b.features ?? []), ...(b.dietary_options ?? [])].map((t: string) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
          </div>
        )}

        {/* Contact */}
        <div className="mt-6 grid gap-2 text-sm md:grid-cols-2">
          {b.address && (
            <a href={mapsHref ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <MapPin className="h-4 w-4 shrink-0" /> {b.address}{b.city ? `, ${b.city}` : ""}
            </a>
          )}
          {b.phone && (
            <a href={`tel:${b.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Phone className="h-4 w-4 shrink-0" /> {b.phone}
            </a>
          )}
          {b.email && (
            <a href={`mailto:${b.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Mail className="h-4 w-4 shrink-0" /> {b.email}
            </a>
          )}
          {b.website && (
            <a href={b.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Globe className="h-4 w-4 shrink-0" /> Website <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {b.instagram && (
            <a href={`https://instagram.com/${b.instagram.replace("@", "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Instagram className="h-4 w-4 shrink-0" /> @{b.instagram.replace("@", "")}
            </a>
          )}
          {b.facebook && (
            <a href={b.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Facebook className="h-4 w-4 shrink-0" /> Facebook
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
              {data.photos.map((p: any) => (
                <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                  <img src={p.url} alt="" className="aspect-square w-full rounded-lg object-cover transition hover:opacity-90" />
                </a>
              ))}
            </div>
          </div>
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
      </div>
    </div>
  );
}
