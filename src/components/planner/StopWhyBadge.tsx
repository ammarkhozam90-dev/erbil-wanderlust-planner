import { Check } from "lucide-react";
import type { PlanStop } from "@/lib/planner-engine";

/** "92% match" + the reasons list under each stop. Renders nothing for older saved plans without match data. */
export function StopWhyBadge({ stop }: { stop: PlanStop }) {
  const reasons = Array.from(new Set(stop.reasons ?? [])).slice(0, 4);
  // Older saved plans have no match data; a low score is not worth advertising, so only show the % when it is meaningful.
  const showPercent = stop.matchPercent != null && stop.matchPercent >= 50;
  if (!showPercent && reasons.length === 0) return null;
  return (
    <div className="mt-3 space-y-2.5">
      {showPercent && (
        <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">
          {stop.matchPercent}% match for you
        </span>
      )}
      {reasons.length > 0 && (
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {reasons.map((r) => (
            <li key={r} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
