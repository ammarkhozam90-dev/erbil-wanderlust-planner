import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import heroImg from "@/assets/hero-citadel.jpg";
import toursImg from "@/assets/tours-cover.jpg";
import { Header } from "@/components/Header";
import { ControlBar } from "@/components/ControlBar";
import { PlannedDay } from "@/components/PlannedDay";
import { CATEGORIES, LOCATIONS } from "@/data/locations";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Shuffle, MapPin, Sun, Clock, Map as MapIcon, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ErbilGo — AI Day Planner for Erbil, Kurdistan" },
      { name: "description", content: "AI-powered personalized day plans for Erbil — for residents, tourists, families, couples and remote workers." },
      { property: "og:title", content: "ErbilGo — Plan your perfect day in Erbil" },
      { property: "og:description", content: "AI-driven luxury travel planner for the heart of Kurdistan." },
      { property: "og:url", content: "https://erbilgo.app/" },
    ],
    links: [{ rel: "canonical", href: "https://erbilgo.app/" }],
  }),
  component: Home,
});

function fluidSize(px: number) {
  const vw = (px / 19.2).toFixed(2);
  const min = Math.max(9, Math.round(px * 0.55));
  return `clamp(${min}px, ${vw}vw, ${px}px)`;
}

const BTN_PAD: Record<string, string> = { sm: "px-3 py-2 text-xs", md: "px-5 py-3 text-sm", lg: "px-7 py-4 text-base" };

const CATEGORY_SLUGS: Record<string, string> = {
  "Cafés": "cafes",
  "Restaurants": "restaurants",
  "Things to Do": "things-to-do",
  "Landmarks": "landmarks",
  "Parks & Nature": "parks",
  "Nightlife": "nightlife",
  "Art & Culture": "art-culture",
  "Shopping": "shopping",
};

const ITINERARIES = [
  {
    id: "history",
    title: "Erbil in 5000 Years",
    story: "A journey through time from the oldest settlement to Islamic heritage.",
    duration: "4-6 Hours",
    stops: 5,
    image: "https://images.unsplash.com/photo-1628153400283-49141042780e?auto=format&fit=crop&q=80&w=800",
    color: "from-amber-900/80",
  },
  {
    id: "nature",
    title: "Kings & Nature Path",
    story: "Escape the city to majestic mountains and fresh waterfalls.",
    duration: "8-10 Hours",
    stops: 4,
    image: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80&w=800",
    color: "from-emerald-900/80",
  },
  {
    id: "vibrant",
    title: "Vibrant Erbil",
    story: "Discover the modern, luxury side where tradition meets modernity.",
    duration: "5-7 Hours",
    stops: 4,
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&q=80&w=800",
    color: "from-blue-900/80",
  },
];

const DEFAULT_LAYOUT = {
  align: "left",
  eyebrow: { runs: [{ text: "Welcome", color: "#D4AF37", fontSize: 12 }, { text: "to", color: "#D4AF37", fontSize: 12 }, { text: "Kurdistan", color: "#D4AF37", fontSize: 12 }] },
  headline: {
    runs: [
      { text: "EXPLORE", color: "#F5F0E6", fontSize: 46, bold: true },
      { text: "ERBIL", color: "#F5F0E6", fontSize: 46, bold: true },
      { text: "FROM", color: "#D4AF37", fontSize: 46, bold: true },
      { text: "WITHIN", color: "#F5F0E6", fontSize: 46, bold: true },
    ],
  },
  subheadline: { runs: [{ text: "AI-powered personalized plans for residents, tourists, families, couples and remote workers.", color: "#E5DFD0", fontSize: 16 }] },
  buttons: [
    { label: "Generate My Plan", style: "primary", size: "md" },
    { label: "Surprise Me", style: "secondary", size: "md" },
  ],
};

function Home() {
  const { generatePlan, surpriseMe } = useStore();

  const hero = useQuery({
    queryKey: ["public-site-hero"],
    queryFn: async () => {
      const { data } = await supabase.from("site_hero").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });

  const covers = useQuery({
    queryKey: ["public-category-covers"],
    queryFn: async () => {
      const { data } = await supabase.from("category_covers").select("*");
      return data ?? [];
    },
  });

  const weather = useQuery({
    queryKey: ["erbil-weather"],
    queryFn: async () => {
      const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=36.19&longitude=44.01&current_weather=true");
      const json = await res.json();
      return json.current_weather as { temperature: number } | undefined;
    },
    staleTime: 1000 * 60 * 15,
  });

  const layout: any = hero.data?.layout || DEFAULT_LAYOUT;
  const alignClass = layout.align === "center" ? "items-center text-center" : layout.align === "right" ? "items-end text-right" : "items-start text-left";
  const justifyClass = layout.align === "center" ? "justify-center" : layout.align === "right" ? "justify-end" : "justify-start";

  function coverFor(categoryName: string) {
    const custom = covers.data?.find((c) => c.category === categoryName)?.image_url;
    return custom || LOCATIONS.find((l) => l.category === categoryName)?.image;
  }

  function renderRuns(runs: any[]) {
    return (
      <span className="inline-flex flex-wrap items-baseline">
        {runs.map((r, i) => (
          <span key={i} className="contents">
            {r.lineBreak && <span className="basis-full" />}
            <span style={{ color: r.color, fontSize: fluidSize(r.fontSize), fontWeight: r.bold ? 700 : 400, marginRight: "0.3em" }}>{r.text}</span>
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8">
        <div className="space-y-12">
          
          {/* HERO SECTION */}
          <section className="relative overflow-hidden rounded-[2rem] shadow-luxury">
            <img
              src={heroImg}
              alt="Erbil Citadel at sunset"
              className="aspect-[600/400] w-full object-cover object-center md:aspect-[1920/650]"
            />
            <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />

            <div className="absolute right-4 top-4 z-10 flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-white backdrop-blur-xl sm:right-8 sm:top-8">
               <div className="flex items-center gap-1.5 text-xs font-medium sm:text-sm">
                 <MapPin className="h-4 w-4 text-gold" /> Erbil
               </div>
               <div className="h-4 w-px bg-white/20" />
               <div className="flex items-center gap-1.5 text-xs font-medium sm:text-sm">
                 <Sun className="h-4 w-4 text-yellow-400" />
                 {weather.data ? `${Math.round(weather.data.temperature)}°C` : "…"}
               </div>
            </div>

            <div className={`absolute inset-0 flex flex-col justify-center gap-4 p-8 lg:p-16 ${alignClass}`}>
              <div className="max-w-3xl">
                <p className="mb-2 font-display text-sm font-bold uppercase tracking-[0.4em]">{renderRuns(layout.eyebrow.runs)}</p>
                <h1 className="font-display leading-[1.05] tracking-tight">{renderRuns(layout.headline.runs)}</h1>
                <div className="mt-4 max-w-xl">
                  {renderRuns(layout.subheadline.runs)}
                </div>
                <div className={`mt-8 flex flex-wrap gap-4 ${justifyClass}`}>
                  {layout.buttons.map((b: any, i: number) => (
                    <button
                      key={i}
                      onClick={i === 0 ? generatePlan : surpriseMe}
                      className={`flex items-center gap-2 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 ${BTN_PAD[b.size ?? "md"]} ${
                        b.style === "primary"
                          ? "bg-primary text-primary-foreground shadow-glow"
                          : "border border-white/20 bg-white/5 backdrop-blur-xl hover:bg-white/10 hover:border-gold/50"
                      }`}
                    >
                      {b.style === "primary" ? <Sparkles className="h-5 w-5" /> : <Shuffle className="h-5 w-5" />}
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <ControlBar />

          {/* THEMATIC ITINERARIES SECTION */}
          <section className="space-y-6">
            <SectionHeader 
              title="Curated Journeys" 
              subtitle="Handpicked experiences designed to tell a story." 
            />
            <div className="grid gap-6 md:grid-cols-3">
              {ITINERARIES.map((it) => (
                <Link 
                  key={it.id} 
                  to="/" 
                  className="group relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border/50 shadow-luxury transition-all hover:-translate-y-2 block"
                >
                  <img 
                    src={it.image} 
                    alt={it.title} 
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-110" 
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${it.color} via-transparent to-transparent opacity-80`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  
                  <div className="absolute inset-x-0 bottom-0 p-8 space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-gold text-background hover:bg-gold border-none font-bold">
                        <MapIcon className="mr-1 h-3 w-3" /> {it.stops} Stops
                      </Badge>
                      <span className="flex items-center gap-1 text-xs font-medium text-white/80">
                        <Clock className="h-3 w-3" /> {it.duration}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl font-bold text-white group-hover:text-gold transition-colors">
                      {it.title}
                    </h3>
                    <p className="text-sm text-white/70 line-clamp-2">
                      {it.story}
                    </p>
                    <div className="pt-2">
                      <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-gold group-hover:gap-2 transition-all">
                        Explore Path <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* CATEGORIES SECTION */}
          <section className="space-y-6">
            <SectionHeader 
              title="Explore by Interest" 
              subtitle="Find exactly what you're looking for in the city." 
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {CATEGORIES.map((c) => (
                <Link 
                  key={c.name} 
                  to="/category/$slug" 
                  params={{ slug: CATEGORY_SLUGS[c.name] ?? c.name.toLowerCase().replace(/\s+/g, "-") }} 
                  className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl border border-border/40 shadow-sm transition-all hover:shadow-luxury hover:border-gold/30 block"
                >
                  <img src={coverFor(c.name)} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="font-display text-lg font-bold leading-tight text-white group-hover:text-gold transition-colors">{c.name}</p>
                  </div>
                </Link>
              ))}

              <Link to="/tours" className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl border border-border/40 shadow-sm transition-all hover:shadow-luxury hover:border-gold/30 block">
                <img src={covers.data?.find((c) => c.category === "Organized Tours")?.image_url || toursImg} alt="Organized Tours" className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="font-display text-lg font-bold leading-tight text-white group-hover:text-gold transition-colors">Organized Tours</p>
                </div>
              </Link>
            </div>
          </section>

          <PlannedDay />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-display text-3xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
