/* eslint-disable @typescript-eslint/no-explicit-any -- user_itineraries is not in the generated Supabase types yet. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, Clock3, ExternalLink, Loader2, MapPin, Pencil, Search, Sparkles, Trash2, Wallet } from "lucide-react";
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

        {total > 0 && (
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
      </main>

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
