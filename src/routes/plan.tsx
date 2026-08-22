import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Clock3, Compass, MapPin, RefreshCw, Sparkles, Users, Wallet, Replace } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { LOCATIONS, type Category } from "@/data/locations";
import { supabase } from "@/integrations/supabase/client";
import { generateInternalPlan, locationToPlannerCandidate, type GeneratedPlan, type PlannerBudget, type PlannerCandidate, type PlannerCompanion, type PlannerDuration, type PlannerInput, type PlannerMood } from "@/lib/planner-engine";
import { toast } from "sonner";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Plan My Day — ErbilGo" },
      { name: "description", content: "Build a professional day in Erbil using ErbilGo's internal smart recommendation engine." },
    ],
  }),
  component: PlanPage,
});

const steps = ["Your people", "Your mood", "Your time", "Your interests"];
const companions: { value: PlannerCompanion; label: string; hint: string }[] = [
  { value: "Solo", label: "Just me", hint: "A calm day at your own pace" },
  { value: "Couple", label: "With my partner", hint: "Thoughtful places for two" },
  { value: "Friends", label: "With friends", hint: "Social, easy and memorable" },
  { value: "Family", label: "With family", hint: "Comfortable for everyone" },
  { value: "Work", label: "Work or remote day", hint: "Focus, coffee and breathing room" },
];
const moods: { value: PlannerMood; label: string; hint: string }[] = [
  { value: "Relaxed", label: "Relaxed", hint: "Slow down and enjoy the moment" },
  { value: "Cultural", label: "History & culture", hint: "See the stories behind the city" },
  { value: "Adventurous", label: "Adventure", hint: "More movement, nature and discovery" },
  { value: "Romantic", label: "Romantic", hint: "Beautiful places and a softer rhythm" },
  { value: "Family", label: "Family fun", hint: "Easy, welcoming and child-friendly" },
  { value: "Productive", label: "Focused", hint: "A productive day with good pauses" },
  { value: "Social", label: "Social", hint: "Good food, energy and conversation" },
];
const interests: { value: Category; label: string; emoji: string }[] = [
  { value: "Landmarks", label: "History & landmarks", emoji: "🏛️" },
  { value: "Art & Culture", label: "Museums & culture", emoji: "🎨" },
  { value: "Parks & Nature", label: "Parks & nature", emoji: "🌿" },
  { value: "Restaurants", label: "Food", emoji: "🍽️" },
  { value: "Cafés", label: "Coffee", emoji: "☕" },
  { value: "Shopping", label: "Shopping", emoji: "🛍️" },
  { value: "Things to Do", label: "Activities", emoji: "🎈" },
  { value: "Nightlife", label: "Nightlife", emoji: "🌙" },
];
const budgets: { value: PlannerBudget; label: string; hint: string }[] = [
  { value: "Budget", label: "Easy on the pocket", hint: "Mostly free and low-cost stops" },
  { value: "Balanced", label: "Balanced", hint: "A comfortable mix of experiences" },
  { value: "Premium", label: "Premium", hint: "More room for special places" },
];

function PlanPage() {
  const { profile, session, incrementItineraries } = useAuth();
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<GeneratedPlan | null>(null);
  const [form, setForm] = useState<PlannerInput>(() => ({
    companion: "Solo",
    mood: "Relaxed",
    budget: "Balanced",
    durationHours: 4,
    startHour: Math.min(18, Math.max(8, new Date().getHours() + 1)),
    interests: ["Cafés", "Landmarks"],
    profile,
    indoorPreference: "any",
    mobility: "any",
  }));

  const merchantCandidates = useQuery({
    queryKey: ["planner-approved-merchants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("merchants").select("id,name,category,city,address,cover_url,price_level,description,is_sponsored,avg_rating,review_count,latitude,longitude,status").eq("status", "approved").limit(100);
      if (error) return [];
      return (data ?? []) as any[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const candidates = useMemo(() => {
    const local = LOCATIONS.map(locationToPlannerCandidate);
    const db = (merchantCandidates.data ?? []).filter((merchant) => Number.isFinite(Number(merchant.latitude)) && Number.isFinite(Number(merchant.longitude))).map((merchant): PlannerCandidate => {
      const category = normalizeCategory(merchant.category);
      const price = Number(merchant.price_level ?? 1);
      return {
        id: `merchant-${merchant.id}`,
        merchantId: merchant.id,
        name: merchant.name,
        category,
        area: merchant.city || merchant.address || "Erbil",
        lat: Number(merchant.latitude),
        lng: Number(merchant.longitude),
        priceUSD: price <= 1 ? 8 : price === 2 ? 20 : price === 3 ? 45 : 75,
        description: merchant.description || `A verified ${String(merchant.category || "Erbil").toLowerCase()} in ${merchant.city || "Erbil"}.`,
        durationMin: category === "Restaurants" ? 90 : category === "Cafés" ? 60 : 75,
        mood: categoryMood(category),
        with: ["Solo", "Couple", "Friends", "Family"],
        bestHours: [8, 23],
        image: merchant.cover_url || "",
        approved: merchant.status === "approved",
        isSponsored: Boolean(merchant.is_sponsored),
        avgRating: merchant.avg_rating,
        reviewCount: merchant.review_count,
        tags: [merchant.category, merchant.city, merchant.address].filter(Boolean),
        accessibility: "moderate",
        indoor: ["Cafés", "Restaurants", "Shopping", "Art & Culture"].includes(category),
      };
    });
    const seen = new Set<string>();
    return [...db, ...local].filter((item) => { const key = item.name.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
  }, [merchantCandidates.data]);

  function updateForm(patch: Partial<PlannerInput>) { setForm((prev) => ({ ...prev, ...patch })); }

  function generate() {
    const plan = generateInternalPlan(candidates, { ...form, profile });
    setResult(plan);
    incrementItineraries().catch(() => undefined);
  }

  function next() {
    if (step < steps.length - 1) setStep((v) => v + 1);
    else generate();
  }

  function reset() { setResult(null); setStep(0); }

  return <div className="min-h-screen bg-background text-foreground">
    <Header />
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8 lg:py-14">
      {!result ? <section className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-gold"><Sparkles className="h-4 w-4" /> Internal smart engine</p>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Plan your day in Erbil.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Our internal engine matches real, approved places around your mood and pace — with controlled randomness to ensure every plan is unique.</p>
        </div>
        <div className="mb-6 flex items-center justify-center gap-2 sm:gap-4">{steps.map((label, index) => <div key={label} className="flex items-center gap-2"><div className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-bold ${index <= step ? "border-gold bg-gold text-background" : "border-border text-muted-foreground"}`}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</div><span className={`hidden text-xs sm:inline ${index === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>{index < steps.length - 1 && <div className={`h-px w-5 sm:w-12 ${index < step ? "bg-gold" : "bg-border"}`} />}</div>)}</div>
        <div className="rounded-[2rem] border border-gold/15 bg-card/45 p-5 shadow-luxury sm:p-8">
          {step === 0 && <WizardStep icon={Users} eyebrow="The company" title="Who are you spending the day with?" subtitle="This changes the pace and the kinds of places we prioritise."><div className="grid gap-3 sm:grid-cols-2">{companions.map((item) => <Choice key={item.value} selected={form.companion === item.value} onClick={() => updateForm({ companion: item.value })} title={item.label} hint={item.hint} />)}</div></WizardStep>}
          {step === 1 && <WizardStep icon={Compass} eyebrow="The feeling" title="What kind of day do you want?" subtitle="Our engine uses weighted scoring to match your mood with the best places."><div className="grid gap-3 sm:grid-cols-2">{moods.map((item) => <Choice key={item.value} selected={form.mood === item.value} onClick={() => updateForm({ mood: item.value })} title={item.label} hint={item.hint} />)}</div></WizardStep>}
          {step === 2 && <WizardStep icon={Clock3} eyebrow="The shape" title="How much time and budget do you have?" subtitle="We ensure geographic efficiency so you spend less time in traffic."><div className="grid gap-3 sm:grid-cols-3">{([2, 4, 6, 8] as PlannerDuration[]).map((hours) => <Choice key={hours} selected={form.durationHours === hours} onClick={() => updateForm({ durationHours: hours })} title={hours === 2 ? "A quick escape" : hours === 4 ? "Half a day" : hours === 6 ? "Most of the day" : "A full day"} hint={`${hours} hours available`} />)}</div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="rounded-xl border border-border/70 bg-background/40 p-4"><span className="text-xs font-semibold text-muted-foreground">Start around</span><select value={form.startHour} onChange={(e) => updateForm({ startHour: Number(e.target.value) })} className="mt-2 w-full bg-transparent text-sm font-semibold outline-none">{[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((h) => <option key={h} value={h}>{formatHour(h)}</option>)}</select></label><div className="grid gap-2">{budgets.map((item) => <button key={item.value} type="button" onClick={() => updateForm({ budget: item.value })} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${form.budget === item.value ? "border-gold bg-gold/10" : "border-border/70 hover:border-gold/40"}`}><span><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs text-muted-foreground">{item.hint}</span></span><Wallet className={`h-4 w-4 ${form.budget === item.value ? "text-gold" : "text-muted-foreground"}`} /></button>)}</div></div></WizardStep>}
          {step === 3 && <WizardStep icon={Sparkles} eyebrow="The details" title="What should be part of the day?" subtitle="Choose a few interests and we will do the rest."><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{interests.map((item) => { const selected = form.interests.includes(item.value); return <button key={item.value} type="button" onClick={() => updateForm({ interests: selected ? form.interests.filter((v) => v !== item.value) : [...form.interests, item.value] })} className={`rounded-xl border px-3 py-3 text-left text-sm transition ${selected ? "border-gold bg-gold/10 text-foreground" : "border-border/70 text-muted-foreground hover:border-gold/40"}`}><span className="text-lg">{item.emoji}</span><span className="mt-1 block text-xs font-semibold">{item.label}</span>{selected && <Check className="mt-2 h-3.5 w-3.5 text-gold" />}</button>; })}</div><div className="mt-6 grid gap-3 sm:grid-cols-2"><SelectCard label="Setting" value={form.indoorPreference ?? "any"} onChange={(v) => updateForm({ indoorPreference: v as any })} options={[["any", "Indoor or outdoors"], ["indoor", "Prefer indoor"], ["outdoor", "Prefer outdoors"]]} /><SelectCard label="Walking pace" value={form.mobility ?? "any"} onChange={(v) => updateForm({ mobility: v as any })} options={[["any", "Any pace"], ["easy", "Keep walking easy"], ["active", "I enjoy walking"]]} /></div></WizardStep>}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/60 pt-5"><Button type="button" variant="ghost" onClick={() => step > 0 ? setStep((v) => v - 1) : undefined} disabled={step === 0}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button><Button type="button" onClick={next} className="bg-gold text-background hover:bg-gold/90">{step === steps.length - 1 ? <><Sparkles className="mr-2 h-4 w-4" /> Generate my day</> : <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>}</Button></div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">{session ? "Your saved profile preferences are used as gentle defaults." : "Sign in to save your generated plans to your profile."}</p>
      </section> : <PlanResult plan={result} form={form} onReset={reset} onRegenerate={generate} />}
    </main>
  </div>;
}

function WizardStep({ icon: Icon, eyebrow, title, subtitle, children }: { icon: any; eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) { return <div><div className="mb-6 flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/10 text-gold"><Icon className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">{eyebrow}</p><h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{title}</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">{subtitle}</p></div></div>{children}</div>; }
function Choice({ selected, onClick, title, hint }: { selected: boolean; onClick: () => void; title: string; hint: string }) { return <button type="button" onClick={onClick} className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${selected ? "border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(212,175,55,.15)]" : "border-border/70 bg-background/30 hover:border-gold/40"}`}><span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{hint}</span></span><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? "border-gold bg-gold text-background" : "border-border"}`}>{selected && <Check className="h-3 w-3" />}</span></button>; }
function SelectCard({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) { return <label className="rounded-xl border border-border/70 bg-background/40 p-4"><span className="text-xs font-semibold text-muted-foreground">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full bg-transparent text-sm font-semibold outline-none">{options.map(([opt, text]) => <option key={opt} value={opt}>{text}</option>)}</select></label>; }
function formatHour(h: number) { const s = h >= 12 ? "PM" : "AM"; const n = h % 12 || 12; return `${n}:00 ${s}`; }
function normalizeCategory(v: any): Category { const t = String(v ?? "").toLowerCase(); if (t.includes("cafe") || t.includes("coffee")) return "Cafés"; if (t.includes("restaurant") || t.includes("food")) return "Restaurants"; if (t.includes("park") || t.includes("nature")) return "Parks & Nature"; if (t.includes("landmark") || t.includes("heritage")) return "Landmarks"; if (t.includes("culture") || t.includes("museum")) return "Art & Culture"; if (t.includes("shop") || t.includes("mall")) return "Shopping"; if (t.includes("night")) return "Nightlife"; return "Things to Do"; }
function categoryMood(c: Category): PlannerMood[] { if (c === "Parks & Nature") return ["Relaxed", "Family", "Adventurous"]; if (c === "Restaurants") return ["Romantic", "Family", "Social"]; if (c === "Cafés") return ["Relaxed", "Productive", "Social"]; if (c === "Art & Culture" || c === "Landmarks") return ["Cultural", "Relaxed", "Adventurous"]; if (c === "Nightlife") return ["Social", "Romantic"]; return ["Relaxed", "Family", "Social"]; }

function PlanResult({ plan, form, onReset, onRegenerate }: { plan: GeneratedPlan; form: PlannerInput; onReset: () => void; onRegenerate: () => void }) { 
  const swap = () => toast.info("Swap feature is coming soon to the professional engine!");
  
  return <section className="mx-auto max-w-5xl">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-gold"><Sparkles className="h-4 w-4" /> Professional Recommendation</p>
        <h1 className="font-display text-4xl font-bold sm:text-5xl">{plan.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{plan.summary}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onReset}><ArrowLeft className="mr-2 h-4 w-4" /> Edit answers</Button>
        <Button variant="outline" onClick={onRegenerate}><RefreshCw className="mr-2 h-4 w-4" /> Rebuild</Button>
      </div>
    </div>
    
    <div className="mt-7 grid gap-3 sm:grid-cols-3">
      <Stat label="Stops" value={String(plan.stops.length)} />
      <Stat label="Estimated spend" value={plan.estimatedCostUSD ? `$${plan.estimatedCostUSD}` : "Free"} />
      <Stat label="Engine Confidence" value="High" />
    </div>

    {plan.warnings.length > 0 && <div className="mt-5 rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm text-muted-foreground">{plan.warnings.map((w) => <p key={w}>{w}</p>)}</div>}
    
    <div className="mt-7 space-y-4">
      {plan.stops.map((stop, index) => <article key={`${stop.location.id}-${index}`} className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/45 p-4 sm:p-5">
        <div className="flex gap-4">
          <div className="relative hidden w-32 shrink-0 overflow-hidden rounded-xl sm:block"><img src={stop.location.image || "/placeholder.svg"} alt="" className="h-full min-h-28 w-full object-cover" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-gold text-background">Stop {index + 1}</Badge>
                <span className="text-xs font-semibold text-gold">{formatHour(Math.floor(stop.startHour))}</span>
                <span className="text-xs text-muted-foreground">{Math.round((stop.endHour - stop.startHour) * 60)} min</span>
              </div>
              <Button variant="ghost" size="sm" onClick={swap} className="h-8 gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-gold">
                <Replace className="h-3.5 w-3.5" /> Swap
              </Button>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold">{stop.location.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 text-gold" />{stop.location.area} · {stop.location.category}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{stop.reason}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border px-2.5 py-1">{stop.estimatedCostUSD ? `$${stop.estimatedCostUSD} est.` : "Free"}</span>
              {stop.distanceKmFromPrevious !== undefined && <span className="rounded-full border border-border px-2.5 py-1">{stop.distanceKmFromPrevious.toFixed(1)} km from previous</span>}
              {stop.location.merchantId ? <Link to="/business/$id" params={{ id: stop.location.merchantId }} className="rounded-full border border-gold/25 px-2.5 py-1 text-gold transition hover:bg-gold/10">View place</Link> : <span className="rounded-full border border-gold/25 px-2.5 py-1 text-gold">Guide stop</span>}
            </div>
          </div>
        </div>
      </article>)}
    </div>

    {plan.alternatives.length > 0 && <div className="mt-10 border-t border-border/60 pt-8">
      <h2 className="font-display text-2xl font-bold">Recommended alternatives</h2>
      <p className="mt-1 text-sm text-muted-foreground">Places that also matched your mood but didn't make the primary route.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plan.alternatives.slice(0, 3).map((place) => <div key={place.id} className="rounded-xl border border-border/70 bg-card/35 p-4 transition hover:border-gold/30">
          <p className="font-semibold">{place.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{place.category} · {place.area}</p>
          {place.merchantId && <Link to="/business/$id" params={{ id: place.merchantId }} className="mt-3 block text-xs font-bold uppercase tracking-wider text-gold hover:underline">View details</Link>}
        </div>)}
      </div>
    </div>}
  </section>; 
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border/70 bg-card/35 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold text-gold">{value}</p></div>; }
