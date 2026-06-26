import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Sun, Users, Shirt, Coffee, MapPin } from "lucide-react";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Living in Erbil — Climate, Culture & Customs | ErbilGo" },
      { name: "description", content: "Practical guide to Erbil's climate, customs and dress codes for visitors, expats and residents settling into Kurdistan's capital." },
      { property: "og:title", content: "Living in Erbil — ErbilGo Guide" },
      { property: "og:description", content: "A practical primer on climate, customs and dress codes shaping daily life in Hewlêr." },
      { property: "og:url", content: "https://erbilgo.app/guide" },
    ],
    links: [{ rel: "canonical", href: "https://erbilgo.app/guide" }],
  }),
  component: Guide,
});

function Section({ icon: Icon, title, children }: any) {
  return (
    <section className="rounded-3xl border border-border bg-card/60 p-8 shadow-luxury">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-gold/20 text-gold">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="font-display text-3xl font-bold">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Guide() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold">The ErbilGo Companion</p>
          <h1 className="font-display text-5xl font-bold leading-tight lg:text-6xl">Living in <span className="text-primary">Erbil</span></h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">A short, practical primer on the climate, customs and dress codes that shape day-to-day life in Hewlêr.</p>
        </div>
        <div className="space-y-6">
          <Section icon={Sun} title="Climate">
            <p>Summers (June–September) regularly exceed 42°C. Plan outdoor exploration — Citadel, Qaysari, Sami Abdulrahman Park — for early morning (before 10am) or after 5pm.</p>
            <p>Between <strong className="text-gold">1 PM and 5 PM</strong>, favor indoor spots: Family Mall, Majidi Mall, Empire World, the Civilization Museum, or one of the air-conditioned cafés in Ankawa.</p>
            <p>Winters are mild but evenings can drop below 5°C — bring a light coat from December through February.</p>
          </Section>
          <Section icon={Users} title="Culture & Etiquette">
            <p>Kurdish hospitality is legendary. Accept the second offer of tea (chai) — refusing politely once is normal, refusing twice can come across as cold.</p>
            <p>Greet elders first, with the right hand over the heart. A handshake is standard for men; wait for women to extend their hand.</p>
            <p>Friday is the holy day — many small shops close until afternoon. Ramadan changes restaurant hours significantly; check ahead.</p>
          </Section>
          <Section icon={Shirt} title="Dress Code">
            <p><strong className="text-foreground">Traditional areas</strong> (Citadel, Qaysari Bazaar, mosques): cover shoulders and knees. Women may want a light scarf for mosque visits.</p>
            <p><strong className="text-foreground">Modern luxury spots</strong> (Empire World, Gulan Street, English/Italian Village, Ankawa restaurants): smart casual to upscale — Erbil locals dress well in the evening.</p>
            <p>Sunglasses, a hat and breathable fabrics are essential April–October regardless of where you're going.</p>
          </Section>
          <Section icon={Coffee} title="Remote Work Tips">
            <p>Cafés flagged "Productive" in ErbilGo (Shams, Nuts, T-City, Iskan, Lalav) reliably offer fast Wi-Fi, power outlets and a quiet vibe.</p>
            <p>Mobile data is cheap and fast (Korek / Asiacell). Most malls and luxury hotels have stable Wi-Fi as a backup.</p>
          </Section>
          <Section icon={MapPin} title="Getting Around">
            <p>Careem operates throughout Erbil — typically 3,000–8,000 IQD across the city. The ring roads (30M, 60M, 100M, 150M) make navigation intuitive.</p>
          </Section>
        </div>
      </div>
    </div>
  );
}
