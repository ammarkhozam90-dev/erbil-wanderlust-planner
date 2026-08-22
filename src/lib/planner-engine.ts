import type { Location, Category } from "@/data/locations";

export type PlannerCompanion = "Solo" | "Couple" | "Friends" | "Family" | "Work";
export type PlannerMood = "Relaxed" | "Cultural" | "Adventurous" | "Romantic" | "Family" | "Productive" | "Social";
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

export interface PlannerInput {
  companion: PlannerCompanion;
  mood: PlannerMood;
  budget: PlannerBudget;
  durationHours: PlannerDuration;
  startHour: number;
  interests: Category[];
  profile?: PlannerProfile | null;
  startPoint?: { lat: number; lng: number } | null;
  indoorPreference?: "any" | "indoor" | "outdoor";
  mobility?: "any" | "easy" | "active";
}

export interface PlannerCandidate extends Location {
  approved?: boolean;
  isSponsored?: boolean;
  avgRating?: number | null;
  reviewCount?: number | null;
  tags?: string[];
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

/** 
 * Professional Scoring Weights - Can be moved to a database table later 
 * to allow real-time tuning from the Admin Panel without code changes.
 */
export const PLANNER_WEIGHTS = {
  mood_match: 25,
  interest_match: 20,
  companion_match: 18,
  budget_fit: 12,
  distance_efficiency: 15,
  rating_bonus: 8,
  favorite_match: 12,
  time_fit: 10,
  sponsored_bonus: 5, // Keep it low to ensure quality first
};

const BUDGET_LIMITS: Record<PlannerBudget, number> = {
  Budget: 25,
  Balanced: 75,
  Premium: Number.POSITIVE_INFINITY,
};

const MOOD_ALIASES: Record<PlannerMood, string[]> = {
  Relaxed: ["Relaxed", "quiet", "calm", "cozy"],
  Cultural: ["Adventurous", "cultural", "history", "heritage", "museum"],
  Adventurous: ["Adventurous", "nature", "outdoor", "active"],
  Romantic: ["Romantic", "romantic", "sunset", "intimate"],
  Family: ["Family", "family", "kids", "play"],
  Productive: ["Productive", "wifi", "quiet", "work"],
  Social: ["Romantic", "social", "music", "nightlife", "friends"],
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
  return String(value ?? "").trim().toLowerCase();
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radius = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(x));
}

function isOpenAt(candidate: PlannerCandidate, hour: number) {
  const [opening, closing] = candidate.bestHours;
  if (opening === closing) return true;
  if (closing >= 24) return hour >= opening || hour < closing - 24;
  if (closing < opening) return hour >= opening || hour < closing;
  return hour >= opening && hour < closing;
}

function scoreCandidate(candidate: PlannerCandidate, input: PlannerInput, previous?: PlannerCandidate) {
  const moodTokens = MOOD_ALIASES[input.mood].map(normalize);
  const categories = MOOD_CATEGORIES[input.mood];
  const companions = COMPANION_ALIASES[input.companion];
  const text = [candidate.name, candidate.description, candidate.category, candidate.area, ...(candidate.tags ?? [])].map(normalize).join(" ");
  
  let score = 0;

  // 1. Mood Match
  if (candidate.mood.some((value) => moodTokens.includes(normalize(value)))) {
    score += PLANNER_WEIGHTS.mood_match;
  }

  // 2. Interest Match
  if (input.interests.includes(candidate.category)) {
    score += PLANNER_WEIGHTS.interest_match;
  } else if (categories.includes(candidate.category)) {
    score += PLANNER_WEIGHTS.interest_match * 0.6;
  }

  // 3. Companion Match
  if (candidate.with.some((value) => companions.includes(value))) {
    score += PLANNER_WEIGHTS.companion_match;
  }

  // 4. Budget Fit
  const priceCap = BUDGET_LIMITS[input.budget];
  if (candidate.priceUSD <= priceCap) {
    score += PLANNER_WEIGHTS.budget_fit;
    // Extra points if it's perfectly in the middle of the budget range
    if (input.budget === "Balanced" && candidate.priceUSD > 15 && candidate.priceUSD < 50) score += 5;
  }

  // 5. Rating Bonus
  if (candidate.avgRating) {
    score += (candidate.avgRating / 5) * PLANNER_WEIGHTS.rating_bonus;
  }

  // 6. Favorite Match
  if (input.profile?.favorites?.some((id) => id === candidate.id || id === candidate.merchantId)) {
    score += PLANNER_WEIGHTS.favorite_match;
  }

  // 7. Sponsored Bonus
  if (candidate.isSponsored) {
    score += PLANNER_WEIGHTS.sponsored_bonus;
  }

  // 8. Distance Efficiency
  if (previous) {
    const distance = haversineKm(previous, candidate);
    // Reward places within 5km, penalize if further
    score += Math.max(-15, PLANNER_WEIGHTS.distance_efficiency - distance * 2);
  } else if (input.startPoint) {
    const distance = haversineKm(input.startPoint, candidate);
    score += Math.max(-10, PLANNER_WEIGHTS.distance_efficiency * 0.5 - distance);
  }

  return score;
}

function hardFilter(candidate: PlannerCandidate, input: PlannerInput, hour: number) {
  if (candidate.approved === false) return false;
  if (!isOpenAt(candidate, hour)) return false;
  
  // Mandatory constraints
  if (input.indoorPreference === "indoor" && candidate.indoor === false) return false;
  if (input.indoorPreference === "outdoor" && candidate.indoor === true) return false;
  if (input.mobility === "easy" && candidate.accessibility === "active") return false;
  
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

/**
 * Professional Planning Engine with Controlled Randomness and Diversity Rules.
 */
export function generateInternalPlan(candidates: PlannerCandidate[], input: PlannerInput): GeneratedPlan {
  const warnings: string[] = [];
  const slots = templateFor(input);
  const chosen: PlanStop[] = [];
  let currentHour = input.startHour;
  let spent = 0;
  let previous: PlannerCandidate | undefined;

  for (const slot of slots) {
    const pool = candidates
      .filter((candidate) => !chosen.some((stop) => stop.location.id === candidate.id))
      .filter((candidate) => slotCategory(slot, input.mood).includes(candidate.category))
      .filter((candidate) => hardFilter(candidate, input, currentHour))
      .map((candidate) => ({ candidate, score: scoreCandidate(candidate, input, previous) }))
      .sort((a, b) => b.score - a.score);

    // Controlled Randomness: Pick from the top 3 candidates to ensure variety across users
    const topCandidates = pool.slice(0, 3);
    const next = topCandidates.length > 0 
      ? topCandidates[Math.floor(Math.random() * topCandidates.length)].candidate 
      : undefined;

    if (!next) {
      warnings.push(`We could not find a suitable ${slot} stop for this time.`);
      currentHour += 1;
      continue;
    }

    const durationHours = Math.max(0.5, next.durationMin / 60);
    const endHour = Math.min(input.startHour + input.durationHours, currentHour + durationHours);
    const distance = previous ? haversineKm(previous, next) : undefined;
    
    chosen.push({
      location: next,
      startHour: currentHour,
      endHour,
      reason: `${next.name} fits your ${input.mood.toLowerCase()} mood and ${input.companion.toLowerCase()} outing perfectly.`,
      estimatedCostUSD: next.priceUSD,
      distanceKmFromPrevious: distance
    });

    spent += next.priceUSD;
    currentHour = endHour + 0.25; // 15 min travel/buffer
    previous = next;
  }

  if (!chosen.length) warnings.push("Try a broader budget or a longer day to see more options.");

  const title = input.mood === "Cultural" ? "A day through Erbil's story" : `Your ${input.mood.toLowerCase()} Erbil day`;
  const summary = `${chosen.length} stops matched for ${input.companion.toLowerCase()} · ${input.durationHours} hours · ${input.budget} budget.`;
  
  const alternatives = candidates
    .filter((candidate) => !chosen.some((stop) => stop.location.id === candidate.id))
    .sort((a, b) => scoreCandidate(b, input) - scoreCandidate(a, input))
    .slice(0, 6);

  return { 
    title, 
    summary, 
    totalHours: Math.max(0, chosen.length ? chosen[chosen.length - 1].endHour - input.startHour : 0), 
    estimatedCostUSD: spent, 
    stops: chosen, 
    alternatives, 
    warnings 
  };
}

export function locationToPlannerCandidate(location: Location): PlannerCandidate {
  return { 
    ...location, 
    approved: true, 
    accessibility: location.durationMin <= 90 ? "easy" : "moderate", 
    indoor: ["Cafés", "Restaurants", "Shopping", "Art & Culture"].includes(location.category) 
  };
}

export { haversineKm };
