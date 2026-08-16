// Single source of truth for traveler-preference vocabulary. Kept in sync
// with the merchant side (src/routes/merchant/_authenticated/ai-planning.tsx
// MOODS/SUITS and features.tsx dietary options) so a traveler's preference
// matches business tags exactly, and reused by the onboarding wizard so
// there's only one place to update these lists.

export const STYLES = [
  "Adventure", "Nature", "History & Culture", "Luxury", "Family", "Photography",
  "Relaxing", "Nightlife", "Food", "Budget", "Social", "Cozy",
  "Remote Work Focus", "Solo Explorer",
] as const;

export const INTERESTS = [
  "Food & Cafes", "Historical Sites", "Museums", "Nature", "Shopping",
  "Nightlife", "Family Activities", "Arts & Culture", "Photography",
  "Sports", "Remote Work Friendly Places",
  "Coffee & Tea Culture", "Live Music & Events", "Hiking", "Spa & Wellness",
] as const;

export const DIETARY = ["Halal", "Vegetarian", "Vegan", "Pescatarian", "Gluten-free", "Dairy-free", "No restrictions"] as const;

export const COMPANIONS = ["Solo", "Couple", "Family", "Friends", "Business Travelers"] as const;

export const MOBILITY = ["High", "Moderate", "Low / Accessibility"] as const;

export const BUDGET = ["Budget", "Mid-range", "Premium", "Luxury"] as const;

export const PACE = ["Early Bird", "Flexible", "Night Owl"] as const;

export const SPEED = ["Fast Explorer", "Relaxed Explorer"] as const;

export const ENV = ["Indoor", "Outdoor", "Mixed"] as const;
