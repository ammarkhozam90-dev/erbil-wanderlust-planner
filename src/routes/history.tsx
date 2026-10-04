/* eslint-disable @typescript-eslint/no-explicit-any -- user_itineraries is not in the generated Supabase types yet. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, ExternalLink, Loader2, LogOut, MapPin, Pencil, Search, Share2, Sparkles, Trash2, Users, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { GeneratedPlan } from "@/lib/planner-engine";
import { SharePlanDialog } from "@/components/planner/SharePlanDialog";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "My History — ErbilGo" },
      { name: "description", content: "Your saved ErbilGo day plans." },
    ],
  }),
  component: HistoryPage,
});

type SavedPlan = {
  id: string;
  title: string;
  summary: string | null;
  plan_data: GeneratedPlan | null;
  is_public: boolean;
  created_at: string;
};

type Invitation = {
  id: string;
  itinerary_id: string;
  role: "viewer" | "editor";
  status: "pending" | "accepted";
  plan_title: string;
  plan_summary: string | null;
  owner_name: string;
};

const db = supabase as any;

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function HistoryPage() {
  const { session, loading } = useAuth();
  const qc = useQueryClient();
  const userId = session?.user?.id;
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [toDelete, setToDelete] = useState<SavedPlan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [tab, setTab] = useState<"mine" | "shared">("mine");
  const [shareFor, setShareFor] = useState<SavedPlan | null>(null);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);

  const plans = useQuery({
    queryKey: ["my-saved-plans", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await db
        .from("user_itineraries")
        .select("id,title,summary,plan_data,is_public,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedPlan[];
    },
  });

  const invitations = useQuery({
    queryKey: ["my-itinerary-invitations", userId],
    enabled: Boolean(userId),
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await db.rpc("list_my_itinerary_invitations");
      if (error) throw error;
      return (data ?? []) as Invitation[];
    },
  });

  // How many people each of my plans is shared with (owner can read these rows).
  const planIds = (plans.data ?? []).map((p) => p.id);
  const sharing = useQuery({
    queryKey: ["my-plan-sharing", userId, planIds.join(",")],
    enabled: Boolean(userId) && planIds.length > 0,
    queryFn: async () => {
      const { data, error } = await db
        .from("itinerary_collaborators")
        .select("itinerary_id,status")
        .in("itinerary_id", planIds);
      if (error) return {} as Record<string, { accepted: number; pending: number }>;
      const map: Record<string, { accepted: number; pending: number }> = {};
      for (const row of data ?? []) {
        const entry = (map[row.itinerary_id] ??= { accepted: 0, pending: 0 });
        if (row.status === "accepted") entry.accepted++;
        else if (row.status === "pending") entry.pending++;
      }
      return map;
    },
  });

  const pendingInvites = (invitations.data ?? []).filter((i) => i.status === "pending");
  const joinedPlans = (invitations.data ?? []).filter((i) => i.status === "accepted");

  async function respond(inv: Invitation, accept: boolean) {
    setBusyInvite(inv.id);
    const { error } = await db.rpc("respond_to_itinerary_invitation", {
      p_collaborator_id: inv.id,
      p_accept: accept,
    });
    setBusyInvite(null);
    if (error) return toast.error(error.message || "Could not update the invitation.");
    toast.success(accept ? "You joined the plan." : "Invitation declined.");
    qc.invalidateQueries({ queryKey: ["my-itinerary-invitations", userId] });
  }

  async function leave(inv: Invitation) {
    setBusyInvite(inv.id);
    const { error } = await db.rpc("remove_itinerary_collaborator", { p_collaborator_id: inv.id });
    setBusyInvite(null);
    if (error) return toast.error(error.message || "Could not leave the plan.");
    toast.success("You left the plan.");
    qc.invalidateQueries({ queryKey: ["my-itinerary-invitations", userId] });
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (plans.data ?? []).filter((p) => {
      if (!q) return true;
      const stops = (p.plan_data?.stops ?? []).map((s) => s.location?.name ?? "").join(" ");
      return `${p.title} ${p.summary ?? ""} ${stops}`.toLowerCase().includes(q);
    });
    return sort === "newest" ? list : [...list].reverse();
  }, [plans.data, search, sort]);

  async function rename(plan: SavedPlan) {
    const title = draftTitle.trim();
    setEditingId(null);
    if (!title || title === plan.title) return;
    const { error } = await db.from("user_itineraries").update({ title }).eq("id", plan.id);
    if (error) return toast.error(`Could not rename: ${error.message}`);
    toast.success("Plan renamed");
    qc.invalidateQueries({ queryKey: ["my-saved-plans", userId] });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await db.from("user_itineraries").delete().eq("id", toDelete.id);
    setDeleting(false);
    if (error) return toast.error(`Could not delete: ${error.message}`);
    toast.success("Plan deleted");
    setToDelete(null);
    qc.invalidateQueries({ queryKey: ["my-saved-plans", userId] });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="flex justify-center py-32 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-bold">Sign in to see your history</h1>
          <p className="mt-3 text-sm text-muted-foreground">Your saved day plans live here.</p>
          <Button asChild className="mt-6 bg-gold text-background hover:bg-gold/90">
            <Link to="/auth">Sign in</Link>
          </Button>
        </main>
      </div>
    );
  }

  const total = plans.data?.length ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-10 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">Your history</p>
            <h1 className="mt-2 font-display text-4xl font-bold">Saved day plans</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {total === 0 ? "Plans you save from Plan My Day appear here." : `${total} saved ${total === 1 ? "plan" : "plans"}`}
            </p>
          </div>
          <Button asChild className="bg-gold text-background hover:bg-gold/90">
            <Link to="/plan"><Sparkles className="mr-2 h-4 w-4" /> Plan a new day</Link>
          </Button>
        </div>

        <div className="mt-6 flex gap-2 border-b border-border/60">
          {([
            ["mine", "My plans", total],
            ["shared", "Shared with me", pendingInvites.length + joinedPlans.length],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                tab === key ? "border-gold text-gold" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{count}</span>
              {key === "shared" && pendingInvites.length > 0 && (
                <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white">
                  {pendingInvites.length} new
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "shared" && (
          <div className="mt-6 space-y-8">
            {invitations.isLoading && (
              <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
            )}
            {invitations.isError && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm">
                Could not load shared plans. The sharing database setup may not be installed yet.
              </div>
            )}

            {pendingInvites.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-2xl font-bold">Invitations waiting for you</h2>
                {pendingInvites.map((inv) => (
                  <article key={inv.id} className="rounded-3xl border border-gold/30 bg-gold/5 p-5">
                    <p className="text-xs text-muted-foreground">{inv.owner_name} invited you to a plan</p>
                    <h3 className="mt-1 font-display text-2xl font-bold">{inv.plan_title}</h3>
                    {inv.plan_summary && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{inv.plan_summary}</p>}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge className="bg-gold text-background">Can {inv.role === "editor" ? "edit" : "view"}</Badge>
                      <Button size="sm" disabled={busyInvite === inv.id} onClick={() => respond(inv, true)} className="bg-gold text-background hover:bg-gold/90">
                        <Check className="mr-1.5 h-4 w-4" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" disabled={busyInvite === inv.id} onClick={() => respond(inv, false)}>
                        <X className="mr-1.5 h-4 w-4" /> Decline
                      </Button>
                    </div>
                  </article>
                ))}
              </section>
            )}

            <section className="space-y-3">
              <h2 className="font-display text-2xl font-bold">Plans you joined</h2>
              {!invitations.isLoading && joinedPlans.length === 0 && (
                <div className="rounded-3xl border border-dashed border-border p-10 text-center">
                  <Users className="mx-auto h-9 w-9 text-gold" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    When a friend invites you to a plan and you accept, it shows up here.
                  </p>
                </div>
              )}
              {joinedPlans.map((inv) => (
                <article key={inv.id} className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-display text-xl font-bold">{inv.plan_title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      By {inv.owner_name} · You can {inv.role === "editor" ? "edit" : "view"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="bg-gold text-background hover:bg-gold/90">
                      <Link to="/shared-plan/$id" params={{ id: inv.itinerary_id }}><ExternalLink className="mr-2 h-3.5 w-3.5" /> Open</Link>
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyInvite === inv.id} onClick={() => leave(inv)}>
                      <LogOut className="mr-2 h-3.5 w-3.5" /> Leave
                    </Button>
                  </div>
                </article>
              ))}
            </section>
          </div>
        )}

        {tab === "mine" && total > 0 && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or place…" className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Button variant={sort === "newest" ? "default" : "outline"} size="sm" onClick={() => setSort("newest")}>Newest</Button>
              <Button variant={sort === "oldest" ? "default" : "outline"} size="sm" onClick={() => setSort("oldest")}>Oldest</Button>
            </div>
          </div>
        )}

        {tab === "mine" && (
        <div className="mt-6 space-y-4">
          {plans.isLoading && (
            <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          )}

          {plans.isError && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm">
              Could not load your plans: {(plans.error as Error)?.message}
            </div>
          )}

          {!plans.isLoading && !plans.isError && total === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-gold" />
              <h2 className="mt-4 font-display text-2xl font-bold">No saved plans yet</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Generate a plan and press “Save to profile”. It will show up here so you can reopen it any time.
              </p>
              <Button asChild className="mt-5 bg-gold text-background hover:bg-gold/90">
                <Link to="/plan">Plan my day</Link>
              </Button>
            </div>
          )}

          {total > 0 && visible.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">No plans match “{search}”.</p>
          )}

          {visible.map((p) => {
            const stops = p.plan_data?.stops ?? [];
            const cost = p.plan_data?.estimatedCostUSD;
            return (
              <article key={p.id} className="rounded-3xl border border-border/60 bg-card p-5 transition hover:border-gold/30 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    {editingId === p.id ? (
                      <Input
                        autoFocus
                        value={draftTitle}
                        maxLength={80}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onBlur={() => rename(p)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") rename(p);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      <h2 className="font-display text-2xl font-bold leading-tight">{p.title}</h2>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-gold" /> {fmtDate(p.created_at)}</span>
                      {stops.length > 0 && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gold" /> {stops.length} stops</span>}
                      {p.plan_data?.totalHours ? <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-gold" /> {p.plan_data.totalHours}h</span> : null}
                      {cost ? <span className="inline-flex items-center gap-1"><Wallet className="h-3.5 w-3.5 text-gold" /> ~${cost}</span> : null}
                    </div>
                    {(sharing.data?.[p.id]?.accepted || sharing.data?.[p.id]?.pending) ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-gold">
                        <Users className="h-3.5 w-3.5" />
                        {sharing.data?.[p.id]?.accepted ? `Shared with ${sharing.data[p.id].accepted}` : ""}
                        {sharing.data?.[p.id]?.accepted && sharing.data?.[p.id]?.pending ? " · " : ""}
                        {sharing.data?.[p.id]?.pending ? `${sharing.data[p.id].pending} pending` : ""}
                      </p>
                    ) : null}
                    {p.summary && <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{p.summary}</p>}
                    {stops.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {stops.slice(0, 5).map((s, i) => (
                          <Badge key={i} variant="outline" className="font-normal">{s.location?.name}</Badge>
                        ))}
                        {stops.length > 5 && <Badge variant="outline" className="font-normal">+{stops.length - 5}</Badge>}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2 sm:flex-col">
                    <Button asChild size="sm" className="bg-gold text-background hover:bg-gold/90">
                      <Link to="/shared-plan/$id" params={{ id: p.id }}><ExternalLink className="mr-2 h-3.5 w-3.5" /> Open</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShareFor(p)}>
                      <Share2 className="mr-2 h-3.5 w-3.5" /> Share
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(p.id); setDraftTitle(p.title); }}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setToDelete(p)}>
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        )}
      </main>

      <SharePlanDialog
        itineraryId={shareFor?.id ?? null}
        title={shareFor?.title}
        open={!!shareFor}
        onOpenChange={(o) => {
          if (!o) {
            setShareFor(null);
            qc.invalidateQueries({ queryKey: ["my-plan-sharing"] });
          }
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.title}” will be removed permanently, including for anyone you shared it with.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
