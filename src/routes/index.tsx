import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-citadel.jpg";
import { Header } from "@/components/Header";
import { ControlBar } from "@/components/ControlBar";
import { PlannedDay } from "@/components/PlannedDay";
import { CATEGORIES, LOCATIONS } from "@/data/locations";
import { useStore } from "@/lib/store";
import { Sparkles, Shuffle, ChevronRight, Users, Heart, Mountain, Laptop, Camera, Star, MapPin, Sun } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8">
        <div className="space-y-8">
          
          {/* HERO SECTION - تم نقل الطقس والموقع للداخل */}
          <section className="relative overflow-hidden rounded-3xl shadow-luxury">
            <img
              src={heroImg} // هنا يمكنك استبدال heroImg بـ state ديناميكي يغيره الأدمن
              alt="Erbil Citadel at sunset"
              className="aspect-[600/400] w-full object-cover object-center md:aspect-[1920/575]"
            />
            
            {/* طقس وموقع - مضاف يدوياً هنا للظهور داخل صورة البطل */}
            <div className="absolute top-6 right-6 flex items-center gap-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white z-10">
               <div className="flex items-center gap-1 text-sm"><MapPin className="h-4 w-4" /> Erbil</div>
               <div className="flex items-center gap-1 text-sm"><Sun className="h-4 w-4" /> 28°C</div>
            </div>

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
                </div>
              </div>
            </div>
          </section>

          <ControlBar />
          {/* باقي الكود كما هو */}
          <section>
            <SectionHeader title="Explore Erbil" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {CATEGORIES.map((c) => (
                <Link key={c.name} to="/category/$slug" params={{ slug: c.name.toLowerCase().replace(/\s+/g, "-") }} className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl border border-border shadow-luxury block">
                  <img src={LOCATIONS.find((l) => l.category === c.name)?.image} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="font-display text-lg font-bold leading-tight">{c.name}</p>
                  </div>
                </Link>
              ))}
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
