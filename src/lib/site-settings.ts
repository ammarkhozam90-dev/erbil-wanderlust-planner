import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  brand: {
    contact_email: string;
    partner_email: string;
    instagram: string;
    facebook: string;
    whatsapp: string;
  };
  homepage: {
    show_journeys: boolean;
    show_featured: boolean;
    show_signature: boolean;
    show_categories: boolean;
    featured_count: number;
  };
  planner: {
    enabled: boolean;
    max_stops: number; // 0 = automatic (decided by the day length)
    variety: 1 | 2 | 3; // 1 = always the best match, 3 = pick randomly among the top 3
  };
  announcement: {
    enabled: boolean;
    text: string;
    link_label: string;
    link_url: string;
    tone: "info" | "promo" | "warning";
  };
  maintenance: { enabled: boolean; message: string };
  merchants: { registrations_open: boolean; closed_message: string };
  seo: { title: string; description: string; og_image: string };
}

// Defaults reproduce EXACTLY how the site behaves today, so an empty table changes nothing.
export const DEFAULT_SETTINGS: SiteSettings = {
  brand: {
    contact_email: "hello@erbilgo.app",
    partner_email: "partners@erbilgo.app",
    instagram: "https://instagram.com/erbilgo",
    facebook: "",
    whatsapp: "",
  },
  homepage: {
    show_journeys: true,
    show_featured: true,
    show_signature: true,
    show_categories: true,
    featured_count: 6,
  },
  planner: { enabled: true, max_stops: 0, variety: 3 },
  announcement: { enabled: false, text: "", link_label: "", link_url: "", tone: "info" },
  maintenance: {
    enabled: false,
    message: "ErbilGo is getting a quick upgrade. We'll be back very soon.",
  },
  merchants: {
    registrations_open: true,
    closed_message: "New business registrations are paused for now. Please check back soon.",
  },
  seo: { title: "", description: "", og_image: "" },
};

export const SETTINGS_KEY = "site_settings";

export function mergeSettings(raw: unknown): SiteSettings {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const out: any = {};
  for (const group of Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]) {
    out[group] = { ...DEFAULT_SETTINGS[group], ...(src[group] ?? {}) };
  }
  return out as SiteSettings;
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await supabase
      .from("app_settings" as any)
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    if (error) return DEFAULT_SETTINGS;
    return mergeSettings((data as any)?.value);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSiteSettings() {
  const q = useQuery({
    queryKey: ["site-settings"],
    queryFn: fetchSiteSettings,
    staleTime: 60_000,
    placeholderData: DEFAULT_SETTINGS,
  });
  return { settings: q.data ?? DEFAULT_SETTINGS, loaded: !q.isPlaceholderData };
}
