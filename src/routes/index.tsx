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

// Responsive scaling: text is designed "at 1920px wide" and clamp() shrinks
// it smoothly on narrow screens instead of a fixed px value overflowing.
function fluidSize(px: number) {
  const vw = (px / 19.2).toFixed(2);
  const min = Math.max(12, Math.round(px * 0.4));
  return `clamp(${min}px, ${vw}vw, ${px}px)`;
}

const BTN_PAD: Record<string, string> = { sm: "px-3 py-2 text-xs", md: "px-5 py-3 text-sm", lg: "px-7 py-4 text-base" };

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

  const layout: any = hero.data?.layout || DEFAULT_LAYOUT;
  const alignClass = layout.align === "center" ? "items-center text-center" : layout.align === "right" ? "items-end text-right" : "items-start text-left";
  const justifyClass = layout.align === "center" ? "justify-center" : layout.align === "right" ? "justify-end" : "justify-start";

  function coverFor(categoryName: string) {
    const custom = covers.data?.find((c) => c.category === categoryName)?.image_url;
    return custom || LOCATIONS.find((l) => l.category === categoryName)?.image;
  }

  function renderRuns(runs: any[]) {
    return runs.map((r, i) => (
      <span key={i}>
        {r.lineBreak && <br />}
        {i > 0 && !r.lineBreak && " "}
        <span style={{ color: r.color, fontSize: fluidSize(r.fontSize), fontWeight: r.bold ? 700 : 400 }}>{r.text}</span>
      </span>
    ));
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8">
        <div className="space-y-8">
          
          {/* HERO SECTION — normal responsive flex flow, reflows correctly on every screen size */}
          <section className="relative overflow-hidden rounded-3xl shadow-luxury">
            <img
              src={heroImg}
              alt="Erbil Citadel at sunset"
              className="aspect-[600/400] w-full object-cover object-center md:aspect-[1920/575]"
            />
            <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />

            {/* طقس وموقع */}
            <div className="absolute bottom-6 right-6 z-10 hidden items-center gap-4 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-white backdrop-blur-md sm:flex">
               <div className="flex items-center gap-1 text-sm"><MapPin className="h-4 w-4" /> Erbil</div>
               <div className="flex items-center gap-1 text-sm"><Sun className="h-4 w-4" /> 28°C</div>
            </div>

            <div className={`absolute inset-0 flex flex-col justify-center gap-2 p-6 lg:p-10 ${alignClass}`}>
              <div className="max-w-2xl">
                <p className="mb-1 font-sans text-xs font-semibold uppercase tracking-[0.3em]">{renderRuns(layout.eyebrow.runs)}</p>
                <h1 className="font-display leading-[1.05]">{renderRuns(layout.headline.runs)}</h1>
                <p className="mt-3 max-w-lg font-sans">{renderRuns(layout.subheadline.runs)}</p>
                <div className={`mt-4 flex flex-wrap gap-3 ${justifyClass}`}>
                  {layout.buttons.map((b: any, i: number) => (
                    <button
                      key={i}
                      onClick={i === 0 ? generatePlan : surpriseMe}
                      className={`flex items-center gap-2 rounded-xl font-semibold transition hover:opacity-90 ${BTN_PAD[b.size ?? "md"]} ${
                        b.style === "primary"
                          ? "bg-primary text-primary-foreground shadow-glow"
                          : "border border-foreground/30 bg-background/30 backdrop-blur hover:border-gold hover:text-gold"
                      }`}
                    >
                      {b.style === "primary" ? <Sparkles className="h-4 w-4" /> : <Shuffle className="h-4 w-4" />}
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
