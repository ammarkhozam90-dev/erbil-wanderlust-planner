import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  STYLES, INTERESTS, DIETARY, COMPANIONS, PACE, BUDGET,
} from "@/lib/preference-options";

interface OnboardingWizardProps {
  open: boolean;
  onDone: () => void;
}

const TOTAL_STEPS = 5;

export function OnboardingWizard({ open, onDone }: OnboardingWizardProps) {
  const { updateProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [styles, setStyles] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [companion, setCompanion] = useState<string | null>(null);
  const [pace, setPace] = useState<string | null>(null);
  const [dietary, setDietary] = useState<string[]>([]);
  const [budget, setBudget] = useState<string | null>(null);

  function toggle(list: string[], set: (v: string[]) => void, item: string) {
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  async function persistAndAdvance() {
    setSaving(true);
    await updateProfile({
      travel_styles: styles,
      interests,
      travel_companion: companion,
      travel_style_prefs: pace ? { pace } : undefined,
      dietary_preferences: dietary,
      budget_preference: budget,
    } as any);
    setSaving(false);
    if (step < TOTAL_STEPS) setStep(step + 1);
    else finish();
  }

  async function skipAll() {
    setSaving(true);
    await updateProfile({ onboarding_completed: true } as any);
    setSaving(false);
    onDone();
  }

  async function finish() {
    setSaving(true);
    await updateProfile({ onboarding_completed: true } as any);
    setSaving(false);
    setStep(TOTAL_STEPS); // celebration screen
  }

  function goPlan() {
    onDone();
    navigate({ to: "/" });
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md gap-0 p-0">
        {/* Progress + skip-all — always visible, always escapable */}
        {step < TOTAL_STEPS && (
          <div className="flex items-center gap-3 px-6 pt-6">
            <div className="flex flex-1 gap-1.5">
              {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
                <div key={i} className={cn("h-1 flex-1 rounded-full", i < step ? "bg-gold" : "bg-border")} />
              ))}
            </div>
            <button onClick={skipAll} className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Skip all
            </button>
          </div>
        )}

        <div className="px-6 py-8">
          {step === 1 && (
            <StepChips
              title="What's your travel vibe?"
              subtitle="Pick a few — no wrong answers."
              options={STYLES}
              selected={styles}
              onToggle={(v) => toggle(styles, setStyles, v)}
            />
          )}

          {step === 2 && (
            <StepChips
              title="What do you love doing here?"
              subtitle="Tap everything that sounds fun."
              options={INTERESTS}
              selected={interests}
              onToggle={(v) => toggle(interests, setInterests, v)}
            />
          )}

          {step === 3 && (
            <div className="space-y-8">
              <StepSingleChips
                title="Who do you usually explore with?"
                options={COMPANIONS}
                selected={companion}
                onSelect={setCompanion}
              />
              <StepSingleChips
                title="What's your pace?"
                options={PACE}
                selected={pace}
                onSelect={setPace}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8">
              <StepChips
                title="Any dietary needs?"
                options={DIETARY}
                selected={dietary}
                onToggle={(v) => toggle(dietary, setDietary, v)}
              />
              <StepSingleChips
                title="Your typical budget?"
                options={BUDGET}
                selected={budget}
                onSelect={setBudget}
              />
            </div>
          )}

          {step === TOTAL_STEPS && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-gold/10 text-gold">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">You're all set!</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We'll use this to put together your first perfect day in Erbil.
                </p>
              </div>
              <Button onClick={goPlan} className="mt-2 w-full bg-gold text-background hover:bg-gold/90">
                <Sparkles className="mr-2 h-4 w-4" /> Generate my first plan
              </Button>
              <button onClick={onDone} className="text-xs text-muted-foreground hover:text-foreground">
                Maybe later
              </button>
            </div>
          )}
        </div>

        {step < TOTAL_STEPS && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className={cn("text-xs font-medium text-muted-foreground hover:text-foreground", step === 1 && "invisible")}
            >
              Back
            </button>
            <Button size="sm" onClick={persistAndAdvance} disabled={saving} className="bg-gold text-background hover:bg-gold/90">
              {saving ? "…" : step === TOTAL_STEPS - 1 ? "Finish" : "Continue"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ============================== SHARED STEP UI ============================== */

function StepChips({
  title, subtitle, options, selected, onToggle,
}: {
  title: string; subtitle?: string; options: readonly string[]; selected: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button key={o} type="button" onClick={() => onToggle(o)}>
              <Badge
                variant={active ? "default" : "outline"}
                className={cn("cursor-pointer px-3 py-1.5 text-sm", active && "bg-gold text-background hover:bg-gold/90")}
              >
                {o}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepSingleChips({
  title, options, selected, onSelect,
}: {
  title: string; options: readonly string[]; selected: string | null; onSelect: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected === o;
          return (
            <button key={o} type="button" onClick={() => onSelect(o)}>
              <Badge
                variant={active ? "default" : "outline"}
                className={cn("cursor-pointer px-3 py-1.5 text-sm", active && "bg-gold text-background hover:bg-gold/90")}
              >
                {o}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
