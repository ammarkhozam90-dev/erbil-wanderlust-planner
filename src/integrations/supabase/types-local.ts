/**
 * Local application types for merchant/category screens.
 *
 * This file intentionally contains only the shapes consumed by the merchant
 * and discovery UI. It is not a replacement for Supabase-generated
 * `Database` types. The database client still needs to be regenerated from
 * the authoritative Supabase schema in a separate step.
 */

export type BusinessCategory =
  | "restaurant"
  | "cafe"
  | "hotel"
  | "attraction"
  | "shop"
  | "activity"
  | "other";

export type MerchantStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export type PriceLevel = "$" | "$$" | "$$$" | "$$$$";

export interface Merchant {
  id: string;
  owner_id: string | null;
  name: string;
  category: BusinessCategory | string;
  categories?: string[] | null;
  status: MerchantStatus | string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  description?: string | null;
  notes?: string | null;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cover_url?: string | null;
  logo_url?: string | null;
  price_level?: PriceLevel | string | null;
  features?: string[] | null;
  dietary_options?: string[] | null;
  mood_tags?: string[] | null;
  best_visit_time?: string[] | null;
  suitability?: string[] | null;
  transportation?: string[] | null;
  avg_duration_minutes?: number | null;
  avg_rating?: number | null;
  review_count?: number | null;
  is_sponsored?: boolean | null;
  is_suspended?: boolean | null;
  brand_group_id?: string | null;
  is_main_branch?: boolean | null;
  rejection_reason?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at?: string;
  updated_at?: string;

  /** Additional columns introduced by merchant migrations. */
  [key: string]: unknown;
}

export interface MerchantHour {
  id: string;
  merchant_id: string;
  day_of_week: number;
  is_closed: boolean;
  is_24h: boolean;
  open_time: string | null;
  close_time: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MerchantPhoto {
  id: string;
  merchant_id: string;
  url: string;
  kind?: string | null;
  caption?: string | null;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;
}
