import type { PlannerInput } from "@/lib/planner-engine";

type Mode = NonNullable<PlannerInput["travelMode"]>;

const MODES: { id: Mode; label: string }[] = [
  { id: "walking", label: "Walking" },
  { id: "car", label: "My car" },
  { id: "taxi", label: "Taxi" },
];

/** "How will you get around?" Changes travel times and how far apart stops can be. */
export function TravelModePicker({
  value,
  onChange,
}: {
  value?: PlannerInput["travelMode"];
  onChange: (v: Mode) => void;
}) {
  return (
    <section className="mt-6 space-y-2">
      <h4 className="text-sm font-semibold">How will you get around?</h4>
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => {
          const active = (value ?? "car") === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(m.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border/70 text-muted-foreground hover:border-gold/40"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
