import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera, User, Mail, Phone, Globe, DollarSign, Coins, Lock,
  Calendar, BarChart3, Heart, MapPin, Trash2, Sparkles, ShieldCheck,
  Eye, EyeOff, Check, X, Loader2, KeyRound, Languages, Palette, Bell, CreditCard, UserMinus, Monitor, AlertCircle
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { useAuth, type TravelStyle, PASSWORD_RULES, validatePassword } from "@/lib/auth";
import { LOCATIONS } from "@/data/locations";
import { toast } from "sonner";

const STYLES: TravelStyle[] = [
  "Foodie", "Remote Work Focus", "Family Friendly", "Nightlife", "Cultural/Historical",
  "Adventure & Outdoors", "Budget Traveler", "Luxury", "Solo Explorer", "Photography",
];

const INTERESTS = [
  "Food & Cafes", "Historical Sites", "Museums", "Nature", "Shopping",
  "Nightlife", "Family Activities", "Arts & Culture", "Photography",
  "Sports", "Remote Work Friendly Places",
  "Coffee & Tea Culture", "Live Music & Events", "Hiking", "Spa & Wellness",
];

const COMPANIONS = ["Solo", "Couple", "Friends", "Family"];
const MOBILITY = ["High", "Moderate", "Low / Accessibility"];
const BUDGET = ["Budget", "Mid-range", "Premium", "Luxury"];
const DIETARY = ["Halal", "Vegetarian", "Vegan", "Pescatarian", "Gluten-free", "Dairy-free", "No restrictions"];
const PACE = ["Early Bird", "Flexible", "Night Owl"];
const SPEED = ["Fast Explorer", "Relaxed Explorer"];
const ENV = ["Indoor", "Outdoor", "Mixed"];

const ONBOARDING_FIELDS: Array<keyof import("@/lib/auth").Profile> = [
  "phone", "age_range", "gender", "nationality",
  "current_city", "travel_companion", "mobility_level", "budget_preference",
];

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — ErbilGo" },
      { name: "description", content: "Manage your ErbilGo profile, travel preferences, currency settings, and saved Erbil destinations." },
      { property: "og:title", content: "My Profile — ErbilGo" },
      { property: "og:description", content: "Personalize your ErbilGo experience: avatar, language, currency, travel styles and saved hubs." },
      { property: "og:url", content: "https://erbilgo.app/profile" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://erbilgo.app/profile" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { session, profile, loading, isAdmin, isMerchant, updateProfile, toggleFavorite, changePassword, signOut, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const currency = useStore((s) => s.currency);
  const setFilter = useStore((s) => s.setFilter);

  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    nationality: "",
    ageRange: "",
    gender: "",
    currentCity: "",
    preferredLang: "English",
  });

  // Change Password State
  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", new: "", confirm: "" });
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdShow1, setPwdShow1] = useState(false);
  const [pwdShow2, setPwdShow2] = useState(false);
  const [pwdShow3, setPwdShow3] = useState(false);

  // Delete Account State
  const [showDelete, setShowDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Hydrate form from DB profile whenever it loads/updates
  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        nationality: profile.nationality ?? "",
        ageRange: profile.age_range ?? "",
        gender: profile.gender ?? "",
        currentCity: profile.current_city ?? "",
        preferredLang: profile.preferred_lang ?? "English",
      });
    }
  }, [profile]);

  // IMPORTANT: this hook must run on every render, in the same order, no
  // matter what — so it lives BEFORE the conditional early returns below.
  // It used to be declared after them, which violates React's Rules of
  // Hooks and crashed the page (caught by the root ErrorComponent) during
  // the loading -> session-no-profile -> profile-ready transition right
  // after signup.
  const completionPct = useMemo(() => {
    if (!profile) return 0;
    const checks: boolean[] = [
      !!profile.full_name?.trim(),
      !!profile.phone?.trim(),
      ...ONBOARDING_FIELDS.map((k) => {
        const v = profile[k] as unknown;
        return Array.isArray(v) ? v.length > 0 : !!v;
      }),
      (profile.interests?.length ?? 0) > 0,
      (profile.travel_styles?.length ?? 0) > 0,
      (profile.dietary_preferences?.length ?? 0) > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  // 1. If we are loading, show a spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-4 py-24 text-center flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
          <p className="text-sm text-muted-foreground">Loading your profile…</p>
        </div>
      </div>
    );
  }

  // 2. If loading is done but no session, redirect to auth
  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-4xl font-bold">Sign in to view your profile</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Access saved spots, travel preferences, and currency settings — synced across all your devices.
          </p>
          <Button
            onClick={() => navigate({ to: "/auth" })}
            className="mt-6 bg-gold text-background hover:bg-gold/90"
          >
            Sign In / Sign Up
          </Button>
        </div>
      </div>
    );
  }

  // 3. If session exists but no profile, handle onboarding/missing row
  if (!profile) {
    console.warn("[profile] session exists but no profile row found in public.profiles");
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-gold/10 p-4">
              <Sparkles className="h-10 w-10 text-gold" />
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold">Welcome to ErbilGo!</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We're setting up your experience. If this persists, please try signing out and back in.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button
              onClick={() => navigate({ to: "/auth" })}
              className="bg-gold text-background hover:bg-gold/90"
            >
              Go to Onboarding
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              className="text-muted-foreground"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile.full_name?.trim() || session.user.email || "You";
  const email = session.user.email ?? "";
  const initial = (displayName[0] ?? "U").toUpperCase();
  const favorites = profile.favorites ?? [];
  const savedLocations = LOCATIONS.filter((l) => favorites.includes(l.id));

  async function toggleArrayField(field: "interests" | "dietary_preferences", value: string) {
    const list = (profile![field] as string[]) ?? [];
    const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
    await updateProfile({ [field]: next } as Partial<import("@/lib/auth").Profile>);
  }

  async function setSingleField(field: keyof import("@/lib/auth").Profile, value: string) {
    await updateProfile({ [field]: value } as Partial<import("@/lib/auth").Profile>);
  }

  async function setStylePref(key: string, value: string) {
    const currentPrefs = (profile!.travel_style_prefs as Record<string, string>) || {};
    const nextPrefs = { ...currentPrefs, [key]: value };
    await updateProfile({ travel_style_prefs: nextPrefs });
  }

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const res = await updateProfile({ avatar_url: reader.result as string });
      if (res.error) toast.error(res.error);
      else toast.success("Profile photo updated");
    };
    reader.readAsDataURL(f);
  }

  async function saveAccount() {
    const res = await updateProfile({
      full_name: form.name,
      phone: form.phone,
      nationality: form.nationality,
      age_range: form.ageRange,
      gender: form.gender,
      current_city: form.currentCity,
      preferred_lang: form.preferredLang,
    });
    if (res.error) toast.error(res.error);
    else toast.success("Account information saved");
  }

  async function toggleStyle(s: TravelStyle) {
    const list = profile!.travel_styles ?? [];
    const has = list.includes(s);
    const next = has ? list.filter((x) => x !== s) : [...list, s];
    const res = await updateProfile({ travel_styles: next });
    if (res.error) toast.error(res.error);
  }

  const pwdValid = validatePassword(pwdForm.new);
  const pwdMatch = pwdForm.new.length > 0 && pwdForm.new === pwdForm.confirm;

  async function onUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwdValid.ok || !pwdMatch) return;
    setPwdBusy(true);
    const res = await changePassword(pwdForm.current, pwdForm.new);
    setPwdBusy(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Password updated successfully. Signing out...");
      setShowPwd(false);
      setPwdForm({ current: "", new: "", confirm: "" });
      setTimeout(() => {
        navigate({ to: "/auth" });
      }, 1500);
    }
  }

  async function onDeleteAccount() {
    setDeleteBusy(true);
    const res = await deleteAccount();
    setDeleteBusy(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Account deleted successfully");
      setShowDelete(false);
      navigate({ to: "/" });
    }
  }

  const stylePrefs = (profile.travel_style_prefs as Record<string, string>) || {};

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8 lg:py-14">
        {/* Hero */}
        <section className="mb-10 flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
          <div className="group relative">
            <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-gold/60 bg-gradient-to-br from-gold/20 to-primary/10 shadow-luxury">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center font-display text-5xl font-bold text-gold">
                  {initial}
                </span>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 grid place-items-center bg-background/70 opacity-0 transition-opacity hover:opacity-100"
                aria-label="Upload new photo"
              >
                <span className="flex flex-col items-center gap-1 text-gold">
                  <Camera className="h-6 w-6" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Upload</span>
                </span>
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Member</p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
                  <ShieldCheck className="h-3 w-3" /> Admin
                </span>
              )}
              {isMerchant && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Merchant
                </span>
              )}
            </div>
            <h1 className="mt-1 font-display text-4xl font-bold lg:text-5xl">{displayName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>

            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Profile completion</span>
                <span className="text-gold">{completionPct}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full bg-gradient-to-r from-gold/80 to-gold transition-all" style={{ width: `${completionPct}%` }} />
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Account info */}
          <section id="settings" className="rounded-3xl border border-border bg-card/60 p-6 shadow-luxury lg:col-span-2">
            <h2 className="mb-5 flex items-center gap-2 font-display text-2xl font-bold">
              <User className="h-5 w-5 text-gold" /> Personal Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full Name" icon={<User className="h-4 w-4" />}>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                <Input type="email" value={email} disabled readOnly />
              </Field>
              <Field label="Phone Number" icon={<Phone className="h-4 w-4" />}>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Nationality" icon={<Globe className="h-4 w-4" />}>
                <Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
              </Field>
              <Field label="Age Range" icon={<Calendar className="h-4 w-4" />}>
                <Select value={form.ageRange} onValueChange={(v) => setForm({ ...form, ageRange: v })}>
                  <SelectTrigger><SelectValue placeholder="Select age range" /></SelectTrigger>
                  <SelectContent>
                    {["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"].map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Gender" icon={<User className="h-4 w-4" />}>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Female", "Male", "Non-binary", "Prefer not to say"].map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Current City" icon={<MapPin className="h-4 w-4" />}>
                <Input value={form.currentCity} onChange={(e) => setForm({ ...form, currentCity: e.target.value })} />
              </Field>
              <Field label="Preferred Language" icon={<Languages className="h-4 w-4" />}>
                <Select value={form.preferredLang} onValueChange={(v) => setForm({ ...form, preferredLang: v })}>
                  <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                  <SelectContent>
                    {["English", "Kurdish", "Arabic", "Turkish", "Farsi"].map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={saveAccount} className="bg-gold text-background hover:bg-gold/90">
                Save Changes
              </Button>
            </div>
          </section>

          {/* Preferences sidebar */}
          <aside className="space-y-8">
            <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-luxury">
              <h2 className="mb-5 flex items-center gap-2 font-display text-xl font-bold">
                <Languages className="h-5 w-5 text-gold" /> Localization
              </h2>
              <div className="space-y-4">
                <Field label="Currency">
                  <div className="flex flex-wrap gap-2">
                    {["USD", "IQD", "EUR"].map((c) => (
                      <button
                        key={c}
                        onClick={() => useStore.getState().setCurrency(c as any)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                          currency === c ? "border-gold bg-gold/10 text-gold" : "border-border hover:border-gold/40"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="App Language">
                  <Select value={form.preferredLang} onValueChange={(v) => setSingleField("preferred_lang", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["English", "Kurdish", "Arabic", "Turkish", "Farsi"].map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-luxury">
              <h2 className="mb-5 flex items-center gap-2 font-display text-xl font-bold">
                <Sparkles className="h-5 w-5 text-gold" /> Quick Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-background/40 p-3 text-center">
                  <Heart className="mx-auto mb-1 h-5 w-5 text-gold" />
                  <p className="font-display text-xl font-bold">{favorites.length}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Saved</p>
                </div>
                <div className="rounded-2xl border border-border bg-background/40 p-3 text-center">
                  <BarChart3 className="mx-auto mb-1 h-5 w-5 text-gold" />
                  <p className="font-display text-xl font-bold">{profile.itineraries_generated ?? 0}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Plans</p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {/* Preferences Section */}
        <section className="mt-8 rounded-3xl border border-border bg-card/60 p-6 shadow-luxury">
          <h2 className="mb-8 flex items-center gap-2 font-display text-2xl font-bold">
            <Palette className="h-5 w-5 text-gold" /> Travel Style & Interests
          </h2>

          <div className="space-y-10">
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Primary Travel Styles</h3>
              <div className="flex flex-wrap gap-3">
                {STYLES.map((s) => {
                  const active = (profile.travel_styles ?? []).includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleStyle(s)}
                      className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                        active
                          ? "border-gold bg-gold/10 text-gold shadow-luxury"
                          : "border-border bg-background/40 hover:border-gold/40"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((i) => {
                    const active = (profile.interests ?? []).includes(i);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleArrayField("interests", i)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                          active ? "border-gold bg-gold/10 text-gold" : "border-border hover:border-gold/40"
                        }`}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dietary Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {DIETARY.map((d) => {
                    const active = (profile.dietary_preferences ?? []).includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => toggleArrayField("dietary_preferences", d)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                          active ? "border-gold bg-gold/10 text-gold" : "border-border hover:border-gold/40"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-8 border-t border-border pt-10 sm:grid-cols-2 lg:grid-cols-4">
              <PreferenceSelect
                label="Travel Companion"
                value={profile.travel_companion ?? ""}
                options={COMPANIONS}
                onChange={(v) => setSingleField("travel_companion", v)}
              />
              <PreferenceSelect
                label="Mobility Level"
                value={profile.mobility_level ?? ""}
                options={MOBILITY}
                onChange={(v) => setSingleField("mobility_level", v)}
              />
              <PreferenceSelect
                label="Budget Preference"
                value={profile.budget_preference ?? ""}
                options={BUDGET}
                onChange={(v) => setSingleField("budget_preference", v)}
              />
              <PreferenceSelect
                label="Travel Pace"
                value={stylePrefs.pace || ""}
                options={PACE}
                onChange={(v) => setStylePref("pace", v)}
              />
            </div>
          </div>
        </section>

        {/* Saved Hubs */}
        <section id="saved" className="mt-8 rounded-3xl border border-border bg-card/60 p-6 shadow-luxury">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <Heart className="h-5 w-5 text-gold" /> Saved Hubs
            </h2>
            <Link to="/" className="text-xs font-semibold uppercase tracking-wider text-gold hover:underline">
              Explore More →
            </Link>
          </div>

          {savedLocations.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {savedLocations.map((loc) => (
                <div key={loc.id} className="group relative overflow-hidden rounded-2xl border border-border bg-background/40 p-3 transition-all hover:border-gold/40">
                  <div className="aspect-[4/3] overflow-hidden rounded-xl">
                    <img src={loc.image} alt={loc.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  <div className="mt-3">
                    <h4 className="font-display font-bold">{loc.name}</h4>
                    <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">{loc.category} • {loc.area}</p>
                  </div>
                  <button
                    onClick={() => toggleFavorite(loc.id)}
                    className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-gold shadow-luxury backdrop-blur-sm transition-transform hover:scale-110"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Link
                    to="/"
                    search={{ hub: loc.id }}
                    onClick={() => setFilter(loc.id)}
                    className="absolute inset-0 z-0"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-gold/10 text-gold">
                <Heart className="h-6 w-6" />
              </div>
              <p className="text-sm text-muted-foreground">You haven't saved any locations yet.</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to="/">Start Exploring</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </Label>
      {children}
    </div>
  );
}

function PreferenceSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function PwdInput({
  value, onChange, show, setShow, autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (b: boolean) => void;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
