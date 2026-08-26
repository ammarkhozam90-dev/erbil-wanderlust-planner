// Maps URL slugs to merchant `category` enum values + display info.
// The DB enum (see migration.sql) currently supports:
//   restaurant | cafe | hotel | attraction | shop | activity | other
// We map several human-friendly slugs to those base enum values, and use the
// `mood_tags` / `features` arrays for finer slices (parks, nightlife, art).

import type { BusinessCategory } from "@/integrations/supabase/types-local";

export interface CategoryDef {
  slug: string;
  title: string;
  description: string;
  // Base enum value to filter `category` column on. `null` means no enum filter.
  enum: BusinessCategory | null;
  // Optional mood_tags ANY-match (case-insensitive) to refine the slice.
  moodAny?: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    slug: "hotels",
    title: "Hotels",
    description: "Refined stays, boutique rooms, and trusted hotels in Erbil.",
    enum: "hotel",
  },
  {
    slug: "cafes",
    title: "Cafes",
    description: "Cozy coffee shops and specialty cafes around Erbil.",
    enum: "cafe",
  },
  {
    slug: "restaurants",
    title: "Restaurants",
    description: "Local Kurdish flavors and international cuisine.",
    enum: "restaurant",
  },
  {
    slug: "things-to-do",
    title: "Things to Do",
    description: "Activities and experiences to enjoy in Erbil.",
    enum: "activity",
  },
  {
    slug: "landmarks",
    title: "Landmarks",
    description: "Historic sites and must-see landmarks.",
    enum: "attraction",
  },
  {
    slug: "parks",
    title: "Parks & Nature",
    description: "Green spaces, gardens, and outdoor escapes.",
    enum: "attraction",
    moodAny: ["park", "nature", "outdoor", "garden"],
  },
  {
    slug: "nightlife",
    title: "Nightlife",
    description: "Bars, lounges, and late-night spots.",
    enum: null,
    moodAny: ["nightlife", "bar", "lounge", "club"],
  },
  {
    slug: "art-culture",
    title: "Art & Culture",
    description: "Museums, galleries, and cultural experiences.",
    enum: "attraction",
    moodAny: ["art", "culture", "museum", "gallery"],
  },
  {
    slug: "shopping",
    title: "Shopping",
    description: "Markets, malls, and unique boutiques.",
    enum: "shop",
  },
];

export function getCategoryBySlug(slug: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
