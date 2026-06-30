import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Merchant, MerchantHour } from "@/integrations/supabase/types-local";
import type { CategoryDef } from "./categories";

export const PAGE_SIZE = 24;

export type SortKey = "recommended" | "popular" | "newest" | "alpha";

export interface CategoryFilters {
  q: string;
  tags: string[];
  price: string[]; // "$" | "$$" | "$$$" | "$$$$"
  openNow: boolean;
  sort: SortKey;
  page: number;
}

export type BusinessListItem = Merchant & { merchant_hours: MerchantHour[] };

export interface BusinessListResult {
  items: BusinessListItem[];
  total: number;
  hasMore: boolean;
}

async function fetchCategoryBusinesses(
  category: CategoryDef,
  filters: CategoryFilters,
): Promise<BusinessListResult> {
  const from = 0;
  const to = (filters.page + 1) * PAGE_SIZE - 1;

  let q = supabase
    .from("merchants")
    .select("*, merchant_hours(*)", { count: "exact" })
    .eq("status", "approved")
    .range(from, to);

  if (category.enum) q = q.eq("category", category.enum);
  if (category.moodAny?.length) q = q.overlaps("mood_tags", category.moodAny);

  if (filters.q.trim()) {
    // ILIKE on name + description
    const safe = filters.q.trim().replace(/[%,]/g, " ");
    q = q.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  if (filters.tags.length) q = q.overlaps("features", filters.tags);
  if (filters.price.length) q = q.in("price_level", filters.price);

  switch (filters.sort) {
    case "newest":
      q = q.order("created_at", { ascending: false });
      break;
    case "alpha":
      q = q.order("name", { ascending: true });
      break;
    case "popular":
    case "recommended":
    default:
      // Until rating/popularity exists, fall back to most-recently approved.
      q = q.order("reviewed_at", { ascending: false, nullsFirst: false });
      break;
  }

  const { data, error, count } = await q;
  if (error) throw error;

  const items = (data ?? []) as unknown as BusinessListItem[];
  const total = count ?? items.length;
  return { items, total, hasMore: items.length < total };
}

export function categoryBusinessesQuery(category: CategoryDef, filters: CategoryFilters) {
  return queryOptions({
    queryKey: [
      "category-businesses",
      category.slug,
      filters.q,
      filters.tags.slice().sort().join(","),
      filters.price.slice().sort().join(","),
      filters.openNow,
      filters.sort,
      filters.page,
    ],
    queryFn: () => fetchCategoryBusinesses(category, filters),
    staleTime: 30_000,
  });
}
