import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LOCATIONS, type Location } from "@/data/locations";

export type Mood = "Relaxed" | "Adventurous" | "Romantic" | "Family" | "Productive";
export type Companion = "Solo" | "Couple" | "Family" | "Friends";
export type Budget = "$" | "$$" | "$$$";
export type Duration = "Half" | "Full" | "Evening";
export type Currency = "USD" | "IQD";
export type TravelStyle = "Foodie" | "Remote Work Focus" | "Family Friendly" | "Nightlife" | "Cultural/Historical";

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  preferredLang: "English" | "Arabic" | "Kurdish";
  travelStyles: TravelStyle[];
  createdAt: string;
  itinerariesGenerated: number;
}

interface PlanItem extends Location {
  startTime: string;
}

interface State {
  mood: Mood;
  companion: Companion;
  budget: Budget;
  duration: Duration;
  currency: Currency;
  exchangeRate: number;
  plan: PlanItem[];
  isAdmin: boolean;
  isAuthed: boolean;
  user: UserProfile;
  favorites: string[];
  setFilter: <K extends keyof Pick<State, "mood" | "companion" | "budget" | "duration" | "currency">>(k: K, v: State[K]) => void;
  setExchangeRate: (r: number) => void;
  setAdmin: (v: boolean) => void;
  login: (name?: string) => void;
  logout: () => void;
  updateUser: (patch: Partial<UserProfile>) => void;
  toggleFavorite: (id: string) => void;
  generatePlan: () => void;
  surpriseMe: () => void;
  clearPlan: () => void;
}

function buildItinerary(filtered: Location[], duration: Duration): PlanItem[] {
  const targetCount = duration === "Half" ? 4 : duration === "Full" ? 6 : 3;
  if (filtered.length === 0) return [];
  // Greedy nearest-neighbor by geographic proximity
  const start = filtered[Math.floor(Math.random() * filtered.length)];
  const route: Location[] = [start];
  const pool = filtered.filter(l => l.id !== start.id);
  while (route.length < targetCount && pool.length) {
    const last = route[route.length - 1];
    pool.sort((a, b) => {
      const da = (a.lat - last.lat) ** 2 + (a.lng - last.lng) ** 2;
      const db = (b.lat - last.lat) ** 2 + (b.lng - last.lng) ** 2;
      return da - db;
    });
    route.push(pool.shift()!);
  }
  let hour = duration === "Evening" ? 18 : 9;
  let min = 0;
  return route.map((loc) => {
    const t = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    min += loc.durationMin + 30;
    hour += Math.floor(min / 60);
    min = min % 60;
    return { ...loc, startTime: t };
  });
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      mood: "Relaxed",
      companion: "Solo",
      budget: "$$",
      duration: "Full",
      currency: "USD",
      exchangeRate: 1500,
      plan: [],
      isAdmin: false,
      isAuthed: false,
      user: {
        name: "Ammar Hassan",
        email: "ammar@erbilgo.app",
        phone: "+964 750 000 0000",
        avatar: undefined,
        preferredLang: "English",
        travelStyles: ["Foodie", "Cultural/Historical"],
        createdAt: new Date().toISOString(),
        itinerariesGenerated: 0,
      },
      favorites: [],
      setFilter: (k, v) => set({ [k]: v } as any),
      setExchangeRate: (r) => set({ exchangeRate: r }),
      setAdmin: (v) => set({ isAdmin: v }),
      login: (name) =>
        set((s) => ({ isAuthed: true, user: { ...s.user, ...(name ? { name } : {}) } })),
      logout: () => set({ isAuthed: false }),
      updateUser: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((x) => x !== id)
            : [...s.favorites, id],
        })),
      generatePlan: () => {
        const { mood, companion, budget, duration } = get();
        const maxPrice = budget === "$" ? 15 : budget === "$$" ? 35 : 100;
        const filtered = LOCATIONS.filter(
          (l) =>
            (l.mood.includes(mood) || mood === "Relaxed") &&
            l.with.includes(companion) &&
            l.priceUSD <= maxPrice,
        );
        const plan = buildItinerary(filtered, duration);
        set((s) => ({ plan, user: { ...s.user, itinerariesGenerated: s.user.itinerariesGenerated + (plan.length ? 1 : 0) } }));
      },
      surpriseMe: () => {
        const { duration } = get();
        const shuffled = [...LOCATIONS].sort(() => Math.random() - 0.5).slice(0, 12);
        const plan = buildItinerary(shuffled, duration);
        set((s) => ({ plan, user: { ...s.user, itinerariesGenerated: s.user.itinerariesGenerated + (plan.length ? 1 : 0) } }));
      },
      clearPlan: () => set({ plan: [] }),
    }),
    { name: "erbilgo-store" },
  ),
);

export function formatPrice(usd: number, currency: Currency, rate: number): string {
  if (usd === 0) return "Free";
  if (currency === "USD") return `$${usd}`;
  const iqd = Math.round(usd * rate);
  return `${iqd.toLocaleString()} IQD`;
}
