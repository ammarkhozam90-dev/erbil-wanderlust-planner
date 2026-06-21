import { useStore, formatPrice } from "@/lib/store";
import { exportPDF, shareWhatsApp } from "@/lib/export";
import { Clock, MapPin, Download, Share2, Trash2, Sparkles } from "lucide-react";

export function PlannedDay() {
  const { plan, currency, exchangeRate, clearPlan } = useStore();

  if (plan.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
        <Sparkles className="mb-3 h-8 w-8 text-gold" />
        <h3 className="font-display text-xl font-semibold">Your Planned Day</h3>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Set your mood, who you're with, budget & duration — then hit Generate My Plan.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card/60 shadow-luxury">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="font-display text-xl font-bold">Your Planned Day</h3>
          <p className="text-xs text-muted-foreground">{plan.length} stops · optimized route</p>
        </div>
        <button
          onClick={clearPlan}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Clear"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Minimap */}
      <div className="relative mx-5 mt-4 h-32 overflow-hidden rounded-xl border border-border bg-secondary">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,oklch(0.72_0.17_160/0.15),transparent_60%),radial-gradient(circle_at_70%_60%,oklch(0.78_0.13_85/0.12),transparent_60%)]" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 130">
          <path
            d={plan
              .map((p, i) => {
                const x = 20 + ((p.lng - 43.95) / 0.3) * 260;
                const y = 110 - ((p.lat - 36.18) / 0.08) * 90;
                return `${i === 0 ? "M" : "L"}${Math.max(15, Math.min(285, x))},${Math.max(15, Math.min(115, y))}`;
              })
              .join(" ")}
            stroke="oklch(0.72 0.17 160)"
            strokeWidth="2"
            strokeDasharray="4 3"
            fill="none"
          />
          {plan.map((p, i) => {
            const x = Math.max(15, Math.min(285, 20 + ((p.lng - 43.95) / 0.3) * 260));
            const y = Math.max(15, Math.min(115, 110 - ((p.lat - 36.18) / 0.08) * 90));
            return (
              <g key={p.id}>
                <circle cx={x} cy={y} r="7" fill="oklch(0.18 0.005 240)" stroke="oklch(0.78 0.13 85)" strokeWidth="1.5" />
                <text x={x} y={y + 3} textAnchor="middle" fontSize="8" fill="oklch(0.78 0.13 85)" fontWeight="700">
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="relative">
          <div className="absolute left-[34px] top-2 bottom-2 w-px bg-gradient-to-b from-primary via-gold to-transparent" />
          {plan.map((item, i) => (
            <div key={item.id} className="relative mb-5 flex gap-4">
              <div className="flex w-[68px] shrink-0 flex-col items-end pt-1">
                <span className="text-sm font-semibold text-primary">{item.startTime}</span>
                <span className="text-[10px] text-muted-foreground">
                  {formatPrice(item.priceUSD, currency, exchangeRate)}
                </span>
              </div>
              <div className="relative">
                <div className="absolute -left-[6px] top-2 grid h-3 w-3 place-items-center rounded-full border-2 border-background bg-gold" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold leading-tight">{item.name}</h4>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {item.area}
                </p>
                <div className="relative mt-2 aspect-[16/9] overflow-hidden rounded-lg">
                  <img src={item.image} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">{item.description}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/80">
                  <Clock className="h-2.5 w-2.5" /> {item.durationMin} min
                </p>
              </div>
              {i < plan.length - 1 && null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
        <button
          onClick={() => exportPDF(plan)}
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-gold px-3 py-2.5 text-xs font-semibold text-gold-foreground transition hover:opacity-90"
        >
          <Download className="h-3.5 w-3.5" /> Export PDF
        </button>
        <button
          onClick={() => shareWhatsApp(plan)}
          className="flex items-center justify-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-3 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
        >
          <Share2 className="h-3.5 w-3.5" /> WhatsApp
        </button>
      </div>
    </div>
  );
}
