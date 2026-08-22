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

function travelMinutes(distanceKm: number | undefined) {
  if (distanceKm === undefined) return 0;
  // Conservative, offline estimate for Erbil city travel. It is not live traffic data.
  return Math.min(45, Math.max(10, Math.round(distanceKm * 6)));
}

function scoreCandidate(
  candidate: PlannerCandidate,
  input: PlannerInput,
  previous?: PlannerCandidate,
) {
  const moodTokens = MOOD_ALIASES[input.mood].map(normalize);
  const moodCategories = MOOD_CATEGORIES[input.mood];
  const companions = COMPANION_ALIASES[input.companion];
  const text = [
    candidate.name,
    candidate.description,
    candidate.category,
    candidate.area,
    ...(candidate.tags ?? []),
  ]
    .map(normalize)
    .join(" ");
  let score = 0;

  if (
    candidate.mood.some((value) => moodTokens.includes(normalize(value))) ||
    moodTokens.some((token) => text.includes(token))
  ) {
    score += PLANNER_WEIGHTS.mood_match;
  }

  if (input.interests.includes(candidate.category)) score += PLANNER_WEIGHTS.interest_match;
  else if (moodCategories.includes(candidate.category))
    score += PLANNER_WEIGHTS.interest_match * 0.6;

  if (candidate.with.some((value) => companions.includes(value)))
    score += PLANNER_WEIGHTS.companion_match;

  const priceCap = BUDGET_LIMITS[input.budget];
  if (candidate.priceUSD <= priceCap) {
    score += PLANNER_WEIGHTS.budget_fit;
    if (input.budget === "Balanced" && candidate.priceUSD > 15 && candidate.priceUSD < 50)
      score += 5;
  }

  if (candidate.avgRating !== null && candidate.avgRating !== undefined) {
    score += Math.max(0, Math.min(5, candidate.avgRating) / 5) * PLANNER_WEIGHTS.rating_bonus;
  }

  if (input.profile?.favorites?.some((id) => id === candidate.id || id === candidate.merchantId)) {
    score += PLANNER_WEIGHTS.favorite_match;
  }

  const dietary = (input.profile?.dietary_preferences ?? []).map(normalize);
  const options = (candidate.dietaryOptions ?? []).map(normalize);
  if (
    dietary.length > 0 &&
    options.length > 0 &&
    dietary.some((preference) =>
      options.some((option) => option.includes(preference) || preference.includes(option)),
    )
  ) {
    score += PLANNER_WEIGHTS.dietary_match;
  }

  const featureTokens = [
    ...(input.profile?.interests ?? []),
    ...(input.profile?.travel_styles ?? []),
  ]
    .map(normalize)
    .filter(Boolean);
  if (featureTokens.length > 0 && featureTokens.some((token) => text.includes(token))) {
    score += PLANNER_WEIGHTS.feature_match;
  }

  if (candidate.isSponsored) score += PLANNER_WEIGHTS.sponsored_bonus;

  if (previous) {
    score += Math.max(
      -15,
      PLANNER_WEIGHTS.distance_efficiency - haversineKm(previous, candidate) * 2,
    );
  } else if (input.startPoint) {
    score += Math.max(
      -10,
      PLANNER_WEIGHTS.distance_efficiency * 0.5 - haversineKm(input.startPoint, candidate),
    );
  }

  if (candidate.bestVisitTime && text.includes(normalize(candidate.bestVisitTime)))
    score += PLANNER_WEIGHTS.time_fit * 0.5;
  return score;
}

function hardFilter(
  candidate: PlannerCandidate,
  input: PlannerInput,
  hour: number,
  dayOfWeek: number,
  spent: number,
) {
  if (candidate.approved === false) return false;
  if (!isOpenAt(candidate, hour, dayOfWeek)) return false;
  if (input.indoorPreference === "indoor" && candidate.indoor === false) return false;
  if (input.indoorPreference === "outdoor" && candidate.indoor === true) return false;
  if (input.mobility === "easy" && candidate.accessibility === "active") return false;

  const dailyBudget = BUDGET_LIMITS[input.budget];
  if (Number.isFinite(dailyBudget) && spent + candidate.priceUSD > dailyBudget && spent > 0)
    return false;
  return true;
}

function templateFor(input: PlannerInput) {
  if (input.durationHours <= 2) return ["activity"];
  if (input.durationHours <= 4) return ["activity", "food"];
  if (input.durationHours <= 6) return ["activity", "food", "cafe"];
  return ["activity", "food", "cafe", "activity", "food"];
}

function slotCategory(slot: string, mood: PlannerMood): Category[] {
  if (slot === "food") return ["Restaurants"];
  if (slot === "cafe") return ["Cafés"];
  return MOOD_CATEGORIES[mood];
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

  for (const slot of slots) {
    if (currentHour >= input.startHour + input.durationHours) break;

    const pool = candidates
      .filter((candidate) => !chosen.some((stop) => stop.location.id === candidate.id))
      .filter((candidate) => slotCategory(slot, input.mood).includes(candidate.category))
      .filter((candidate) => hardFilter(candidate, input, currentHour, dayOfWeek, spent))
      .map((candidate) => {
        const distance = previous
          ? haversineKm(previous, candidate)
          : input.startPoint
            ? haversineKm(input.startPoint, candidate)
            : undefined;
        return { candidate, score: scoreCandidate(candidate, input, previous), distance };
      })
      .sort((a, b) => b.score - a.score);

    // Diversity is preferred, but never allowed to create a false empty state when the catalogue is small.
    const diversePool = previous
      ? pool.filter((item) => item.candidate.category !== previous?.category)
      : pool;
    const eligiblePool = diversePool.length > 0 ? diversePool : pool;
    const topCandidates = eligiblePool.slice(0, 3);
    const selected =
      topCandidates.length > 0
        ? topCandidates[Math.floor(Math.random() * topCandidates.length)]
        : undefined;

    if (!selected) {
      warnings.push(`We could not find a suitable ${slot} stop for this time.`);
      currentHour += 0.5;
      continue;
    }

    const next = selected.candidate;
    const durationHours = Math.max(0.5, next.durationMin / 60);
    const endHour = Math.min(input.startHour + input.durationHours, currentHour + durationHours);
    const distance = selected.distance;
    const transferMinutes = travelMinutes(previous ? distance : undefined);

    chosen.push({
      location: next,
      startHour: currentHour,
      endHour,
      reason: `${next.name} fits your ${input.mood.toLowerCase()} mood and ${input.companion.toLowerCase()} outing. The route keeps the next move practical and the experience varied.`,
      estimatedCostUSD: next.priceUSD,
      distanceKmFromPrevious: previous ? distance : undefined,
      travelMinutesFromPrevious: previous ? transferMinutes : undefined,
    });

    spent += next.priceUSD;
    currentHour = endHour + transferMinutes / 60;
    previous = next;
  }

  if (!chosen.length)
    warnings.push("Try a broader budget, a different mood, or a longer day to see more options.");
  if (chosen.length < slots.length && chosen.length > 0)
    warnings.push(
      "This plan uses the strongest verified matches available for your selected time and preferences.",
    );

  const title =
    input.mood === "Cultural"
      ? "A day through Erbil's story"
      : `Your ${input.mood.toLowerCase()} Erbil day`;
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

export { haversineKm };
