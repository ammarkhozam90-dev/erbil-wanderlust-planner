import { supabase } from "@/integrations/supabase/client";
import type { LearnedAffinity, PlannerCandidate } from "@/lib/planner-engine";

/**
 * Plan My Day — learning from behaviour (Phase 2).
 * Signals: saved plan, liked/disliked a stop, swapped a stop, opened a place, favorited.
 * Signed-in visitors: stored in the `planner_feedback` table.
 * Guests: stored in localStorage (merged into the account after sign-in).
 */
export type FeedbackAction = "save_plan" | "like" | "dislike" | "swap_out" | "open" | "favorite";

const ACTION_WEIGHT: Record<FeedbackAction, number> = {
  save_plan: 0.6,
  like: 1,
  favorite: 1,
  open: 0.2,
  dislike: -1,
  swap_out: -0.6,
};

const LOCAL_KEY = "erbilgo_planner_feedback_v1";
const HALF_LIFE_DAYS = 45; // older signals count less

export interface FeedbackEvent {
  action: FeedbackAction;
  place_id: string;
  category: string;
  tags: string[];
  created_at: string;
}

function readLocal(): FeedbackEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeLocal(events: FeedbackEvent[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(events.slice(-200)));
  } catch {
    /* private mode / storage full: learning just pauses */
  }
}

/** Record one signal. Safe to call fire-and-forget. */
export async function recordFeedback(
  action: FeedbackAction,
  place: Pick<PlannerCandidate, "id" | "category" | "tags">,
) {
  const event: FeedbackEvent = {
    action,
    place_id: place.id,
    category: place.category,
    tags: (place.tags ?? []).map((t) => t.toLowerCase()),
    created_at: new Date().toISOString(),
  };
  try {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.from("planner_feedback" as never).insert({ ...event, user_id: data.user.id } as never);
    } else {
      writeLocal([...readLocal(), event]);
    }
  } catch {
    /* feedback must never break the planner */
  }
}

/** Record a saved plan: every stop gets a positive signal. */
export async function recordSavedPlan(stops: { location: PlannerCandidate }[]) {
  await Promise.all(stops.map((s) => recordFeedback("save_plan", s.location)));
}

/** After sign-in: move guest signals into the account. */
export async function syncGuestFeedback() {
  try {
    const events = readLocal();
    if (!events.length) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { error } = await supabase
      .from("planner_feedback" as never)
      .insert(events.map((e) => ({ ...e, user_id: data.user!.id })) as never);
    if (!error) writeLocal([]);
  } catch {
    /* try again next time */
  }
}

/** Turn raw events into a compact affinity profile for the engine. */
export function buildAffinity(events: FeedbackEvent[]): LearnedAffinity {
  const now = Date.now();
  const acc = { categories: {} as Record<string, number>, tags: {} as Record<string, number>, places: {} as Record<string, number> };
  const add = (map: Record<string, number>, key: string, v: number) => (map[key] = (map[key] ?? 0) + v);
  for (const e of events) {
    const ageDays = (now - new Date(e.created_at).getTime()) / 86_400_000;
    const v = ACTION_WEIGHT[e.action] * Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
    add(acc.places, e.place_id, v);
    add(acc.categories, e.category, v);
    for (const t of e.tags) add(acc.tags, t, v);
  }
  const squash = (map: Record<string, number>) =>
    Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Math.tanh(v / 2)]));
  return {
    categories: squash(acc.categories),
    tags: squash(acc.tags),
    places: squash(acc.places),
    eventCount: events.length,
  };
}

/** Load the visitor's affinity (account or guest). Pass result as `input.affinity`. */
export async function loadAffinity(): Promise<LearnedAffinity> {
  try {
    const { data } = await supabase.auth.getUser();
    let events: FeedbackEvent[] = readLocal();
    if (data.user) {
      // Signed in: move any guest signals into the account first, so they are not lost or double counted.
      await syncGuestFeedback();
      const { data: rows } = await supabase
        .from("planner_feedback" as never)
        .select("action, place_id, category, tags, created_at")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(300);
      events = (rows as FeedbackEvent[] | null) ?? [];
    }
    return buildAffinity(events);
  } catch {
    return buildAffinity([]);
  }
}
