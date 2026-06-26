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
];

const INTERESTS = [
  "Food & Cafes", "Historical Sites", "Museums", "Nature", "Shopping",
  "Nightlife", "Family Activities", "Arts & Culture", "Photography",
  "Sports", "Remote Work Friendly Places",
];

const COMPANIONS = ["Solo", "Couple", "Friends", "Family"];
const MOBILITY = ["High", "Moderate", "Low / Accessibility"];
const BUDGET = ["Budget", "Mid-range", "Premium", "Luxury"];
const DIETARY = ["Halal", "Vegetarian", "Vegan", "Gluten-free", "No restrictions"];
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
  const { session, profile, loading, isAdmin, isMerchant, updateProfile, toggleFavorite, changePassword, signOut } = useAuth();
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

  if (!session && !loading) {
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

  if (loading || !profile || !session) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted-foreground">
          Loading your profile…
        </div>
      </div>
    );
  }

  const displayName = profile.full_name?.trim() || session.user.email || "You";
  const email = session.user.email ?? "";
  const initial = (displayName[0] ?? "U").toUpperCase();
  const favorites = profile.favorites ?? [];
  const savedLocations = LOCATIONS.filter((l) => favorites.includes(l.id));
  const created = new Date(profile.created_at);

  const completionPct = useMemo(() => {
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
      toast.success("Password updated successfully");
      setShowPwd(false);
      setPwdForm({ current: "", new: "", confirm: "" });
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
              {completionPct < 100 && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Complete your profile below for more personalized recommendations.
                </p>
              )}
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"].map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Current City" icon={<MapPin className="h-4 w-4" />}>
                <Input value={form.currentCity} onChange={(e) => setForm({ ...form, currentCity: e.target.value })} />
              </Field>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={saveAccount} className="bg-gold text-background hover:bg-gold/90">
                Save changes
              </Button>
            </div>
          </section>

          {/* Security & Settings */}
          <div className="space-y-8">
            <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-luxury">
              <h2 className="mb-5 flex items-center gap-2 font-display text-2xl font-bold">
                <Lock className="h-5 w-5 text-gold" /> Security
              </h2>
              <div className="space-y-4">
                <Dialog open={showPwd} onOpenChange={setShowPwd}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full border-gold/40 text-gold hover:bg-gold/10 hover:text-gold">
                      <KeyRound className="mr-2 h-4 w-4" /> Change password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Update Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and a new strong password.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onUpdatePassword} className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Current Password</Label>
                        <PasswordInput
                          value={pwdForm.current}
                          onChange={(v) => setPwdForm({ ...pwdForm, current: v })}
                          show={pwdShow1}
                          setShow={setPwdShow1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>New Password</Label>
                        <PasswordInput
                          value={pwdForm.new}
                          onChange={(v) => setPwdForm({ ...pwdForm, new: v })}
                          show={pwdShow2}
                          setShow={setPwdShow2}
                        />
                        <ul className="mt-2 grid gap-1 text-[11px]">
                          {PASSWORD_RULES.map((r) => {
                            const ok = r.test(pwdForm.new);
                            return (
                              <li key={r.id} className={`flex items-center gap-1.5 ${ok ? "text-emerald-500" : "text-muted-foreground"}`}>
                                {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                {r.label}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <PasswordInput
                          value={pwdForm.confirm}
                          onChange={(v) => setPwdForm({ ...pwdForm, confirm: v })}
                          show={pwdShow3}
                          setShow={setPwdShow3}
                        />
                        {pwdForm.confirm.length > 0 && (
                          <p className={`mt-1 text-[11px] ${pwdMatch ? "text-emerald-500" : "text-destructive"}`}>
                            {pwdMatch ? "Passwords match" : "Passwords do not match"}
                          </p>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={!pwdValid.ok || !pwdMatch || pwdBusy} className="w-full bg-gold text-background">
                          {pwdBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Update Password
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" className="w-full border-border text-muted-foreground hover:bg-accent" onClick={() => toast.info("Email update coming soon")}>
                  <Mail className="mr-2 h-4 w-4" /> Change email
                </Button>

                <Button variant="outline" className="w-full border-border text-muted-foreground hover:bg-accent" onClick={() => toast.info("Active sessions management coming soon")}>
                  <Monitor className="mr-2 h-4 w-4" /> Active sessions
                </Button>

                <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => toast.error("Account deletion requires admin approval")}>
                  <UserMinus className="mr-2 h-4 w-4" /> Delete account
                </Button>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-luxury">
              <h2 className="mb-5 flex items-center gap-2 font-display text-2xl font-bold">
                <Palette className="h-5 w-5 text-gold" /> Preferences
              </h2>
              <div className="space-y-6">
                <Field label="Language" icon={<Languages className="h-4 w-4" />}>
                  <Select value={form.preferredLang} onValueChange={(v) => { setForm({ ...form, preferredLang: v }); saveAccount(); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Arabic">Arabic</SelectItem>
                      <SelectItem value="Kurdish">Kurdish</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Currency" icon={<CreditCard className="h-4 w-4" />}>
                  <div className="flex rounded-lg border border-border bg-background p-1">
                    {(["USD", "IQD"] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => { setFilter("currency", c); toast.success(`Currency set to ${c}`); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                          currency === c ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-gold" />
                    <span className="text-sm font-medium">Notifications</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase tracking-wider" onClick={() => toast.info("Coming soon")}>Manage</Button>
                </div>
              </div>
            </section>
          </div>

          {/* Travel Preferences */}
          <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-luxury lg:col-span-3">
            <h2 className="mb-1 font-display text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-gold" /> Travel Preferences
            </h2>
            <p className="mb-8 text-sm text-muted-foreground">
              Personalize your Erbil experience. These preferences guide our AI in building your perfect day.
            </p>

            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-6">
                <StylePref
                  label="Budget Level"
                  options={BUDGET}
                  value={profile.budget_preference ?? ""}
                  onChange={(v) => setSingleField("budget_preference", v)}
                />
                <StylePref
                  label="Mobility Level"
                  options={MOBILITY}
                  value={profile.mobility_level ?? ""}
                  onChange={(v) => setSingleField("mobility_level", v)}
                />
                <StylePref
                  label="Typical Companion"
                  options={COMPANIONS}
                  value={profile.travel_companion ?? ""}
                  onChange={(v) => setSingleField("travel_companion", v)}
                />
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Travel Styles</p>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map((s) => {
                      const active = profile.travel_styles?.includes(s);
                      return (
                        <button
                          key={s}
                          onClick={() => toggleStyle(s)}
                          className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                            active ? "border-gold bg-gold text-background" : "border-border bg-background text-muted-foreground hover:border-gold/40"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map((i) => {
                      const active = profile.interests?.includes(i);
                      return (
                        <button
                          key={i}
                          onClick={() => toggleArrayField("interests", i)}
                          className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all ${
                            active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {i}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dietary Preferences</p>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY.map((d) => {
                      const active = profile.dietary_preferences?.includes(d);
                      return (
                        <button
                          key={d}
                          onClick={() => toggleArrayField("dietary_preferences", d)}
                          className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all ${
                            active ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border bg-background text-muted-foreground hover:border-emerald-500/40"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4">
                  <StylePref label="Pace" options={PACE} value={stylePrefs.pace ?? ""} onChange={(v) => setStylePref("pace", v)} />
                  <StylePref label="Speed" options={SPEED} value={stylePrefs.speed ?? ""} onChange={(v) => setStylePref("speed", v)} />
                  <StylePref label="Environment" options={ENV} value={stylePrefs.env ?? ""} onChange={(v) => setStylePref("env", v)} />
                </div>
              </div>
            </div>
          </section>

          {/* Favorites */}
          <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-luxury lg:col-span-3">
            <h2 className="mb-6 flex items-center gap-2 font-display text-2xl font-bold">
              <Heart className="h-6 w-6 text-destructive" /> Saved Hubs
            </h2>
            {savedLocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-muted">
                  <Heart className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">You haven't saved any hubs yet.</p>
                <Link to="/" className="mt-4 text-xs font-semibold uppercase tracking-wider text-gold hover:underline">
                  Explore hubs →
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {savedLocations.map((l) => (
                  <article key={l.id} className="group overflow-hidden rounded-2xl border border-border bg-background transition-all hover:shadow-lg">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={l.image}
                        alt={l.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <button
                        onClick={() => toggleFavorite(l.id)}
                        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-destructive backdrop-blur transition-colors hover:bg-background"
                        aria-label="Remove from saved"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gold">{l.category}</p>
                      <h3 className="mt-1 font-display text-lg font-semibold">{l.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {l.area}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="text-gold">{icon}</span>
        {label}
      </Label>
      {children}
    </div>
  );
}

function StylePref({
  label, options, value, onChange,
}: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              key={o}
              onClick={() => onChange(active ? "" : o)}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                active ? "border-gold bg-gold/10 text-gold" : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PasswordInput({
  value, onChange, show, setShow, autoComplete, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (b: boolean) => void;
  autoComplete?: string;
  disabled?: boolean;
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
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
        disabled={disabled}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
