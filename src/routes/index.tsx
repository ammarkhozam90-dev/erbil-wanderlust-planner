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
import { Sparkles, Shuffle, MapPin, Sun } from "lucide-react";

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

const DEFAULT_LAYOUT = {
  eyebrow: {
    runs: [{ text: "Welcome to Kurdistan", color: "#D4AF37", fontSize: 12 }],
    font: "sans", x: 8, y: 24, scale: 1,
  },
  headline: {
    runs: [
      { text: "EXPLORE", color: "#F5F0E6", fontSize: 46 },
      { text: "ERBIL", color: "#F5F0E6", fontSize: 46 },
      { text: "FROM", color: "#D4AF37", fontSize: 46 },
      { text: "WITHIN", color: "#F5F0E6", fontSize: 46 },
    ],
    font: "display", x: 8, y: 34, scale: 1,
  },
  subheadline: {
    runs: [{ text: "AI-powered personalized plans for residents, tourists, families, couples and remote workers.", color: "#E5DFD0", fontSize: 16 }],
    font: "sans", x: 8, y: 58, scale: 1,
  },
  buttons: [
    { label: "Generate My Plan", x: 8, y: 68, style: "primary" },
    { label: "Surprise Me", x: 28, y: 68, style: "secondary" },
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

  const layout = hero.data?.layout || DEFAULT_LAYOUT;

  function coverFor(categoryName: string) {
    const custom = covers.data?.find((c) => c.category === categoryName)?.image_url;
    return custom || LOCATIONS.find((l) => l.category === categoryName)?.image;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8">
        <div className="space-y-8">
          
          {/* HERO SECTION */}
          <section className="relative overflow-hidden rounded-3xl shadow-luxury">
            <img
              src={heroImg}
              alt="Erbil Citadel at sunset"
              className="aspect-[600/400] w-full object-cover object-center md:aspect-[1920/575]"
            />
            <div className="absolute inset-0 bg-black/25" />

            {/* طقس وموقع */}
            <div className="absolute bottom-6 right-6 flex items-center gap-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white z-10">
               <div className="flex items-center gap-1 text-sm"><MapPin className="h-4 w-4" /> Erbil</div>
               <div className="flex items-center gap-1 text-sm"><Sun className="h-4 w-4" /> 28°C</div>
            </div>

            {/* Eyebrow — "Welcome to Kurdistan" */}
            <div
              className={`absolute font-semibold uppercase tracking-[0.3em] ${layout.eyebrow.font === "display" ? "font-display" : "font-sans"}`}
              style={{ left: `${layout.eyebrow.x}%`, top: `${layout.eyebrow.y}%` }}
            >
              {layout.eyebrow.runs.map((r: any, i: number) => (
                <span key={i} style={{ color: r.color, fontSize: `${r.fontSize * layout.eyebrow.scale}px` }}>{r.text}</span>
              ))}
            </div>

            {/* Headline */}
            <div
              className="absolute leading-[1.05]"
              style={{ left: `${layout.headline.x}%`, top: `${layout.headline.y}%`, maxWidth: "80%" }}
            >
              {layout.headline.runs.map((w: any, i: number) => (
                <span
                  key={i}
                  className={`mr-2 inline-block font-bold ${layout.headline.font === "display" ? "font-display" : "font-sans"}`}
                  style={{ color: w.color, fontSize: `${w.fontSize * layout.headline.scale}px` }}
                >
                  {w.text}
                </span>
              ))}
            </div>

            {/* Subheadline */}
            <div
              className={`absolute ${layout.subheadline.font === "display" ? "font-display" : "font-sans"}`}
              style={{ left: `${layout.subheadline.x}%`, top: `${layout.subheadline.y}%`, maxWidth: "42%" }}
            >
              {layout.subheadline.runs.map((r: any, i: number) => (
                <span key={i} style={{ color: r.color, fontSize: `${r.fontSize * layout.subheadline.scale}px` }}>{r.text}</span>
              ))}
            </div>

            {/* Buttons */}
            {layout.buttons.map((b: any, i: number) => (
              <button
                key={i}
                onClick={i === 0 ? generatePlan : surpriseMe}
                className={`absolute flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition hover:opacity-90 ${
                  b.style === "primary"
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "border border-foreground/30 bg-background/30 backdrop-blur hover:border-gold hover:text-gold"
                }`}
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
              >
                {b.style === "primary" ? <Sparkles className="h-4 w-4" /> : <Shuffle className="h-4 w-4" />}
                {b.label}
              </button>
            ))}
          </section>

          <ControlBar />

          <section>
            <SectionHeader title="Explore Erbil" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {CATEGORIES.map((c) => (
                <Link key={c.name} to="/category/$slug" params={{ slug: c.name.toLowerCase().replace(/\s+/g, "-") }} className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl border border-border shadow-luxury block">
                  <img src={coverFor(c.name)} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="font-display text-lg font-bold leading-tight">{c.name}</p>
                  </div>
                </Link>
              ))}

              {/* Organized Tours — separate feature (tour organizer portal), not a normal
                  category, so it links straight to /tours instead of /category/$slug. */}
              <Link to="/tours" className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl border border-border shadow-luxury block">
                <img src={covers.data?.find((c) => c.category === "Organized Tours")?.image_url || toursImg} alt="Organized Tours" className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="font-display text-lg font-bold leading-tight">Organized Tours</p>
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

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
    </div>
  );
}
