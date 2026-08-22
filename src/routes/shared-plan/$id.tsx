/* eslint-disable @typescript-eslint/no-explicit-any -- collaboration RPCs are not in the generated Supabase type file yet. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft, Clock3, MapPin, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { GeneratedPlan } from "@/lib/planner-engine";

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
              <Users className="h-4 w-4" /> Shared ErbilGo plan
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">{saved.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {saved.summary || "A day in Erbil shaped together."}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/plan">
              <ArrowLeft className="mr-2 h-4 w-4" /> Create your own plan
            </Link>
          </Button>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <Stat label="Stops" value={String(plan.stops.length)} />
          <Stat
            label="Estimated spend"
            value={plan.estimatedCostUSD ? `$${plan.estimatedCostUSD}` : "Free"}
          />
          <Stat label="Shared with" value="Your group" />
        </div>
        <div className="mt-8 space-y-4">
          {plan.stops.map((stop, index) => (
            <article
              key={`${stop.location.id}-${index}`}
              className="rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5"
            >
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
                      <Clock3 className="h-3.5 w-3.5" /> {formatHour(Math.floor(stop.startHour))}
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
                  {stop.location.merchantId && (
                    <Link
                      to="/business/$id"
                      params={{ id: stop.location.merchantId }}
                      className="mt-3 inline-flex text-xs font-bold uppercase tracking-wider text-gold hover:underline"
                    >
                      View place
                    </Link>
                  )}
                </div>
              </div>
            </article>
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
function formatHour(h: number) {
  const s = h >= 12 ? "PM" : "AM";
  const n = h % 12 || 12;
  return `${n}:00 ${s}`;
}
