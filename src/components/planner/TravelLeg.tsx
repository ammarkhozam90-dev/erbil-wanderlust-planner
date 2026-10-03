import { Footprints, Car } from "lucide-react";
import type { PlanStop, PlannerInput } from "@/lib/planner-engine";

/** Small line between two stops: "12 min · 3.4 km". Nothing for the first stop. */
export function TravelLeg({ stop, mode = "car" }: { stop: PlanStop; mode?: PlannerInput["travelMode"] }) {
  if (stop.travelMinutesFromPrevious == null) return null;
  const Icon = mode === "walking" ? Footprints : Car;
  const km = stop.distanceKmFromPrevious;
  return (
    <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
      <span className="h-6 border-l border-dashed border-gold/40" />
      <Icon className="h-3.5 w-3.5 text-gold" />
      <span>
        {stop.travelMinutesFromPrevious} min{km != null ? ` · ${km.toFixed(1)} km` : ""}
      </span>
    </div>
  );
}
