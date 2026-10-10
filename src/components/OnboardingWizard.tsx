import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { searchNationalities } from "@/data/nationalities";
import { PhoneInput, isValidPhone } from "@/components/PhoneInput";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { getMissingFields } from "@/lib/profile-completion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { STYLES, INTERESTS, DIETARY, COMPANIONS, PACE, BUDGET } from "@/lib/preference-options";

interface OnboardingWizardProps {
  open: boolean;
  onDone: () => void;
}

const BASE_STEPS = 5;
const AGE_RANGES = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

export function OnboardingWizard({ open, onDone }: OnboardingWizardProps) {
  const { updateProfile, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Extra "basics" step: only for users who skipped them at signup (e.g. Google sign-in).
  const [missingAtOpen] = useState(() => getMissingFields(profile));
  const needsBasics = missingAtOpen.length > 0;
  const isMissing = (k: string) => missingAtOpen.some((m) => m.key === k);
  const offset = needsBasics ? 1 : 0;
  const TOTAL_STEPS = BASE_STEPS + offset;
  const cur = step - offset; // 1..5 = the original steps; 0 = basics step

  const [phone, setPhone] = useState((profile as any)?.phone ?? "");
  const [ageRange, setAgeRange] = useState<string>((profile as any)?.age_range ?? "");
  const [gender, setGender] = useState<string>((profile as any)?.gender ?? "");
  const [nationality, setNationality] = useState<string>((profile as any)?.nationality ?? "");
  const [natFocused, setNatFocused] = useState(false);
  const natSuggestions = searchNationalities(nationality, 8);
  const basicsValid =
    isValidPhone(phone) && !!ageRange && !!gender && nationality.trim().length >= 2;

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
    if (cur === 0) {
      const { error } = await updateProfile({
        phone: phone.trim(),
        age_range: ageRange,
        gender,
        nationality: nationality.trim(),
      } as any);
      setSaving(false);
      if (error) {
        toast.error("We couldn't save your details. Please try again.");
        return;
      }
      setStep(step + 1);
      return;
    }
    await updateProfile({
      travel_styles: styles,
      interests,
      travel_companion: companion,
      travel_style_prefs: pace ? { pace } : undefined,
      dietary_preferences: dietary,
      budget_preference: budget,
    } as any);
    setSaving(false);
    // Last question step -> mark onboarding complete BEFORE showing the "all set" screen,
    // so /profile does not open the window again.
    if (step >= TOTAL_STEPS - 1) await finish();
    else setStep(step + 1);
  }

  async function skipAll() {
    setSaving(true);
    const { error } = await updateProfile({ onboarding_complete: true } as any);
    if (error) console.error("[onboarding] could not save completion flag", error);
    setSaving(false);
    onDone();
  }

  // X button / Esc / click outside: treat as "Skip all" so it never reappears.
  function handleOpenChange(next: boolean) {
    // The "about you" step is required (same as email sign-up): it cannot be dismissed.
    if (next || saving || cur === 0) return;
    if (step >= TOTAL_STEPS) onDone();
    else skipAll();
  }

  async function finish() {
    setSaving(true);
    await updateProfile({ onboarding_complete: true } as any);
    setSaving(false);
    setStep(TOTAL_STEPS); // celebration screen
  }

  function goPlan() {
    onDone();
    navigate({ to: "/plan" });
  }

  function goProfile() {
    onDone();
    navigate({ to: "/profile" });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn("max-w-md gap-0 p-0", cur === 0 && "[&>button]:hidden")}>
        {/* Progress + skip-all — always visible, always escapable */}
        {step < TOTAL_STEPS && (
          <div className="flex items-center gap-3 px-6 pr-12 pt-6">
            <div className="flex flex-1 gap-1.5">
              {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
                <div
                  key={i}
                  className={cn("h-1 flex-1 rounded-full", i < step ? "bg-gold" : "bg-border")}
                />
              ))}
            </div>
            {cur !== 0 && (
              <button
                onClick={skipAll}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Skip all
              </button>
            )}
          </div>
        )}

        <div className="px-6 py-8">
          {cur === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">Complete your profile</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  A few required details to personalize your plans.
                </p>
              </div>
              <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="font-medium text-foreground">Some required details are missing</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Please complete them so we can give you the best experience in ErbilGo.
                    Missing: <span className="font-semibold text-foreground">{missingAtOpen.map((m) => m.label).join(", ")}</span>.
                  </p>
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone number{isMissing("phone") && <span className="ml-1 text-amber-500">*</span>}</Label>
                <PhoneInput value={phone} onChange={setPhone} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Age range{isMissing("age_range") && <span className="ml-1 text-amber-500">*</span>}</Label>
                <Select value={ageRange} onValueChange={setAgeRange}>
                  <SelectTrigger><SelectValue placeholder="Select age range" /></SelectTrigger>
                  <SelectContent>{AGE_RANGES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gender{isMissing("gender") && <span className="ml-1 text-amber-500">*</span>}</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nationality{isMissing("nationality") && <span className="ml-1 text-amber-500">*</span>}</Label>
                <div className="relative">
                  <Input
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    onFocus={() => setNatFocused(true)}
                    onBlur={() => window.setTimeout(() => setNatFocused(false), 150)}
                    placeholder="Start typing your nationality…"
                    autoComplete="off"
                  />
                  {natFocused && nationality.trim().length > 0 && natSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-48 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl">
                      {natSuggestions.map((option) => (
                        <button
                          key={option.code}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setNationality(option.name); setNatFocused(false); }}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span className="font-medium">{option.name}</span>
                          <span className="ml-3 text-[10px] text-muted-foreground">{option.region}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {cur === 1 && (
            <StepChips
              title="What's your travel vibe?"
              subtitle="Pick a few — no wrong answers."
              options={STYLES}
              selected={styles}
              onToggle={(v) => toggle(styles, setStyles, v)}
            />
          )}

          {cur === 2 && (
            <StepChips
              title="What do you love doing here?"
              subtitle="Tap everything that sounds fun."
              options={INTERESTS}
              selected={interests}
              onToggle={(v) => toggle(interests, setInterests, v)}
            />
          )}

          {cur === 3 && (
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

          {cur === 4 && (
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
              <Button
                onClick={goProfile}
                className="mt-2 w-full bg-gold text-background hover:bg-gold/90"
              >
                Go to my profile
              </Button>
              <button
                onClick={goPlan}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <Sparkles className="mr-1 inline h-3 w-3" /> Generate my first plan
              </button>
            </div>
          )}
        </div>

        {step < TOTAL_STEPS && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className={cn(
                "text-xs font-medium text-muted-foreground hover:text-foreground",
                step === 1 && "invisible",
              )}
            >
              Back
            </button>
            <Button
              size="sm"
              onClick={persistAndAdvance}
              disabled={saving || (cur === 0 && !basicsValid)}
              className="bg-gold text-background hover:bg-gold/90"
            >
              {saving ? "…" : step === TOTAL_STEPS - 1 ? "Generate my plan" : "Continue"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ============================== SHARED STEP UI ============================== */

function StepChips({
  title,
  subtitle,
  options,
  selected,
  onToggle,
}: {
  title: string;
  subtitle?: string;
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
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
                className={cn(
                  "cursor-pointer px-3 py-1.5 text-sm",
                  active && "bg-gold text-background hover:bg-gold/90",
                )}
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
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: readonly string[];
  selected: string | null;
  onSelect: (v: string) => void;
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
                className={cn(
                  "cursor-pointer px-3 py-1.5 text-sm",
                  active && "bg-gold text-background hover:bg-gold/90",
                )}
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
