import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import heroImg from "@/assets/hero-citadel.jpg";
import toursImg from "@/assets/tours-cover.jpg";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ControlBar } from "@/components/ControlBar";
import { PlannedDay } from "@/components/PlannedDay";
import { CATEGORIES, LOCATIONS } from "@/data/locations";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Shuffle, MapPin, Sun, Clock, Map as MapIcon, ChevronRight, Star, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
    color: "from-amber-900/90",
  },
  {
    id: "nature",
    title: "Kings & Nature Path",
    story: "Escape the city to majestic mountains and fresh waterfalls.",
    duration: "8-10 Hours",
    stops: 4,
    image: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80&w=800",
    color: "from-emerald-900/90",
  },
  {
    id: "vibrant",
    title: "Vibrant Erbil",
    story: "Discover the modern, luxury side where tradition meets modernity.",
    duration: "5-7 Hours",
    stops: 4,
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&q=80&w=800",
    color: "from-blue-900/90",
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
    <div className="min-h-screen bg-background text-foreground selection:bg-gold selection:text-background">
      <Header />
      
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8">
        <div className="space-y-16 lg:space-y-24">
          
          {/* HERO SECTION - LUXURY REDESIGN */}
          <section className="group relative overflow-hidden rounded-[2.5rem] shadow-luxury">
            <img
              src={heroImg}
              alt="Erbil Citadel at sunset"
              className="aspect-[600/500] w-full object-cover object-center transition-transform duration-[3s] group-hover:scale-105 md:aspect-[1920/750]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Floating Status Badge */}
            <div className="absolute right-6 top-6 z-10 flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-5 py-2.5 text-white backdrop-blur-2xl sm:right-10 sm:top-10">
               <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest sm:text-sm">
                 <MapPin className="h-4 w-4 text-gold" /> Erbil
               </div>
               <div className="h-4 w-px bg-white/20" />
               <div className="flex items-center gap-2 text-xs font-bold sm:text-sm">
                 <Sun className="h-4 w-4 text-yellow-400" />
                 {weather.data ? `${Math.round(weather.data.temperature)}°C` : "…"}
               </div>
            </div>

            <div className={`absolute inset-0 flex flex-col justify-center gap-6 p-8 lg:p-20 ${alignClass}`}>
              <div className="max-w-3xl animate-in fade-in slide-in-from-left-8 duration-1000">
                <p className="mb-2 font-display text-sm font-bold uppercase tracking-[0.5em] text-gold">{renderRuns(layout.eyebrow.runs)}</p>
                <h1 className="font-display text-4xl leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
                  {renderRuns(layout.headline.runs)}
                </h1>
                <div className="mt-6 max-w-xl text-lg opacity-90">
                  {renderRuns(layout.subheadline.runs)}
                </div>
                
                <div className={`mt-10 flex flex-wrap gap-5 ${justifyClass}`}>
                  {layout.buttons.map((b: any, i: number) => (
                    <button
                      key={i}
                      onClick={i === 0 ? generatePlan : surpriseMe}
                      className={cn(
                        "group/btn flex items-center gap-3 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95",
                        BTN_PAD[b.size ?? "md"],
                        b.style === "primary"
                          ? "bg-gold text-background shadow-glow hover:shadow-luxury"
                          : "border border-white/20 bg-white/5 backdrop-blur-xl hover:bg-white/10 hover:border-gold/50 text-white"
                      )}
                    >
                      {b.style === "primary" ? <Sparkles className="h-5 w-5" /> : <Shuffle className="h-5 w-5" />}
                      {b.label}
                      <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover/btn:opacity-100 group-hover/btn:translate-x-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <ControlBar />

          {/* CURATED JOURNEYS - LUXURY CARDS */}
          <section className="space-y-10">
            <SectionHeader 
              title="Curated Journeys" 
              subtitle="Handpicked experiences designed by locals to tell the true story of Erbil." 
            />
            <div className="grid gap-8 md:grid-cols-3">
              {ITINERARIES.map((it) => (
                <Link 
                  key={it.id} 
                  to="/" 
                  className="group relative aspect-[4/5] overflow-hidden rounded-[2.5rem] border border-gold/10 bg-card shadow-luxury transition-all hover:-translate-y-3 block"
                >
                  <img 
                    src={it.image} 
                    alt={it.title} 
                    className="h-full w-full object-cover transition duration-1000 group-hover:scale-110" 
                  />
                  <div className={cn("absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-90 transition-opacity group-hover:opacity-100", it.color)} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  
                  <div className="absolute inset-x-0 bottom-0 p-8 space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-gold/20 text-gold border border-gold/30 backdrop-blur-md px-3 py-1 font-bold">
                        <MapIcon className="mr-1.5 h-3.5 w-3.5" /> {it.stops} Stops
                      </Badge>
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/90">
                        <Clock className="h-3.5 w-3.5 text-gold" /> {it.duration}
                      </span>
                    </div>
                    <h3 className="font-display text-3xl font-bold text-white group-hover:text-gold transition-colors duration-500">
                      {it.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-white/70 line-clamp-2 group-hover:text-white/90 transition-colors">
                      {it.story}
                    </p>
                    <div className="pt-2">
                      <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-gold group-hover:gap-4 transition-all duration-500">
                        Explore Path <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* SIGNATURE EXPERIENCES - NEW SECTION */}
          <section className="rounded-[3rem] bg-gold/5 border border-gold/10 p-8 md:p-16">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <Badge className="bg-gold text-background font-bold uppercase tracking-widest px-4 py-1.5">Signature Experience</Badge>
                <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight">The Citadel Sunset Dinner</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">Experience Erbil's heritage from a private terrace overlooking the 5,000-year-old citadel. A curated 7-course traditional Kurdish feast paired with modern luxury.</p>
                <div className="flex items-center gap-6 pt-4">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-gold">4.9</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rating</span>
                  </div>
                  <div className="h-10 w-px bg-gold/20" />
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-gold">1.2k+</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Visitors</span>
                  </div>
                </div>
                <Button className="h-14 px-8 bg-gold text-background font-bold rounded-2xl hover:bg-gold/90 transition-all group">
                  Book This Experience <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
              <div className="flex-1 relative">
                <div className="absolute -inset-4 bg-gold/10 blur-3xl rounded-full" />
                <img 
                  src="https://images.unsplash.com/photo-1590073844006-33379778ae09?auto=format&fit=crop&q=80&w=1000" 
                  alt="Luxury Dining" 
                  className="relative rounded-[2rem] shadow-luxury border border-gold/20 aspect-video object-cover"
                />
              </div>
            </div>
          </section>

          {/* EXPLORE BY INTEREST - REFINED CARDS */}
          <section className="space-y-10">
            <SectionHeader 
              title="Explore by Interest" 
              subtitle="Every traveler is unique. Find your perfect corner of Erbil." 
            />
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {CATEGORIES.map((c) => (
                <Link 
                  key={c.name} 
                  to="/category/$slug" 
                  params={{ slug: CATEGORY_SLUGS[c.name] ?? c.name.toLowerCase().replace(/\s+/g, "-") }} 
                  className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-[2rem] border border-border/40 shadow-sm transition-all hover:shadow-luxury hover:border-gold/30 block"
                >
                  <img src={coverFor(c.name)} alt={c.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <div className="mb-2 h-0.5 w-8 bg-gold transition-all duration-500 group-hover:w-16" />
                    <p className="font-display text-xl font-bold leading-tight text-white group-hover:text-gold transition-colors">{c.name}</p>
                  </div>
                </Link>
              ))}

              <Link to="/tours" className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-[2rem] border border-border/40 shadow-sm transition-all hover:shadow-luxury hover:border-gold/30 block">
                <img src={covers.data?.find((c) => c.category === "Organized Tours")?.image_url || toursImg} alt="Organized Tours" className="h-full w-full object-cover object-center transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="mb-2 h-0.5 w-8 bg-gold transition-all duration-500 group-hover:w-16" />
                  <p className="font-display text-xl font-bold leading-tight text-white group-hover:text-gold transition-colors">Organized Tours</p>
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
    <div className="flex flex-col gap-2 max-w-2xl">
      <div className="h-1 w-12 bg-gold rounded-full" />
      <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="text-lg text-muted-foreground leading-relaxed">{subtitle}</p>}
    </div>
  );
}
