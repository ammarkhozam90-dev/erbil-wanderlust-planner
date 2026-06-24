import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera, User, Mail, Phone, Globe, DollarSign, Coins, Lock,
  Calendar, BarChart3, Heart, MapPin, Trash2, Sparkles, ShieldCheck,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { useAuth, type TravelStyle } from "@/lib/auth";
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
      { property: "og:url", content: "https://erbil-wanderlust-planner.lovable.app/profile" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://erbil-wanderlust-planner.lovable.app/profile" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { session, profile, loading, isAdmin, isMerchant, updateProfile, toggleFavorite } = useAuth();
  const navigate = useNavigate();
  const currency = useStore((s) => s.currency);
  const setFilter = useStore((s) => s.setFilter);

  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    preferredLang: "English",
  });

  // Hydrate form from DB profile whenever it loads/updates
  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        preferredLang: profile.preferred_lang ?? "English",
      });
    }
  }, [profile?.full_name, profile?.phone, profile?.preferred_lang]);

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
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Member</p>
            <h1 className="mt-1 font-display text-4xl font-bold lg:text-5xl">{displayName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Account info */}
          <section id="settings" className="rounded-3xl border border-border bg-card/60 p-6 shadow-luxury lg:col-span-2">
            <h2 className="mb-5 flex items-center gap-2 font-display text-2xl font-bold">
              <User className="h-5 w-5 text-gold" /> Account Information
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
              <Field label="Preferred Interface Language" icon={<Globe className="h-4 w-4" />}>
                <Select
                  value={form.preferredLang}
                  onValueChange={(v) => setForm({ ...form, preferredLang: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Arabic">Arabic</SelectItem>
                    <SelectItem value="Kurdish">Kurdish</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={saveAccount} className="bg-gold text-background hover:bg-gold/90">
                Save changes
              </Button>
            </div>
          </section>

          {/* Security stats */}
          <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-luxury">
            <h2 className="mb-5 flex items-center gap-2 font-display text-2xl font-bold">
              <Lock className="h-5 w-5 text-gold" /> Security
            </h2>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-gold" />
                <div>
                  <p className="font-medium">Account created</p>
                  <p className="text-muted-foreground">{created.toLocaleDateString()}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <BarChart3 className="mt-0.5 h-4 w-4 text-gold" />
                <div>
                  <p className="font-medium">Itineraries generated</p>
                  <p className="text-muted-foreground">{profile.itineraries_generated}</p>
                </div>
              </li>
              <li>
                <Button
                  variant="outline"
                  className="w-full border-gold/40 text-gold hover:bg-gold/10 hover:text-gold"
                  onClick={() => toast.info("Password reset is coming soon")}
                >
                  <Lock className="mr-2 h-4 w-4" /> Change password
                </Button>
              </li>
            </ul>
          </section>

          {/* Preferences */}
          <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-luxury lg:col-span-3">
            <h2 className="mb-1 font-display text-2xl font-bold">App & Travel Preferences</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              These settings adjust currency display and AI planning across the entire app.
            </p>

            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-semibold">Default Currency</p>
                <div className="inline-flex rounded-full border border-border bg-background p-1">
                  {(["USD", "IQD"] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => { setFilter("currency", c); toast.success(`Currency set to ${c}`); }}
                      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                        currency === c ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c === "USD" ? <DollarSign className="h-3.5 w-3.5" /> : <Coins className="h-3.5 w-3.5" />}
                      {c}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">IQD uses parallel market rate.</p>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold">Travel Style</p>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((s) => {
                    const active = (profile.travel_styles ?? []).includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleStyle(s)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-gold bg-gold/10 text-gold"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Saved hub */}
          <section id="history" className="rounded-3xl border border-border bg-card/60 p-6 shadow-luxury lg:col-span-3">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                  <Heart className="h-5 w-5 text-gold" /> Saved Hub
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your bookmarked spots across Erbil.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{savedLocations.length} saved</span>
            </div>

            {savedLocations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/40 p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No saved places yet. Tap the heart on any location to add it here.
                </p>
                <Link
                  to="/"
                  className="mt-4 inline-block text-xs font-semibold uppercase tracking-wider text-gold hover:underline"
                >
                  Browse Erbil →
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {savedLocations.map((l) => (
                  <article
                    key={l.id}
                    className="group overflow-hidden rounded-2xl border border-border bg-background shadow-luxury"
                  >
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
