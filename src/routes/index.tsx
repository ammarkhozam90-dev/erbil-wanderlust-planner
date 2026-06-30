import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-citadel.jpg";
import { Header } from "@/components/Header";
import { ControlBar } from "@/components/ControlBar";
import { PlannedDay } from "@/components/PlannedDay";
import { CATEGORIES, LOCATIONS } from "@/data/locations";
import { useStore } from "@/lib/store";
import { Sparkles, Shuffle, ChevronRight, Users, Heart, Mountain, Laptop, Camera, Star } from "lucide-react";

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

const MODES = [
  { icon: Users, label: "Family Day", desc: "Fun for everyone" },
  { icon: Heart, label: "Romantic", desc: "Special moments" },
  { icon: Mountain, label: "Adventure", desc: "Explore & discover" },
  { icon: Laptop, label: "Productive", desc: "Work & focus" },
  { icon: Camera, label: "Tourist Day", desc: "See the highlights" },
  { icon: Star, label: "Local Expert", desc: "Like a local" },
];

function Home() {
  const { generatePlan, surpriseMe } = useStore();
  const featured = LOCATIONS.filter((l) => l.category === "Landmarks" || l.category === "Restaurants").slice(0, 6);

  // دالة مساعدة لتحويل أسماء التصنيفات البرمجية إلى روابط الـ Slug المطلوبة في الـ README
  const getSlugFromName = (name: string) => {
    switch (name.toLowerCase()) {
      case "cafés":
      case "cafes":
        return "cafes";
      case "restaurants":
        return "restaurants";
      case "things to do":
        return "things-to-do";
      case "landmarks":
        return "landmarks";
      case "parks & nature":
      case "parks":
        return "parks";
      case "nightlife":
        return "nightlife";
      case "art & culture":
        return "art-culture";
      case "shopping":
        return "shopping";
      default:
        return name.toLowerCase().replace(/\s+/g, "-");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8">
        <div className="space-y-8">
          {/* HERO */}
          <section className="relative overflow-hidden rounded-3xl shadow-luxury">
            <img
              src={heroImg}
              alt="Erbil Citadel at sunset"
              width={1920}
              height={575}
              className="aspect-[600/400] w-full object-cover object-center md:aspect-[1920/575]"
            />
            <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
            <div className="absolute inset-0 flex flex-col justify-center p-6 lg:p-10">
              <div className="max-w-2xl">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-gold">Welcome to Kurdistan</p>
                <h1 className="font-display text-3xl font-bold leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
                  EXPLORE ERBIL <span className="text-gold">FROM</span> WITHIN
                </h1>
                <p className="mt-3 max-w-lg text-sm text-foreground/80 lg:text-base">
                  AI-powered personalized plans for residents, tourists, families, couples and remote workers.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={generatePlan} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90">
                    <Sparkles className="h-4 w-4" /> Generate My Plan
                  </button>
                  <button onClick={surpriseMe} className="flex items-center gap-2 rounded-xl border border-foreground/30 bg-background/30 px-5 py-3 text-sm font-semibold backdrop-blur transition hover:border-gold hover:text-gold">
                    <Shuffle className="h-4 w-4" /> Surprise Me
                  </button>
                </                div>
              </div>
            </div>
          </section>

          <ControlBar />

          {/* Explore Erbil */}
          <section>
            <SectionHeader title="Explore Erbil" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {CATEGORIES.map((c) => {
                const sample = LOCATIONS.find((l) => l.category === c.name);
                const currentSlug = getSlugFromName(c.name);

                return (
                  <Link 
                    key={c.name} 
                    to="/category/$slug" 
                    params={{ slug: currentSlug }}
                    className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl border border-border shadow-luxury block"
                  >
                    <img src={sample?.image} alt={c.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="font-display text-lg font-bold leading-tight">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.count} places</p>
                    </div>
                    <span className="absolute right-2 top-2 rounded-full bg-background/70 px-2 py-0.5 text-[10px] backdrop-blur">{c.emoji}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Featured */}
          <section>
            <SectionHeader title="Featured Experiences" />
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {featured.map((l) => (
                <div key={l.id} className="group relative aspect-[3/4] w-[240px] shrink-0 overflow-hidden rounded-2xl border border-border shadow-luxury">
                  <img src={l.image} alt={l.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gold">Curated Full-day</p>
                    <p className="font-display text-xl font-bold leading-tight">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.area} itinerary</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Planning Modes */}
          <section>
            <SectionHeader title="Popular Planning Modes" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {MODES.map((m) => (
                <button key={m.label} onClick={generatePlan} className="group flex flex-col items-center rounded-2xl border border-border bg-card/60 p-4 text-center transition hover:border-primary/50 hover:bg-card">
                  <span className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-gold/20 text-primary group-hover:from-primary/40">
                    <m.icon className="h-5 w-5" />
                  </span>
                  <p className="text-xs font-semibold">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Your Planned Day - full-width section */}
          <section>
            <SectionHeader title="Your Planned Day" />
            <div className="rounded-2xl border border-border bg-card/60 p-4 lg:p-6">
              <PlannedDay />
            </div>
          </section>
        </div>
      </div>
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p><span className="font-display text-base text-primary">Erbil</span><span className="font-display text-base text-gold">Go</span> · Your day, your way. © 2026</p>
      </footer>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <button className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-gold">
        View all <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}
