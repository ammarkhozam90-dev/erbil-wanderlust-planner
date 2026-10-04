/* eslint-disable @typescript-eslint/no-explicit-any -- collaboration RPCs are not in the generated Supabase type file yet. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect } from "react";
import { ArrowLeft, Clock3, Copy, MapPin, Navigation, Share2, Users } from "lucide-react";
import { useState } from "react";
import { SharePlanDialog } from "@/components/planner/SharePlanDialog";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { GeneratedPlan } from "@/lib/planner-engine";
import { StopWhyBadge } from "@/components/planner/StopWhyBadge";
import { TravelLeg } from "@/components/planner/TravelLeg";

export const Route = createFileRoute("/shared-plan/$id")({
  head: () => ({
    meta: [
      { title: "Shared Plan — ErbilGo" },
      { name: "description", content: "A collaborative Erbil itinerary planned with ErbilGo." },
    ],
  }),
  component: SharedPlanPage,
});

type SavedItinerary = {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  plan_data: GeneratedPlan;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

const db = supabase as any;

function SharedPlanPage() {
  const { id } = Route.useParams();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`shared-itinerary-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_itineraries", filter: `id=eq.${id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shared-itinerary", id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const planQuery = useQuery({
    queryKey: ["shared-itinerary", id, session?.user?.id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await db
        .from("user_itineraries")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as SavedItinerary | null;
    },
  });

  const isOwner = Boolean(session?.user && planQuery.data && planQuery.data.user_id === session.user.id);

  const peopleQuery = useQuery({
    queryKey: ["shared-itinerary-people", id, session?.user?.id],
    enabled: Boolean(id && planQuery.data && session?.user),
    queryFn: async () => {
      const { data, error } = await db.rpc("list_itinerary_collaborators", { p_itinerary_id: id });
      if (error) return [] as any[];
      return (data ?? []) as {
        id: string; user_id: string; role: "viewer" | "editor"; status: string;
        full_name: string | null; avatar_url: string | null;
      }[];
    },
  });
  const people = (peopleQuery.data ?? []).filter((p) => p.status === "accepted");
  const pendingCount = (peopleQuery.data ?? []).filter((p) => p.status === "pending").length;
  const myRole = people.find((p) => p.user_id === session?.user?.id)?.role;

  if (planQuery.isLoading)
    return (
      <Shell>
        <div className="py-20 text-center text-sm text-muted-foreground">Loading shared plan…</div>
      </Shell>
    );
  if (planQuery.isError || !planQuery.data)
    return (
      <Shell>
        <div className="mx-auto max-w-md py-20 text-center">
          <Users className="mx-auto h-10 w-10 text-gold" />
          <h1 className="mt-5 font-display text-3xl font-bold">This plan is not available</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The plan may be private, deleted, or you may need to accept the invitation before
            opening it.
          </p>
          <Button asChild className="mt-6 bg-gold text-background hover:bg-gold/90">
            <Link to="/shared-plans">Go to shared plans</Link>
          </Button>
        </div>
      </Shell>
    );

  const saved = planQuery.data;
  const plan = saved.plan_data;
  return (
    <Shell>
      <main className="mx-auto max-w-5xl px-4 py-10 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
              <Users className="h-4 w-4" /> {isOwner ? "Your ErbilGo plan" : "Shared ErbilGo plan"}
              <Badge variant="outline" className="ml-1 font-semibold normal-case tracking-normal">
                {isOwner ? "Owner" : myRole === "editor" ? "You can edit" : "You can view"}
              </Badge>
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">{saved.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {saved.summary || "A day in Erbil shaped together."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <Button onClick={() => setShareOpen(true)} className="bg-gold text-background hover:bg-gold/90">
                <Share2 className="mr-2 h-4 w-4" /> Share & invite
              </Button>
            )}
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied. Only people you invited can open it.");
                } catch {
                  toast.error("Could not copy the link.");
                }
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy link
            </Button>
            <Button asChild variant="outline">
              <Link to="/plan">
                <ArrowLeft className="mr-2 h-4 w-4" /> Create your own plan
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <Stat label="Stops" value={String(plan.stops.length)} />
          <Stat
            label="Estimated spend"
            value={plan.estimatedCostUSD ? `$${plan.estimatedCostUSD}` : "Free"}
          />
          <Stat
            label="People on this plan"
            value={String(1 + people.filter((p) => p.user_id !== saved.user_id).length)}
          />
        </div>
        {(people.length > 0 || pendingCount > 0) && (
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/35 p-3">
            <Users className="h-4 w-4 text-gold" />
            {people.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 py-1 pl-1 pr-3 text-xs">
                <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-gold/10 text-[10px] font-bold text-gold">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p.full_name || "?").slice(0, 1).toUpperCase()}
                </span>
                {p.full_name || "ErbilGo traveller"} · {p.role === "editor" ? "edit" : "view"}
              </span>
            ))}
            {pendingCount > 0 && isOwner && (
              <span className="text-xs text-muted-foreground">{pendingCount} invitation{pendingCount > 1 ? "s" : ""} pending</span>
            )}
          </div>
        )}
        {isOwner && (
          <SharePlanDialog
            itineraryId={saved.id}
            title={saved.title}
            open={shareOpen}
            onOpenChange={(o) => {
              setShareOpen(o);
              if (!o) queryClient.invalidateQueries({ queryKey: ["shared-itinerary-people", id] });
            }}
          />
        )}
        {plan.warnings?.length > 0 && (
          <div className="mt-5 rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm text-muted-foreground">
            {plan.warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        )}
        <div className="mt-8 space-y-4">
          {plan.stops.map((stop, index) => (
            <Fragment key={`${stop.location.id}-${index}`}>
            <TravelLeg stop={stop} mode={plan.travelMode} />
            <article className="rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5">
              <div className="flex gap-4">
                <div className="hidden w-32 shrink-0 overflow-hidden rounded-xl sm:block">
                  <img
                    src={stop.location.image || "/placeholder.svg"}
                    alt=""
                    className="h-full min-h-28 w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-gold text-background">Stop {index + 1}</Badge>
                    <span className="flex items-center gap-1 text-xs font-semibold text-gold">
                      <Clock3 className="h-3.5 w-3.5" /> {formatHour(stop.startHour)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round((stop.endHour - stop.startHour) * 60)} min
                    </span>
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold">{stop.location.name}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-gold" />
                    {stop.location.area} · {stop.location.category}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{stop.reason}</p>
                  <StopWhyBadge stop={stop} />
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    {stop.location.merchantId && (
                      <Link
                        to="/business/$id"
                        params={{ id: stop.location.merchantId }}
                        className="inline-flex text-xs font-bold uppercase tracking-wider text-gold hover:underline"
                      >
                        View place
                      </Link>
                    )}
                    {Number.isFinite(stop.location.lat) && Number.isFinite(stop.location.lng) && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${stop.location.lat},${stop.location.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold hover:underline"
                      >
                        <Navigation className="h-3.5 w-3.5" /> Open in Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </article>
            </Fragment>
          ))}
        </div>
      </main>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      {children}
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/35 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-gold">{value}</p>
    </div>
  );
}
function formatHour(value: number) {
  const total = Math.round(value * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const s = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${s}`;
}
