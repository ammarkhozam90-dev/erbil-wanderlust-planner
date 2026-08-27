import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, MapPin, Search, Sparkles, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStore, type Budget, type Companion, type Mood } from "@/lib/store";
import { cn } from "@/lib/utils";

const moods: Mood[] = ["Relaxed", "Adventurous", "Romantic", "Family", "Productive"];
const companions: Companion[] = ["Solo", "Couple", "Family", "Friends"];
const budgets: Budget[] = ["$", "$$", "$$$"];

export function SmartHeroBar() {
  const navigate = useNavigate();
  const planner = useStore();
  const [term, setTerm] = useState("");
  const [focused, setFocused] = useState(false);

  const suggestions = useQuery({
    queryKey: ["hero-business-search", term.trim().toLowerCase()],
    enabled: term.trim().length >= 1,
    queryFn: async () => {
      const value = term.trim().toLocaleLowerCase();
      const { data, error } = await supabase
        .from("merchants")
        .select("id,name,category,city,phone,address")
        .eq("status", "approved")
        .order("name")
        .limit(100);
      if (error) throw error;
      return (data ?? [])
        .filter((place: any) =>
          [place.name, place.category, place.city, place.phone, place.address]
            .filter(Boolean)
            .some((field) => String(field).toLocaleLowerCase().includes(value)),
        )
        .slice(0, 6);
    },
    staleTime: 1000 * 30,
  });

  function plan() {
    if (term.trim() && suggestions.data?.[0]) {
      navigate({ to: "/business/$id", params: { id: suggestions.data[0].id } });
      return;
    }
    if (term.trim() && suggestions.data?.length === 0)
      toast("No exact match yet — we will build a plan around your preferences instead.");
    navigate({ to: "/plan" });
  }

  return (
    <div className="relative z-20 w-full max-w-5xl rounded-2xl border border-white/15 bg-black/55 p-2 shadow-2xl backdrop-blur-2xl md:rounded-3xl md:p-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 md:px-4 md:py-3">
            <MapPin className="h-5 w-5 shrink-0 text-gold" />
            <input
              value={term}
              onFocus={() => setFocused(true)}
              onChange={(event) => setTerm(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && plan()}
              placeholder="Where shall we take you today?"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/50 md:text-base"
              aria-label="Search Erbil places"
            />
            <Search className="hidden h-4 w-4 text-white/40 sm:block" />
          </div>
          {focused && term.trim().length >= 1 && (
            <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-gold/20 bg-card/95 p-2 shadow-2xl backdrop-blur-xl">
              {suggestions.isLoading ? (
                <p className="px-3 py-3 text-xs text-muted-foreground">Finding places…</p>
              ) : suggestions.data?.length ? (
                suggestions.data.map((place: any) => (
                  <button
                    key={place.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => navigate({ to: "/business/$id", params: { id: place.id } })}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gold/10"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gold/10 text-gold">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{place.name}</span>
                      <span className="block text-[11px] capitalize text-muted-foreground">
                        {place.category}
                        {place.city ? ` · ${place.city}` : ""}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-3 text-xs text-muted-foreground">
                  No published place matches that search yet.
                </p>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-2 lg:flex lg:border-l lg:border-t-0 lg:pl-2 lg:pt-0">
          <FilterSelect
            icon={<Sparkles className="h-4 w-4 text-emerald-300" />}
            value={planner.mood}
            options={moods}
            onChange={(value) => planner.setFilter("mood", value as Mood)}
            label="Mood"
          />
          <FilterSelect
            icon={<Users className="h-4 w-4 text-emerald-300" />}
            value={planner.companion}
            options={companions}
            onChange={(value) => planner.setFilter("companion", value as Companion)}
            label="With"
          />
          <FilterSelect
            icon={<Wallet className="h-4 w-4 text-emerald-300" />}
            value={planner.budget}
            options={budgets}
            onChange={(value) => planner.setFilter("budget", value as Budget)}
            label="Budget"
          />
        </div>
        <button
          type="button"
          onClick={plan}
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-glow transition hover:brightness-110 active:scale-[.98] md:px-7"
        >
          <Sparkles className="h-4 w-4" /> Plan My Day
        </button>
      </div>
      {focused && (
        <button
          type="button"
          aria-label="Close search suggestions"
          onClick={() => setFocused(false)}
          className="fixed inset-0 -z-10 h-full w-full cursor-default"
        />
      )}
    </div>
  );
}

function FilterSelect({
  icon,
  value,
  options,
  onChange,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <label className="flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs text-white/80 transition hover:bg-white/10">
      <span className="hidden sm:block">{icon}</span>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "min-w-0 appearance-none bg-transparent text-center font-semibold outline-none",
          "text-white [&>option]:bg-card [&>option]:text-foreground",
        )}
      >
        <option disabled value="">
          {label}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="h-3 w-3 shrink-0 text-white/50" />
    </label>
  );
}
