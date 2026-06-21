import { useStore, type Mood, type Companion, type Budget, type Duration } from "@/lib/store";
import { Sparkles, Shuffle, DollarSign, Coins } from "lucide-react";

const MOODS: { v: Mood; emoji: string }[] = [
  { v: "Relaxed", emoji: "😌" },
  { v: "Adventurous", emoji: "🧭" },
  { v: "Romantic", emoji: "💕" },
  { v: "Family", emoji: "👨‍👩‍👧" },
  { v: "Productive", emoji: "💻" },
];
const COMPANIONS: { v: Companion; emoji: string }[] = [
  { v: "Solo", emoji: "🧍" },
  { v: "Couple", emoji: "💑" },
  { v: "Family", emoji: "👨‍👩‍👧" },
  { v: "Friends", emoji: "👥" },
];
const DURATIONS: { v: Duration; label: string }[] = [
  { v: "Half", label: "Half day" },
  { v: "Full", label: "Full day" },
  { v: "Evening", label: "Evening" },
];

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary/15 text-primary shadow-glow"
          : "border-border bg-secondary/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function ControlBar() {
  const s = useStore();
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-luxury backdrop-blur lg:p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Mood</p>
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <Pill key={m.v} active={s.mood === m.v} onClick={() => s.setFilter("mood", m.v)}>
                <span className="mr-1">{m.emoji}</span>{m.v}
              </Pill>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">With</p>
          <div className="flex flex-wrap gap-1.5">
            {COMPANIONS.map((c) => (
              <Pill key={c.v} active={s.companion === c.v} onClick={() => s.setFilter("companion", c.v)}>
                <span className="mr-1">{c.emoji}</span>{c.v}
              </Pill>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Budget</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {(["$", "$$", "$$$"] as Budget[]).map((b) => (
              <Pill key={b} active={s.budget === b} onClick={() => s.setFilter("budget", b)}>
                {b}
              </Pill>
            ))}
            <button
              onClick={() => s.setFilter("currency", s.currency === "USD" ? "IQD" : "USD")}
              className="ml-1 flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1.5 text-[10px] font-bold text-gold hover:bg-gold/20"
              title={`1 USD = ${s.exchangeRate.toLocaleString()} IQD`}
            >
              {s.currency === "USD" ? <DollarSign className="h-3 w-3" /> : <Coins className="h-3 w-3" />}
              {s.currency}
            </button>
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Duration</p>
          <div className="flex flex-wrap gap-1.5">
            {DURATIONS.map((d) => (
              <Pill key={d.v} active={s.duration === d.v} onClick={() => s.setFilter("duration", d.v)}>
                {d.label}
              </Pill>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={s.generatePlan}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" /> Generate
          </button>
          <button
            onClick={s.surpriseMe}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold transition hover:border-gold/50 hover:text-gold"
          >
            <Shuffle className="h-4 w-4" /> Surprise
          </button>
        </div>
      </div>
    </div>
  );
}
