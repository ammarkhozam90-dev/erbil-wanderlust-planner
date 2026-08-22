import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Clock3, Compass, MapPinned, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/our-guide")({
  head: () => ({
    meta: [
      { title: "Our Local Guide — Discover Erbil with ErbilGo" },
      { name: "description", content: "Editorial routes, local context and thoughtful ways to experience Erbil beyond a simple list of places." },
      { property: "og:title", content: "Our Local Guide — ErbilGo" },
      { property: "og:description", content: "A local point of view for discovering Erbil's history, nature, neighborhoods and everyday rhythm." },
    ],
  }),
  component: OurGuide,
});

const chapters = [
  { icon: Clock3, eyebrow: "A first day", title: "Start with the old city", text: "Begin at the Citadel while the light is soft, walk through Qaysari Bazaar, pause for tea, then let the evening continue in a modern neighborhood. It is the clearest introduction to Erbil's layers." },
  { icon: Compass, eyebrow: "Choose your rhythm", title: "History, nature or city life", text: "Use our curated journeys as starting points, not fixed tours. Stay longer where the moment feels right, or combine a landmark with a café, restaurant or park nearby." },
  { icon: MapPinned, eyebrow: "Read the city", title: "Neighborhoods tell different stories", text: "Ankawa, the Citadel area, Gulan and the ring roads each have a different pace. The guide will help you understand what fits your mood, timing and way of traveling." },
  { icon: BookOpen, eyebrow: "A local point of view", title: "Useful context before you go", text: "We explain the small details that make a visit smoother: when to arrive, what to wear, how to move around, and which experiences work well for families, couples, friends or solo travelers." },
];

function OurGuide() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-12 lg:px-8 lg:py-20">
        <section className="relative overflow-hidden rounded-[2rem] border border-gold/15 bg-card/50 p-7 shadow-luxury sm:p-10 lg:p-16">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-gold"><Sparkles className="h-4 w-4" /> The ErbilGo editorial guide</p>
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">See Erbil through a <span className="text-primary">local lens.</span></h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Our Local Guide is the human layer of ErbilGo: stories, context and practical inspiration that help you understand where to go, when to go and why a place matters.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Button asChild className="bg-gold text-background hover:bg-gold/90"><Link to="/">Explore the directory <ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="outline"><Link to="/guide">Living in Erbil</Link></Button></div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {chapters.map(({ icon: Icon, eyebrow, title, text }) => <article key={title} className="rounded-2xl border border-border/70 bg-card/35 p-6 transition hover:-translate-y-0.5 hover:border-gold/25"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-gold/10 text-gold"><Icon className="h-5 w-5" /></span><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">{eyebrow}</p></div><h2 className="mt-5 font-display text-2xl font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>)}
        </section>

        <section className="mt-10 rounded-2xl border border-border/70 bg-background/40 p-6 text-center sm:p-8"><p className="text-sm leading-6 text-muted-foreground">This guide will grow with verified local stories, thematic itineraries, seasonal recommendations and insights from the businesses and people who know Erbil best.</p></section>
      </main>
    </div>
  );
}
