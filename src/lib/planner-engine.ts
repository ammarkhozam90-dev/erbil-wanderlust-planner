import type { Location, Category } from "@/data/locations";

export type PlannerCompanion = "Solo" | "Couple" | "Friends" | "Family" | "Work";
export type PlannerMood =
  | "Relaxed"
  | "Cultural"
  | "Adventurous"
  | "Romantic"
  | "Family"
  | "Productive"
  | "Social";
export type PlannerBudget = "Budget" | "Balanced" | "Premium";
export type PlannerDuration = 2 | 4 | 6 | 8;

export interface PlannerProfile {
  interests?: string[] | null;
  travel_styles?: string[] | null;
  budget_preference?: string | null;
  mobility_level?: string | null;
  travel_companion?: string | null;
  favorites?: string[] | null;
  dietary_preferences?: string[] | null;
}

export interface PlannerDayHours {
  openMin: number;
  closeMin: number;
  isClosed?: boolean;
  is24h?: boolean;
}

export interface PlannerInput {
  companion: PlannerCompanion;
  mood: PlannerMood;
  budget: PlannerBudget;
  durationHours: PlannerDuration;
  startHour: number;
  interests: Category[];
  profile?: PlannerProfile | null;
  startPoint?: { lat: number; lng: number } | null;
  dayOfWeek?: number;
  indoorPreference?: "any" | "indoor" | "outdoor";
  mobility?: "any" | "easy" | "active";
  /** v2: optional extra moods (visitor can pick up to 2 more). */
  extraMoods?: PlannerMood[];
  /** v2: slow = fewer, longer stops · fast = more, shorter stops. */
  pace?: "slow" | "normal" | "fast";
  /** v2: preferred food styles, e.g. "kurdish", "seafood", "vegetarian". */
  foodPreferences?: string[];
  /** v2: things to avoid, e.g. "crowded", "loud", "smoking", "stairs". */
  avoid?: string[];
  /** v2: one category the visitor wants guaranteed in the plan. */
  mustInclude?: Category | null;
  /** v3: how the visitor moves between stops. Changes travel-time estimates. */
  travelMode?: "walking" | "car" | "taxi";
  /** v3: learned taste from saves / likes / swaps (see planner-learning.ts). */
  affinity?: LearnedAffinity | null;
  /** v3: place ids the visitor rejected — never suggested again in this plan. */
  excludeIds?: string[];
}

/** v3: learned preferences. Values roughly -1 (dislikes) .. +1 (loves). */
export interface LearnedAffinity {
  categories: Record<string, number>;
  tags: Record<string, number>;
  places: Record<string, number>;
  eventCount: number;
}

/** v2: why a place scored the way it did. Used to build the "Why we picked this" line. */
export interface ScoreBreakdown {
  total: number;
  matchPercent: number;
  reasons: string[];
}

export interface PlannerCandidate extends Location {
  approved?: boolean;
  isSponsored?: boolean;
  avgRating?: number | null;
  reviewCount?: number | null;
  tags?: string[];
  dietaryOptions?: string[];
  transportation?: string[];
  bestVisitTime?: string | null;
  hoursByDay?: Record<number, PlannerDayHours>;
  indoor?: boolean;
  accessibility?: "easy" | "moderate" | "active";
  merchantId?: string;
  branchId?: string;
}

export interface PlanStop {
  location: PlannerCandidate;
  startHour: number;
  endHour: number;
  reason: string;
  /** v2: 0-100 match score shown as a badge. */
  matchPercent?: number;
  /** v2: short bullet reasons, e.g. ["Matches your romantic mood", "5 min from previous stop"]. */
  reasons?: string[];
  estimatedCostUSD: number;
  distanceKmFromPrevious?: number;
  travelMinutesFromPrevious?: number;
}

export interface GeneratedPlan {
  title: string;
  summary: string;
  totalHours: number;
  estimatedCostUSD: number;
  stops: PlanStop[];
  alternatives: PlannerCandidate[];
  warnings: string[];
}

/** Central tuning surface. Keep these values in code for the MVP; move them to an admin settings table later. */
export const PLANNER_WEIGHTS = {
  mood_match: 25,
  interest_match: 20,
  companion_match: 18,
  budget_fit: 12,
  distance_efficiency: 15,
  rating_bonus: 8,
  favorite_match: 12,
  time_fit: 10,
  dietary_match: 10,
  feature_match: 8,
  sponsored_bonus: 5,
  food_match: 12,
  avoid_penalty: 30,
  learned_match: 18,
  closing_soon_penalty: 20,
  part_of_day_fit: 10,
};

/** v3: speed per travel mode + fixed overhead (parking, waiting for a taxi). */
const TRAVEL_SPEED = {
  walking: { kmh: 4.5, overhead: 0, maxKm: 2.5 },
  car: { kmh: 22, overhead: 8, maxKm: 40 },
  taxi: { kmh: 22, overhead: 6, maxKm: 40 },
} as const;

function partOfDay(hour: number): "morning" | "afternoon" | "evening" | "night" {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

function isMealTime(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  return (h >= 12 && h < 15) || (h >= 19 && h < 22.5);
}

/** Whole-word tokens, so "bar" never matches "barista" and "mall" never matches "small". */
const AVOID_TOKENS: Record<string, string[]> = {
  crowded: ["crowded", "busy", "mall", "bazaar", "market", "souq"],
  loud: ["loud", "live music", "nightlife", "club", "bar", "pub"],
  smoking: ["shisha", "hookah", "smoking", "argila", "nargile"],
  stairs: ["hike", "climb", "stairs", "mountain"],
};

/** Prefix keywords per food style, so "dessert" matches "desserts" and "kebab" counts as grill. */
const FOOD_KEYWORDS: Record<string, string[]> = {
  kurdish: ["kurdish", "kurd"],
  arabic: ["arabic", "arab", "levantine", "lebanese", "syrian"],
  turkish: ["turkish", "turk"],
  grill: ["grill", "bbq", "barbecue", "kebab", "kabab"],
  seafood: ["seafood", "fish"],
  "fast food": ["fast food", "burger", "pizza", "shawarma"],
  vegetarian: ["vegetarian", "vegan"],
  desserts: ["dessert", "sweet", "bakery", "ice cream", "kunafa"],
};

const BUDGET_LIMITS: Record<PlannerBudget, number> = {
  Budget: 25,
  Balanced: 75,
  Premium: Number.POSITIVE_INFINITY,
};

const MOOD_ALIASES: Record<PlannerMood, string[]> = {
  Relaxed: ["Relaxed", "quiet", "calm", "cozy"],
  Cultural: ["Cultural", "cultural", "history", "heritage", "museum"],
  Adventurous: ["Adventurous", "nature", "outdoor", "active"],
  Romantic: ["Romantic", "romantic", "sunset", "intimate"],
  Family: ["Family", "family", "kids", "play"],
  Productive: ["Productive", "wifi", "quiet", "work"],
  Social: ["Social", "social", "music", "nightlife", "friends"],
};

const MOOD_CATEGORIES: Record<PlannerMood, Category[]> = {
  Relaxed: ["Cafés", "Parks & Nature", "Shopping"],
  Cultural: ["Landmarks", "Art & Culture", "Shopping"],
  Adventurous: ["Things to Do", "Parks & Nature", "Landmarks"],
  Romantic: ["Restaurants", "Cafés", "Landmarks", "Nightlife"],
  Family: ["Parks & Nature", "Things to Do", "Shopping", "Restaurants"],
  Productive: ["Cafés", "Shopping"],
  Social: ["Restaurants", "Nightlife", "Cafés", "Shopping"],
};

const COMPANION_ALIASES: Record<PlannerCompanion, string[]> = {
  Solo: ["Solo"],
  Couple: ["Couple"],
  Friends: ["Friends"],
  Family: ["Family"],
  Work: ["Solo", "Friends"],
};

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word match (optional plural s/es). */
function hasWord(text: string, token: string) {
  const t = normalize(token);
  if (!t) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(t)}(s|es)?($|[^a-z0-9])`).test(text);
}

/** Word-start match that allows suffixes ("dessert" matches "desserts"). */
function hasPrefix(text: string, token: string) {
  const t = normalize(token);
  if (!t) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(t)}`).test(text);
}

function activeMoods(input: PlannerInput): PlannerMood[] {
  return Array.from(new Set<PlannerMood>([input.mood, ...(input.extraMoods ?? [])]));
}

/** Score is shown relative to what was actually reachable for this visitor's answers, not a fixed ceiling. */
function reachableMax(input: PlannerInput, candidate: PlannerCandidate) {
  const w = PLANNER_WEIGHTS;
  let max =
    w.mood_match + w.interest_match + w.companion_match + w.budget_fit + w.rating_bonus + w.distance_efficiency;
  if (input.budget === "Balanced") max += 5;
  if (input.profile?.favorites?.length) max += w.favorite_match;
  if (input.profile?.dietary_preferences?.length) max += w.dietary_match;
  if ((input.profile?.interests?.length ?? 0) + (input.profile?.travel_styles?.length ?? 0) > 0) max += w.feature_match;
  if (input.foodPreferences?.length && ["Restaurants", "Cafés"].includes(candidate.category)) max += w.food_match;
  if (candidate.bestVisitTime) max += w.part_of_day_fit;
  if (input.affinity && input.affinity.eventCount >= 2) max += w.learned_match;
  if (candidate.category === "Restaurants") max += 6;
  return max;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radius = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(x));
}

function toMinutes(value: string | null | undefined) {
  if (!value) return null;
  const [hours, minutes] = String(value).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function normalizedHour(hour: number) {
  const value = hour % 24;
  return value < 0 ? value + 24 : value;
}

function matchesHours(hours: PlannerDayHours, hour: number) {
  if (hours.isClosed) return false;
  if (hours.is24h) return true;
  const currentMin = normalizedHour(hour) * 60;
  const open = Math.max(0, hours.openMin);
  const close = Math.max(0, hours.closeMin);
  if (open === close) return true;
  if (close < open) return currentMin >= open || currentMin < close;
  return currentMin >= open && currentMin < close;
}

function isOpenAt(candidate: PlannerCandidate, hour: number, dayOfWeek: number) {
  const dayHours = candidate.hoursByDay?.[dayOfWeek];
  if (dayHours) return matchesHours(dayHours, hour);

  const [opening, closing] = candidate.bestHours;
  if (opening === closing) return true;
  const current = normalizedHour(hour);
  if (closing >= 24) return current >= opening || current < closing - 24;
  if (closing < opening) return current >= opening || current < closing;
  return current >= opening && current < closing;
}

function travelMinutes(distanceKm: number | undefined, mode: PlannerInput["travelMode"] = "car") {
  if (distanceKm === undefined) return 0;
  // Offline estimate. Road distance ~ 1.3x straight line. Not live traffic data.
  const s = TRAVEL_SPEED[mode ?? "car"];
  const minutes = ((distanceKm * 1.3) / s.kmh) * 60 + s.overhead;
  return Math.min(75, Math.max(5, Math.round(minutes)));
}

/** v3: minutes until the place closes from a given hour. Infinity when 24h/unknown. */
function minutesUntilClose(candidate: PlannerCandidate, hour: number, dayOfWeek: number) {
  const h = candidate.hoursByDay?.[dayOfWeek];
  const now = normalizedHour(hour) * 60;
  let closeMin: number;
  if (h) {
    if (h.is24h || h.openMin === h.closeMin) return Number.POSITIVE_INFINITY;
    closeMin = h.closeMin;
  } else {
    const [o, c] = candidate.bestHours;
    if (o === c) return Number.POSITIVE_INFINITY;
    closeMin = (c % 24) * 60;
  }
  let diff = closeMin - now;
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

/** v3: learned affinity score in -1..1 for a candidate. */
function learnedScore(candidate: PlannerCandidate, a?: LearnedAffinity | null) {
  if (!a || a.eventCount < 2) return 0;
  const place = a.places[candidate.id] ?? (candidate.merchantId ? a.places[candidate.merchantId] : 0) ?? 0;
  const cat = a.categories[candidate.category] ?? 0;
  const tags = (candidate.tags ?? []).map((t) => a.tags[normalize(t)] ?? 0);
  const tag = tags.length ? tags.reduce((x, y) => x + y, 0) / tags.length : 0;
  // Confidence grows with the number of signals, capped at 1.
  const confidence = Math.min(1, a.eventCount / 15);
  return Math.max(-1, Math.min(1, (place * 0.5 + cat * 0.3 + tag * 0.2) * confidence));
}

function scoreBreakdown(
  candidate: PlannerCandidate,
  input: PlannerInput,
  previous?: PlannerCandidate,
  ctx?: { hour?: number; dayOfWeek?: number },
): ScoreBreakdown {
  const moods = activeMoods(input);
  const moodTokens = moods.flatMap((m) => MOOD_ALIASES[m]).map(normalize);
  const moodCategories = moods.flatMap((m) => MOOD_CATEGORIES[m]);
  const companions = COMPANION_ALIASES[input.companion];
  const text = [candidate.name, candidate.description, candidate.category, candidate.area, ...(candidate.tags ?? [])]
    .map(normalize)
    .join(" ");
  const reasons: string[] = [];
  let score = 0;

  const moodHit = moods.find(
    (m) =>
      candidate.mood.some((v) => MOOD_ALIASES[m].map(normalize).includes(normalize(v))) ||
      MOOD_ALIASES[m].map(normalize).some((t) => text.includes(t)),
  );
  if (moodHit || moodTokens.some((t) => text.includes(t))) {
    score += PLANNER_WEIGHTS.mood_match;
    reasons.push(`Matches your ${(moodHit ?? input.mood).toLowerCase()} mood`);
  }

  if (input.interests.includes(candidate.category)) {
    score += PLANNER_WEIGHTS.interest_match;
    reasons.push(`You picked ${candidate.category}`);
  } else if (moodCategories.includes(candidate.category)) score += PLANNER_WEIGHTS.interest_match * 0.6;

  if (candidate.with.some((v) => companions.includes(v))) {
    score += PLANNER_WEIGHTS.companion_match;
    reasons.push(`Great for ${input.companion === "Solo" ? "solo visits" : input.companion.toLowerCase()}`);
  }

  const priceCap = BUDGET_LIMITS[input.budget];
  if (candidate.priceUSD <= priceCap) {
    score += PLANNER_WEIGHTS.budget_fit;
    if (input.budget === "Balanced" && candidate.priceUSD > 15 && candidate.priceUSD < 50) score += 5;
    if (candidate.priceUSD === 0) reasons.push("Free entry");
    else reasons.push(`Fits your ${input.budget.toLowerCase()} budget (~$${candidate.priceUSD})`);
  }

  if (candidate.avgRating != null) {
    score += (Math.max(0, Math.min(5, candidate.avgRating)) / 5) * PLANNER_WEIGHTS.rating_bonus;
    if (candidate.avgRating >= 4.3) reasons.push(`Highly rated (${candidate.avgRating.toFixed(1)}★)`);
  }

  if (input.profile?.favorites?.some((id) => id === candidate.id || id === candidate.merchantId)) {
    score += PLANNER_WEIGHTS.favorite_match;
    reasons.push("In your favorites");
  }

  const dietary = (input.profile?.dietary_preferences ?? []).map(normalize);
  const options = (candidate.dietaryOptions ?? []).map(normalize);
  if (dietary.length && options.length && dietary.some((p) => options.some((o) => o.includes(p) || p.includes(o)))) {
    score += PLANNER_WEIGHTS.dietary_match;
    reasons.push("Has options for your diet");
  }

  const food = (input.foodPreferences ?? []).map(normalize).filter(Boolean);
  if (food.length && ["Restaurants", "Cafés"].includes(candidate.category)) {
    const hit = food.find((f) => {
      const keys = FOOD_KEYWORDS[f] ?? [f];
      return keys.some((k) => hasPrefix(text, k) || options.some((o) => hasPrefix(o, k)));
    });
    if (hit) {
      score += PLANNER_WEIGHTS.food_match;
      reasons.push(`Serves ${hit} food`);
    }
  }

  const featureTokens = [...(input.profile?.interests ?? []), ...(input.profile?.travel_styles ?? [])]
    .map(normalize)
    .filter(Boolean);
  const feat = featureTokens.find((t) => text.includes(t));
  if (feat) {
    score += PLANNER_WEIGHTS.feature_match;
    reasons.push(`Matches your interest in ${feat}`);
  }

  for (const a of input.avoid ?? []) {
    const tokens = AVOID_TOKENS[a] ?? [normalize(a)];
    if (tokens.some((t) => hasWord(text, t))) score -= PLANNER_WEIGHTS.avoid_penalty;
  }

  if (candidate.isSponsored) score += PLANNER_WEIGHTS.sponsored_bonus;

  if (previous) {
    const km = haversineKm(previous, candidate);
    score += Math.max(-15, PLANNER_WEIGHTS.distance_efficiency - km * 2);
    if (km < 2) reasons.push(`Only ${travelMinutes(km, input.travelMode)} min from your previous stop`);
  } else if (input.startPoint) {
    const km = haversineKm(input.startPoint, candidate);
    score += Math.max(-10, PLANNER_WEIGHTS.distance_efficiency * 0.5 - km);
    if (km < 3) reasons.push("Close to your starting point");
  }

  if (candidate.bestVisitTime && text.includes(normalize(candidate.bestVisitTime))) score += PLANNER_WEIGHTS.time_fit * 0.5;

  // v3: time-of-day fit (merchant's "best visit time" vs the slot hour)
  if (ctx?.hour != null && candidate.bestVisitTime) {
    const pod = partOfDay(ctx.hour);
    if (normalize(candidate.bestVisitTime).includes(pod)) {
      score += PLANNER_WEIGHTS.part_of_day_fit;
      reasons.push(`Best visited in the ${pod}`);
    }
  }

  // v3: meals at meal time
  if (ctx?.hour != null && candidate.category === "Restaurants") {
    if (isMealTime(ctx.hour)) score += 6;
    else score -= 8;
  }

  // v3: penalise places that close before the visit ends
  if (ctx?.hour != null) {
    const left = minutesUntilClose(candidate, ctx.hour, ctx.dayOfWeek ?? new Date().getDay());
    if (left < candidate.durationMin) score -= PLANNER_WEIGHTS.closing_soon_penalty;
  }

  // v3: learned taste
  const learned = learnedScore(candidate, input.affinity);
  if (learned !== 0) {
    score += learned * PLANNER_WEIGHTS.learned_match;
    if (learned > 0.25) reasons.push("Similar to places you saved");
  }

  return {
    total: score,
    matchPercent: Math.max(10, Math.min(99, Math.round((score / reachableMax(input, candidate)) * 100))),
    reasons,
  };
}

function scoreCandidate(candidate: PlannerCandidate, input: PlannerInput, previous?: PlannerCandidate) {
  return scoreBreakdown(candidate, input, previous).total;
}

function hardFilter(
  candidate: PlannerCandidate,
  input: PlannerInput,
  hour: number,
  dayOfWeek: number,
  spent: number,
) {
  if (candidate.approved === false) return false;
  if (input.excludeIds?.includes(candidate.id)) return false;
  // v3: must stay open for at least 30 min of the visit
  if (minutesUntilClose(candidate, hour, dayOfWeek) < Math.min(30, candidate.durationMin)) return false;
  if (!isOpenAt(candidate, hour, dayOfWeek)) return false;
  if (input.indoorPreference === "indoor" && candidate.indoor === false) return false;
  if (input.indoorPreference === "outdoor" && candidate.indoor === true) return false;
  if (input.mobility === "easy" && candidate.accessibility === "active") return false;
  if (input.avoid?.includes("stairs") && candidate.accessibility === "active") return false;
  if (input.avoid?.includes("loud") && candidate.category === "Nightlife" && input.mustInclude !== "Nightlife")
    return false;

  const dailyBudget = BUDGET_LIMITS[input.budget];
  if (Number.isFinite(dailyBudget) && spent + candidate.priceUSD > dailyBudget && spent > 0)
    return false;
  return true;
}

function templateFor(input: PlannerInput) {
  const base = baseTemplate(input);
  let slots = base;
  if (input.pace === "slow" && base.length > 1) slots = base.slice(0, base.length - 1);
  if (input.pace === "fast" && input.durationHours >= 4) slots = [...base, "activity"];
  if (input.mustInclude && !slots.includes(`must:${input.mustInclude}`)) slots = [`must:${input.mustInclude}`, ...slots.slice(1)];
  return slots;
}

function baseTemplate(input: PlannerInput) {
  if (input.durationHours <= 2) return ["activity"];
  if (input.durationHours <= 4) return ["activity", "food"];
  if (input.durationHours <= 6) return ["activity", "food", "cafe"];
  return ["activity", "food", "cafe", "activity", "food"];
}

function slotCategory(slot: string, input: PlannerInput): Category[] {
  if (slot.startsWith("must:")) return [slot.slice(5) as Category];
  if (slot === "food") return ["Restaurants"];
  if (slot === "cafe") return ["Cafés"];
  // Extra moods widen the activity pool; scoring still ranks the main mood first.
  return Array.from(new Set(activeMoods(input).flatMap((m) => MOOD_CATEGORIES[m])));
}

/** Professional, dependency-free planning engine with hard filters, weighted scoring, diversity, and controlled randomness. */
export function generateInternalPlan(
  candidates: PlannerCandidate[],
  input: PlannerInput,
): GeneratedPlan {
  const warnings: string[] = [];
  const slots = templateFor(input);
  const chosen: PlanStop[] = [];
  const dayOfWeek = input.dayOfWeek ?? new Date().getDay();
  let currentHour = input.startHour;
  let spent = 0;
  let previous: PlannerCandidate | undefined;

  // If nothing is open yet for a slot (e.g. restaurants opening at noon), wait up to 2h before giving that slot up.
  const MAX_WAIT_HOURS = 2;
  let waited = 0;
  let slotIndex = 0;

  while (slotIndex < slots.length) {
    const slot = slots[slotIndex];
    if (currentHour >= input.startHour + input.durationHours) break;

    const pool = candidates
      .filter((candidate) => !chosen.some((stop) => stop.location.id === candidate.id))
      .filter((candidate) => slotCategory(slot, input).includes(candidate.category))
      .filter((candidate) => hardFilter(candidate, input, currentHour, dayOfWeek, spent))
      .map((candidate) => {
        const distance = previous
          ? haversineKm(previous, candidate)
          : input.startPoint
            ? haversineKm(input.startPoint, candidate)
            : undefined;
        const breakdown = scoreBreakdown(candidate, input, previous, { hour: currentHour, dayOfWeek });
        const tooFarToWalk =
          !!previous &&
          input.travelMode === "walking" &&
          distance !== undefined &&
          distance > TRAVEL_SPEED.walking.maxKm;
        return { candidate, score: breakdown.total, breakdown, distance, tooFarToWalk };
      })
      .sort((a, b) => b.score - a.score);

    // v3: walking plans only use places within walking range, unless nothing else fits this slot.
    const walkable = pool.filter((item) => !item.tooFarToWalk);
    const usablePool = walkable.length > 0 ? walkable : pool;

    // Diversity is preferred, but never allowed to create a false empty state when the catalogue is small.
    const diversePool = previous
      ? usablePool.filter((item) => item.candidate.category !== previous?.category)
      : usablePool;
    const eligiblePool = diversePool.length > 0 ? diversePool : usablePool;
    const topCandidates = eligiblePool.slice(0, 3);
    const selected =
      topCandidates.length > 0
        ? topCandidates[Math.floor(Math.random() * topCandidates.length)]
        : undefined;

    if (!selected) {
      if (waited < MAX_WAIT_HOURS && currentHour + 0.5 < input.startHour + input.durationHours) {
        currentHour += 0.5;
        waited += 0.5;
        continue;
      }
      warnings.push(`We could not find a suitable ${slot.replace("must:", "")} stop for this time.`);
      waited = 0;
      slotIndex += 1;
      continue;
    }

    const next = selected.candidate;
    const paceFactor = input.pace === "slow" ? 1.3 : input.pace === "fast" ? 0.8 : 1;
    const durationHours = Math.max(0.5, (next.durationMin / 60) * paceFactor);
    const endHour = Math.min(input.startHour + input.durationHours, currentHour + durationHours);
    const distance = selected.distance;
    const transferMinutes = travelMinutes(previous ? distance : undefined, input.travelMode);

    chosen.push({
      location: next,
      startHour: currentHour,
      endHour,
      reason: `${next.name} fits your ${activeMoods(input)
        .map((m) => m.toLowerCase())
        .join(" & ")} mood and ${input.companion.toLowerCase()} outing. The route keeps the next move practical and the experience varied.`,
      matchPercent: selected.breakdown.matchPercent,
      reasons: selected.breakdown.reasons,
      estimatedCostUSD: next.priceUSD,
      distanceKmFromPrevious: previous ? distance : undefined,
      travelMinutesFromPrevious: previous ? transferMinutes : undefined,
    });

    spent += next.priceUSD;
    currentHour = endHour + transferMinutes / 60;
    previous = next;
    waited = 0;
    slotIndex += 1;
  }

  const travelTotal = chosen.reduce((m, st) => m + (st.travelMinutesFromPrevious ?? 0), 0);
  if (
    input.travelMode === "walking" &&
    chosen.some((st) => (st.distanceKmFromPrevious ?? 0) > TRAVEL_SPEED.walking.maxKm)
  )
    warnings.push("Some stops are far apart for walking. Choose car or taxi for a smoother day.");
  if (travelTotal > input.durationHours * 60 * 0.3)
    warnings.push(`About ${travelTotal} min of this plan is travel. Choose a closer start point or "car" to see more.`);
  if (!chosen.length)
    warnings.push("Try a broader budget, a different mood, or a longer day to see more options.");
  if (chosen.length < slots.length && chosen.length > 0)
    warnings.push(
      "This plan uses the strongest verified matches available for your selected time and preferences.",
    );

  const moodLabel = activeMoods(input)
    .map((m) => m.toLowerCase())
    .join(" & ");
  const title =
    input.mood === "Cultural" && !input.extraMoods?.length
      ? "A day through Erbil's story"
      : `Your ${moodLabel} Erbil day`;
  const summary = `${chosen.length} stops matched for ${input.companion.toLowerCase()} · ${input.durationHours} hours · ${input.budget} budget.`;
  const alternatives = candidates
    .filter((candidate) => !chosen.some((stop) => stop.location.id === candidate.id))
    .filter((candidate) => hardFilter(candidate, input, input.startHour, dayOfWeek, 0))
    .sort((a, b) => scoreCandidate(b, input) - scoreCandidate(a, input))
    .slice(0, 6);

  return {
    title,
    summary,
    totalHours: Math.max(
      0,
      chosen.length ? chosen[chosen.length - 1].endHour - input.startHour : 0,
    ),
    estimatedCostUSD: spent,
    stops: chosen,
    alternatives,
    warnings,
  };
}

export function locationToPlannerCandidate(location: Location): PlannerCandidate {
  return {
    ...location,
    approved: true,
    accessibility: location.durationMin <= 90 ? "easy" : "moderate",
    indoor: ["Cafés", "Restaurants", "Shopping", "Art & Culture"].includes(location.category),
  };
}

/**
 * v3: replace one stop with the next-best option for the same time slot,
 * keeping the rest of the plan unchanged. Rejected ids are never re-offered.
 */
export function swapStop(
  plan: GeneratedPlan,
  index: number,
  candidates: PlannerCandidate[],
  input: PlannerInput,
): GeneratedPlan {
  const stop = plan.stops[index];
  if (!stop) return plan;
  const dayOfWeek = input.dayOfWeek ?? new Date().getDay();
  const previous = index > 0 ? plan.stops[index - 1].location : undefined;
  const next = plan.stops[index + 1];
  const used = new Set(plan.stops.map((s) => s.location.id));
  const excluded = new Set([...(input.excludeIds ?? []), stop.location.id]);
  const spentOthers = plan.estimatedCostUSD - stop.estimatedCostUSD;

  // Food and cafe stops are swapped for the same category; activity stops for any activity category.
  const sameKind = (c: PlannerCandidate) => {
    const cat = stop.location.category;
    if (cat === "Restaurants" || cat === "Cafés") return c.category === cat;
    return c.category === cat || slotCategory("activity", input).includes(c.category);
  };

  const best = candidates
    .filter((c) => !used.has(c.id) && !excluded.has(c.id))
    .filter(sameKind)
    .filter((c) => hardFilter(c, { ...input, excludeIds: [...excluded] }, stop.startHour, dayOfWeek, spentOthers))
    .map((c) => ({ c, b: scoreBreakdown(c, input, previous, { hour: stop.startHour, dayOfWeek }) }))
    .sort((a, b) => b.b.total - a.b.total)[0];

  if (!best) {
    const msg = "No other option fits this time slot.";
    return { ...plan, warnings: plan.warnings.includes(msg) ? plan.warnings : [...plan.warnings, msg] };
  }

  const distance = previous ? haversineKm(previous, best.c) : undefined;
  const newStop: PlanStop = {
    ...stop,
    location: best.c,
    reason: `${best.c.name} fits your ${activeMoods(input)
      .map((m) => m.toLowerCase())
      .join(" & ")} mood and ${input.companion.toLowerCase()} outing. The route keeps the next move practical and the experience varied.`,
    matchPercent: best.b.matchPercent,
    reasons: best.b.reasons,
    estimatedCostUSD: best.c.priceUSD,
    distanceKmFromPrevious: distance,
    travelMinutesFromPrevious: previous ? travelMinutes(distance, input.travelMode) : undefined,
  };

  // The stop after the swapped one now starts from a different place: refresh its distance / travel time labels.
  const stops = plan.stops.map((s, i) => {
    if (i === index) return newStop;
    if (i === index + 1 && next) {
      const d = haversineKm(best.c, next.location);
      return { ...s, distanceKmFromPrevious: d, travelMinutesFromPrevious: travelMinutes(d, input.travelMode) };
    }
    return s;
  });
  return { ...plan, stops, estimatedCostUSD: spentOthers + best.c.priceUSD };
}

export { haversineKm, scoreBreakdown, travelMinutes, partOfDay };
