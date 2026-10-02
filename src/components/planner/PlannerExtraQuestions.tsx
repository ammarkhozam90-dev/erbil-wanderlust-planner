import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Category } from "@/data/locations";
import type { PlannerInput, PlannerMood } from "@/lib/planner-engine";

type Extra = Pick<
  PlannerInput,
  "extraMoods" | "pace" | "foodPreferences" | "avoid" | "mustInclude" | "mood"
>;

const MOODS: PlannerMood[] = ["Relaxed", "Cultural", "Adventurous", "Romantic", "Family", "Productive", "Social"];
const FOODS = ["kurdish", "arabic", "turkish", "grill", "seafood", "fast food", "vegetarian", "desserts"];
const AVOIDS = [
  { id: "crowded", label: "Crowded places" },
  { id: "loud", label: "Loud music" },
  { id: "smoking", label: "Shisha / smoking" },
  { id: "stairs", label: "Lots of walking / stairs" },
];
const PACES = [
  ["slow", "Slow & easy"],
  ["normal", "Balanced"],
  ["fast", "See as much as possible"],
] as const;
const MUST: Category[] = [
  "Landmarks",
  "Restaurants",
  "Cafés",
  "Parks & Nature",
  "Shopping",
  "Art & Culture",
  "Nightlife",
  "Things to Do",
];

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
        active
          ? "border-gold bg-gold/10 text-foreground"
          : "border-border/70 text-muted-foreground hover:border-gold/40"
      }`}
    >
      {children}
    </button>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold">
        {title}
        {hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span>}
      </h4>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function toggle<T>(list: T[] | undefined, v: T, max = 99): T[] {
  const cur = list ?? [];
  if (cur.includes(v)) return cur.filter((x) => x !== v);
  return cur.length >= max ? cur : [...cur, v];
}

/** Optional fine-tuning for the last step of /plan. Collapsed by default so the wizard stays short. */
export function PlannerExtraQuestions({
  value,
  onChange,
}: {
  value: Extra;
  onChange: (patch: Partial<Extra>) => void;
}) {
  const [open, setOpen] = useState(false);
  const chosen =
    (value.extraMoods?.length ?? 0) +
    (value.foodPreferences?.length ?? 0) +
    (value.avoid?.length ?? 0) +
    (value.mustInclude ? 1 : 0) +
    (value.pace && value.pace !== "normal" ? 1 : 0);

  return (
    <div className="mt-6 rounded-xl border border-border/70">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold">Make it more personal</span>
          <span className="block text-xs text-muted-foreground">
            Optional{chosen > 0 ? ` · ${chosen} selected` : " · pace, food, things to avoid"}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gold transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-border/60 px-4 py-4">
          <Group title="Any other vibe?" hint="up to 2">
            {MOODS.filter((m) => m !== value.mood).map((m) => (
              <Chip
                key={m}
                active={!!value.extraMoods?.includes(m)}
                onClick={() => onChange({ extraMoods: toggle(value.extraMoods, m, 2) })}
              >
                {m}
              </Chip>
            ))}
          </Group>

          <Group title="Your pace">
            {PACES.map(([id, label]) => (
              <Chip key={id} active={(value.pace ?? "normal") === id} onClick={() => onChange({ pace: id })}>
                {label}
              </Chip>
            ))}
          </Group>

          <Group title="What do you feel like eating?">
            {FOODS.map((f) => (
              <Chip
                key={f}
                active={!!value.foodPreferences?.includes(f)}
                onClick={() => onChange({ foodPreferences: toggle(value.foodPreferences, f) })}
              >
                {f}
              </Chip>
            ))}
          </Group>

          <Group title="Anything to avoid?">
            {AVOIDS.map((a) => (
              <Chip
                key={a.id}
                active={!!value.avoid?.includes(a.id)}
                onClick={() => onChange({ avoid: toggle(value.avoid, a.id) })}
              >
                {a.label}
              </Chip>
            ))}
          </Group>

          <Group title="One place you must not miss?">
            {MUST.map((c) => (
              <Chip
                key={c}
                active={value.mustInclude === c}
                onClick={() => onChange({ mustInclude: value.mustInclude === c ? null : c })}
              >
                {c}
              </Chip>
            ))}
          </Group>
        </div>
      )}
    </div>
  );
}
